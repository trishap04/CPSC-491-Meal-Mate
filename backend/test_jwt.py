import requests

BASE_URL = "http://127.0.0.1:8000"

def test_jwt_auth():
    print("1. Testing Registration JWT...")
    reg_data = {
        "username": "jwtuser",
        "email": "jwt@test.com",
        "password": "password123"
    }
    # Clean up if exists (optional but good for repeated tests)
    requests.post(f"{BASE_URL}/api/users/register/", json=reg_data) 

    reg_resp = requests.post(f"{BASE_URL}/api/users/register/", json=reg_data)
    print(f"   Status: {reg_resp.status_code}")
    if reg_resp.status_code == 201:
        data = reg_resp.json()
        if 'access' in data and 'refresh' in data:
            print("   SUCCESS: Registration returned JWT tokens.")
        else:
            print("   FAILURE: Registration missing tokens.")
    
    print("\n2. Testing Login JWT...")
    login_data = {
        "identifier": "jwtuser",
        "password": "password123"
    }
    login_resp = requests.post(f"{BASE_URL}/api/users/login/", json=login_data)
    print(f"   Status: {login_resp.status_code}")
    if login_resp.status_code == 200:
        data = login_resp.json()
        if 'access' in data and 'refresh' in data:
            print("   SUCCESS: Login returned JWT tokens.")
            access_token = data['access']
            
            # 3. Test authenticated request
            print("\n3. Testing Authenticated Request...")
            headers = {"Authorization": f"Bearer {access_token}"}
            profile_resp = requests.get(f"{BASE_URL}/api/users/profile/", headers=headers)
            print(f"   Profile Status: {profile_resp.status_code}")
            if profile_resp.status_code == 200:
                print("   SUCCESS: Access token works for protected endpoints.")
            else:
                print(f"   FAILURE: Access token rejected. Status: {profile_resp.status_code}")
        else:
            print("   FAILURE: Login missing tokens.")

if __name__ == "__main__":
    test_jwt_auth()
