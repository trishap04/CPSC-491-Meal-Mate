# Username Availability Checking Feature

## Overview
This feature provides real-time and on-submit username availability checking during account creation. Users get immediate feedback as they type their desired username, preventing frustration when attempting to register with unavailable usernames.

## Implementation Details

### Backend Changes

#### 1. New API Endpoint: `CheckUsernameAvailabilityView`
**Location:** `backend/users/views.py`

**Endpoint:** `POST /api/users/check-username/`

**Purpose:** Validates username availability and format

**Request Parameters:**
```json
{
  "username": "desired_username",
  "exclude_user_id": 123  // Optional: for profile edits to exclude current user
}
```

**Response (Available):**
```json
{
  "available": true,
  "message": "Username is available."
}
```

**Response (Unavailable):**
```json
{
  "available": false,
  "message": "This username is already taken."
}
```

**Validation Rules:**
- Username must be at least 3 characters long
- Username cannot exceed 150 characters
- Username can only contain: letters, numbers, underscores, and hyphens
- Username must be unique (case-insensitive comparison)

**Permissions:** 
- `AllowAny` (No authentication required)

**CSRF Protection:** 
- Enabled via `@method_decorator(csrf_protect)`

#### 2. Updated URL Configuration
**Location:** `backend/users/urls.py`

Added route:
```python
path('check-username/', CheckUsernameAvailabilityView.as_view(), name='check-username'),
```

### Frontend Changes

#### 1. Updated Registration Form
**Location:** `BaseSite/album/register.html`

The form already includes the necessary HTML elements:
```html
<div class="input-group">
  <input type="text" class="form-control" id="registerUsername" name="username"
    placeholder="Choose a username" required />
  <span class="input-group-text" id="usernameAvailability"></span>
</div>
<small class="form-text text-muted" id="usernameMessage"></small>
```

#### 2. Enhanced Registration JavaScript
**Location:** `BaseSite/album/register.js`

**Features Implemented:**

##### Real-Time Validation (On Input)
- **Debounced Check:** 500ms delay after user stops typing to reduce API calls
- **Client-Side Validation:** Checks format before making API request
  - Minimum 3 characters
  - Valid characters only (alphanumeric, underscore, hyphen)
- **Visual Feedback:**
  - ⚠️ Yellow warning icon for format issues
  - ⏳ Hourglass icon while checking
  - ✅ Green checkmark for available usernames
  - ❌ Red X for unavailable usernames
- **Form State Updates:**
  - Adds `is-valid` class when username is available
  - Adds `is-invalid` class when username is unavailable or has issues

##### On-Submit Validation
- **Final Verification:** Before form submission, username availability is checked again
- **Race Condition Prevention:** Ensures username wasn't claimed between real-time check and submission
- **Error Handling:** Clear messaging if username becomes unavailable during submission

### How It Works

#### User Registration Flow:

1. **User types username** (e.g., "john_doe")
   - Input event listener captures keystroke
   - Validation checks run immediately (length, format)
   - Invalid format shows warning

2. **User stops typing** (500ms debounce)
   - Real-time check API call made to `/api/users/check-username/`
   - Loading state displayed ("⏳ Checking...")

3. **Server responds** with availability
   - If available: ✅ Green checkmark, `is-valid` class added
   - If unavailable: ❌ Red X, `is-invalid` class added, reason displayed

4. **User submits form**
   - Pre-submission check validates username one more time
   - Prevents race conditions if username was claimed by another user
   - If check passes, account creation proceeds
   - If check fails, clear error message shown

#### Example User Experience:

```
User types: "ab"
↓
⚠️ Username must be at least 3 characters

User types: "abc"
↓
⏳ Checking...
↓
✅ Username is available

User types: "admin"
↓
⏳ Checking...
↓
❌ This username is already taken
```

## Validation Rules

### Server-Side (Backend)
- Minimum length: 3 characters
- Maximum length: 150 characters
- Allowed characters: `[a-zA-Z0-9_-]`
- Case-insensitive uniqueness check
- Returns specific validation message for each failure type

### Client-Side (Frontend)
- Minimum length: 3 characters (shows warning before API call)
- Valid characters: `[a-z0-9_-]` (lowercase for consistency)
- Format validation before debounced API request to reduce unnecessary calls

## API Performance

### Debouncing
- **Timeout:** 500ms
- **Benefit:** Reduces API calls while user is actively typing
- **Example:** Typing "javascript" makes only 1 API call instead of 10

### Request Handling
- **Method:** POST (includes CSRF protection)
- **Headers:** `Content-Type: application/json`
- **Response Time:** Typically < 100ms

## Future Enhancements

### For Profile Editing (if username changes are enabled)
The backend endpoint supports an optional `exclude_user_id` parameter:

```json
{
  "username": "new_username",
  "exclude_user_id": 123  // Excludes current user from uniqueness check
}
```

This allows users to keep their current username even when validating new usernames.

### Suggested Improvements
1. **Rate Limiting:** Add rate limiting to prevent brute-force checks
2. **Reserved Usernames:** Maintain a list of reserved usernames (admin, root, system, etc.)
3. **Username Suggestions:** When unavailable, suggest similar available usernames
4. **Username History:** Track and optionally allow reclaiming previous usernames

## Testing

### Manual Testing Checklist
- [ ] Check username with < 3 characters (warning displayed)
- [ ] Check valid username (shows available/unavailable correctly)
- [ ] Check username with invalid characters (warning displayed)
- [ ] Rapid typing doesn't cause excessive API calls (debounce works)
- [ ] Form submission with unavailable username fails gracefully
- [ ] Form submission with available username succeeds
- [ ] Empty username field shows no message

### API Testing
```bash
# Check available username
curl -X POST http://localhost:8000/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser"}'

# Check unavailable username
curl -X POST http://localhost:8000/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}'

# Check invalid format
curl -X POST http://localhost:8000/api/users/check-username/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user@name"}'
```

## Error Handling

### Client-Side
- Network errors: "Could not check availability" message
- Invalid format: Shows format requirements
- Unavailable username: Shows reason and invites retry

### Server-Side
- Invalid request: 400 Bad Request
- Missing username: 400 Bad Request with message
- All responses: Consistent JSON format with `available` boolean and `message` string

## Security Considerations

### CSRF Protection
- Endpoint protected with `@csrf_protect` decorator
- Required for form submission to prevent cross-site attacks

### Case Sensitivity
- Server: Case-insensitive uniqueness check (supports Django's case-insensitive lookup)
- Client: Converts to lowercase before sending for consistency

### Rate Limiting
- Currently not implemented but recommended for production
- Consider Django's `django-ratelimit` package

### User Enumeration
- Be cautious: Knowing if a username exists is a minor information leak
- Could use generic response "Username check failed" if privacy is critical
- Current implementation accepts this minor leak as acceptable UX trade-off

## Files Modified

1. **Backend**
   - `backend/users/views.py` - Added `CheckUsernameAvailabilityView`
   - `backend/users/urls.py` - Added URL route

2. **Frontend**
   - `BaseSite/album/register.js` - Enhanced username validation and checking logic

## Integration Notes

### For Developers
- The endpoint is stateless and caches-friendly if needed
- Username check can be reused for password reset, user search, etc.
- Backend validation is independent of frontend (always validate server-side)

### Deployment
- No database migrations required
- No new dependencies added
- Fully backward compatible with existing code
- CSRF protection requires standard Django middleware

## Troubleshooting

### Username check not working
1. Verify API endpoint is accessible: `POST /api/users/check-username/`
2. Check browser console for fetch errors
3. Verify CSRF token is included (Django handles this automatically)
4. Check backend logs for validation errors

### "Checking..." spinner stuck
- Likely a network error or API timeout
- Check browser Network tab for failed requests
- Verify backend is running: `python manage.py runserver`

### Always shows as unavailable
- Check server-side username validation logic
- Verify database connection
- Check for username actually already registered in database
