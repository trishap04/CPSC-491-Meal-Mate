import requests

BASE_URL = "http://127.0.0.1:8000"

def test_data_ownership():
    # 1. Login User A and User B to get JWT tokens
    print("1. Logging in User A (testuser)...")
    login_a = requests.post(
        f"{BASE_URL}/api/users/login/", 
        json={"identifier": "testuser", "password": "password123"}
    ).json()
    token_a = login_a.get('access')
    
    print("2. Logging in User B (batu_the_test_user)...")
    login_b = requests.post(
        f"{BASE_URL}/api/users/login/", 
        json={"identifier": "batu_the_test_user", "password": "password123"}
    ).json()
    token_b = login_b.get('access')

    if not token_a or not token_b:
        print("   FAILURE: Could not obtain JWT tokens.")
        return

    # 3. User A creates a donation
    print("\n3. User A creating a donation...")
    donation_data = {
        "first_name": "User", "last_name": "A", "email": "a@test.com", "phone": "123",
        "pickup_date": "2023-12-01", "pickup_time": "10:00", "door_preference": "meet",
        "items": []
    }
    create_resp = requests.post(
        f"{BASE_URL}/api/users/api/donations/", 
        json=donation_data,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    
    if create_resp.status_code != 201:
        print(f"   FAILURE: Created donation failed. Status: {create_resp.status_code}")
        print(create_resp.text)
        return
        
    donation_id = create_resp.json().get('id')
    print(f"   SUCCESS: Created donation {donation_id}")

    # 4. User B tries to view User A's donation
    print(f"\n4. User B attempting to view Donation {donation_id}...")
    view_resp = requests.get(
        f"{BASE_URL}/api/users/api/donations/{donation_id}/",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    
    if view_resp.status_code == 403:
        print("   SUCCESS: Access denied for User B (Correct)")
    elif view_resp.status_code == 200:
        print("   FAILURE: User B successfully viewed User A's donation!")
    else:
        print(f"   UNEXPECTED: Status {view_resp.status_code}")

    # 5. User A views their own donation
    print(f"\n5. User A viewing their own Donation {donation_id}...")
    view_resp_a = requests.get(
        f"{BASE_URL}/api/users/api/donations/{donation_id}/",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    if view_resp_a.status_code == 200:
        print("   SUCCESS: User A accessed their own data.")
    else:
        print(f"   FAILURE: User A could not access their own data! Status {view_resp_a.status_code}")

if __name__ == "__main__":
    test_data_ownership()
