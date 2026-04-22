import requests

BASE_URL = "http://127.0.0.1:8000"

def test_csrf_flow():
    session = requests.Session()
    
    print("1. Visiting home page to get CSRF token...")
    resp = session.get(f"{BASE_URL}/")
    csrf_token = session.cookies.get('csrftoken')
    
    if csrf_token:
        print(f"   SUCCESS: Got CSRF token: {csrf_token[:10]}...")
    else:
        print("   FAILURE: No CSRF token found in cookies!")
        return

    print("\n2. Attempting login WITH CSRF token...")
    login_data = {"identifier": "testuser", "password": "testpassword"}
    headers = {
        "X-CSRFToken": csrf_token,
        "Referer": f"{BASE_URL}/login.html"
    }
    
    resp = session.post(f"{BASE_URL}/api/users/login/", json=login_data, headers=headers)
    
    # 401 is expected if credentials don't exist, but 403 would mean CSRF failure
    if resp.status_code == 403:
        print("   FAILURE: Server returned 403 Forbidden (CSRF failure)")
    elif resp.status_code == 401:
        print("   SUCCESS: Server returned 401 (CSRF accepted, but auth failed as expected)")
    elif resp.status_code == 200:
        print("   SUCCESS: Login successful!")
    else:
        print(f"   UNEXPECTED: Server returned {resp.status_code}")

    print("\n3. Attempting login WITHOUT CSRF token...")
    resp = requests.post(f"{BASE_URL}/api/users/login/", json=login_data)
    
    if resp.status_code == 403:
        print("   SUCCESS: Server blocked request with 403 Forbidden (Correct)")
    else:
        print(f"   FAILURE: Server allowed request without CSRF! (Status: {resp.status_code})")

if __name__ == "__main__":
    test_csrf_flow()
