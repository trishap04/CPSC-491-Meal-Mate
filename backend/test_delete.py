import requests

BASE_URL = "http://127.0.0.1:8000"

def test_delete_account():
    session = requests.Session()
    
    print("1. Logging in with 'deleteme'...")
    login_data = {"identifier": "deleteme", "password": "password123"}
    resp = session.post(f"{BASE_URL}/api/users/login/", json=login_data)
    
    if resp.status_code != 200:
        print(f"   FAILURE: Login failed with status {resp.status_code}")
        print(resp.json())
        return
    
    # We are on MEAL-99 branch which DOES NOT use JWT yet?
    # Wait, let me check settings.py on this branch.
    data = resp.json()
    access_token = data.get('access')
    
    headers = {}
    if access_token:
        print("   Detected JWT authentication.")
        headers['Authorization'] = f'Bearer {access_token}'
    else:
        print("   Detected Session authentication.")

    print("\n2. Attempting to delete account...")
    # Add CSRF token if needed (this branch has csrf_exempt on Register/Login but NOT necessarily on Delete)
    # Wait, I didn't add csrf_exempt to DeleteAccountView in my edit.
    # So I need the CSRF token.
    session.get(f"{BASE_URL}/") # Ensure we have the cookie
    csrf_token = session.cookies.get('csrftoken')
    if csrf_token:
        headers['X-CSRFToken'] = csrf_token
        headers['Referer'] = f"{BASE_URL}/settings.html"

    resp = session.delete(f"{BASE_URL}/api/users/delete-account/", headers=headers)
    
    if resp.status_code == 204:
        print("   SUCCESS: Account deleted (Status 204).")
    else:
        print(f"   FAILURE: Delete failed with status {resp.status_code}")
        try:
            print(resp.json())
        except:
            print(resp.text[:200])

if __name__ == "__main__":
    test_delete_account()
