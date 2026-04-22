import requests

BASE_URL = "http://127.0.0.1:8000"

def get_csrf_token(session):
    resp = session.get(f"{BASE_URL}/")
    return resp.cookies.get('csrftoken')

def test_data_ownership():
    # 1. Create two sessions
    session_a = requests.Session()
    session_b = requests.Session()

    print("1. Logging in User A...")
    csrf_a = get_csrf_token(session_a)
    login_a = session_a.post(
        f"{BASE_URL}/api/users/login/", 
        json={"identifier": "testuser", "password": "password123"},
        headers={"X-CSRFToken": csrf_a, "Referer": BASE_URL}
    )
    
    print("2. Logging in User B...")
    csrf_b = get_csrf_token(session_b)
    login_b = session_b.post(
        f"{BASE_URL}/api/users/login/", 
        json={"identifier": "testuser2", "password": "password123"},
        headers={"X-CSRFToken": csrf_b, "Referer": BASE_URL}
    )

    if login_a.status_code != 200 or login_b.status_code != 200:
        print("   FAILURE: Could not login test users.")
        return

    # 3. User A creates a donation
    print("\n3. User A creating a donation...")
    csrf_a_post = get_csrf_token(session_a)
    donation_data = {
        "first_name": "User", "last_name": "A", "email": "a@test.com", "phone": "123",
        "pickup_date": "2023-12-01", "pickup_time": "10:00", "door_preference": "meet",
        "items": []
    }
    create_resp = session_a.post(
        f"{BASE_URL}/api/users/api/donations/", # Wait, check the path again
        json=donation_data, 
        headers={"X-CSRFToken": csrf_a_post, "Referer": BASE_URL}
    )
    
    # Path was /api/users/api/donations/ in this branch's urls.py? 
    # I'll check users/urls.py one more time to be sure.
    
    if create_resp.status_code != 201:
        # Retry with the other path just in case
        create_resp = session_a.post(
            f"{BASE_URL}/api/users/donations/", 
            json=donation_data, 
            headers={"X-CSRFToken": csrf_a_post, "Referer": BASE_URL}
        )
        
    if create_resp.status_code != 201:
        print(f"   FAILURE: Created donation failed. Status: {create_resp.status_code}")
        print(create_resp.text)
        return
        
    donation_id = create_resp.json().get('id')
    print(f"   SUCCESS: Created donation {donation_id}")

    # 4. User B tries to view User A's donation
    print(f"\n4. User B attempting to view Donation {donation_id}...")
    view_resp = session_b.get(f"{BASE_URL}/api/users/api/donations/{donation_id}/")
    if view_resp.status_code == 404:
         view_resp = session_b.get(f"{BASE_URL}/api/users/donations/{donation_id}/")

    if view_resp.status_code == 403:
        print("   SUCCESS: Access denied for User B (Correct)")
    elif view_resp.status_code == 200:
        print("   FAILURE: User B successfully viewed User A's donation!")
    else:
        print(f"   UNEXPECTED: Status {view_resp.status_code}")

if __name__ == "__main__":
    test_data_ownership()
