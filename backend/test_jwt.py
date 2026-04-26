import requests

BASE_URL = "http://127.0.0.1:8000"

def test_jwt_auth():
    session = requests.Session()
    # 0. Get CSRF token
    print("0. Fetching CSRF token...")
    session.get(f"{BASE_URL}/register/")
    csrf_token = session.cookies.get('csrftoken')
    if not csrf_token:
        print("   FAILURE: Could not get CSRF token.")
        return
    headers = {'X-CSRFToken': csrf_token, 'Referer': f"{BASE_URL}/register/"}

    print("\n1. Testing Registration JWT...")
    import uuid
    username = f"jwttest_{uuid.uuid4().hex[:8]}"
    reg_data = {
        "username": username,
        "email": f"{username}@test.com",
        "password": "Password123!",
        "first_name": "JWT",
        "last_name": "Tester",
        "role": "donor",
        "terms_accepted": True
    }
    
    reg_resp = session.post(f"{BASE_URL}/api/users/register/", json=reg_data, headers=headers)
    print(f"   Status: {reg_resp.status_code}")
    if reg_resp.status_code == 201:
        data = reg_resp.json()
        print("   SUCCESS: Registration returned JWT tokens.")
    else:
        print(f"   ERROR: {reg_resp.text}")
    
    print("\n2. Testing Login JWT...")
    login_data = {
        "identifier": username,
        "password": "Password123!"
    }
    login_resp = session.post(f"{BASE_URL}/api/users/login/", json=login_data, headers=headers)
    print(f"   Status: {login_resp.status_code}")
    if login_resp.status_code == 200:
        data = login_resp.json()
        print("   SUCCESS: Login returned JWT tokens.")
        access_token = data['access']
        
        # 3. Test authenticated request
        print("\n3. Testing Authenticated Request...")
        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-CSRFToken": csrf_token,
            "Referer": f"{BASE_URL}/"
        }
        profile_resp = session.get(f"{BASE_URL}/api/users/profile/", headers=auth_headers)
        print(f"   Profile Status: {profile_resp.status_code}")
        if profile_resp.status_code == 200:
            print("   SUCCESS: Access token works for protected endpoints.")
        else:
            print(f"   FAILURE: Access token rejected. Status: {profile_resp.status_code}")
    else:
        print(f"   ERROR: {login_resp.text}")

if __name__ == "__main__":
    test_jwt_auth()
