# Account Database Storage & Management System

## Overview

This document describes the secure account information storage system for Meal Mate. The system provides comprehensive account management with proper validation, security measures, audit logging, and data consistency across multiple tables.

## Database Schema

### UserProfile Model

The `UserProfile` model extends Django's `User` model with additional user-specific information while maintaining security best practices.

#### Fields

##### Account Information
- **user** (OneToOneField): Reference to Django User model (cascade delete)
- **first_name** (CharField, max 100): User's first name
- **last_name** (CharField, max 100): User's last name

##### Contact Information
- **phone_number** (CharField, max 20): User's phone number with regex validation
  - Format: `^\+?1?\d{9,15}$` (9-15 digits, optional + and country code)
  - Stored unformatted, validated on input
- **phone_verified** (BooleanField): Whether phone number has been verified
- **address** (TextField, max 255): Street address (optional)
- **city** (CharField, max 100): City (optional)
- **state** (CharField, max 50): State/Province (optional)
- **zip_code** (CharField, max 20): Postal code with format validation
  - Format: `^\d{5}(?:-\d{4})?$` (XXXXX or XXXXX-XXXX)

##### Profile Information
- **bio** (TextField, max 500): User biography/about section
- **profile_picture** (URLField): URL to user's profile picture

##### Account Settings
- **role** (CharField): User's role with choices (donor, recipient, organization)
  - Indexed for efficient filtering
  - Immutable (cannot be changed by user)
- **email_verified** (BooleanField): Email verification status
- **terms_accepted** (BooleanField): Terms and conditions acceptance
- **marketing_emails** (BooleanField): Opt-in for marketing communications

##### Security & Activity
- **last_login** (DateTimeField): Last successful login timestamp
- **failed_login_attempts** (IntegerField): Counter for failed login attempts
- **account_locked** (BooleanField): Whether account is locked
- **account_locked_until** (DateTimeField): When account lock expires

##### Audit Fields
- **created_at** (DateTimeField): Account creation timestamp (indexed)
- **updated_at** (DateTimeField): Last profile update timestamp
- **last_modified_by** (CharField): Who made the last modification ('user', 'system', 'admin')
- **last_modified_reason** (CharField): Reason for last modification

#### Database Indexes
```python
indexes = [
    models.Index(fields=['user', 'created_at']),  # For user history queries
    models.Index(fields=['role', 'email_verified']),  # For role-based queries
]
```

#### Model Methods

##### `lock_account(duration_minutes=30)`
Locks account after failed login attempts with automatic expiration.

##### `unlock_account()`
Manually unlocks account and resets failed login counter.

##### `increment_failed_login()`
Increments failed login counter and locks account if threshold (5 attempts) is reached.

##### `reset_failed_login()`
Resets counter on successful login and updates last login timestamp.

##### `is_account_locked()`
Checks current lock status and automatically unlocks if lockout period has expired.

## API Endpoints

### 1. User Registration
**Endpoint:** `POST /api/users/register/`

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "555-123-4567",
  "bio": "I love donating food",
  "role": "donor",
  "terms_accepted": true
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully!",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Validation Rules:**
- Username: 3-150 chars, alphanumeric + underscore + hyphen, unique (case-insensitive)
- Email: Valid email format, unique (case-insensitive)
- Password: Min 8 chars, must include uppercase, lowercase, and number
- First/Last Name: 2-100 chars
- Phone: 9-15 digits, optional country code
- Role: Must be 'donor', 'recipient', or 'organization'
- Terms: Must be accepted (true)

### 2. Get User Profile
**Endpoint:** `GET /api/users/profile/`

**Authentication:** Required (JWT token)

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "555-123-4567",
  "phone_verified": false,
  "bio": "I love donating food",
  "profile_picture": null,
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip_code": "62701",
  "role": "donor",
  "email_verified": false,
  "marketing_emails": true,
  "created_at": "2024-04-22T10:30:00Z",
  "updated_at": "2024-04-22T10:30:00Z"
}
```

### 3. Update User Profile
**Endpoint:** `PATCH /api/users/profile/update/`

**Authentication:** Required (JWT token)

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone_number": "555-987-6543",
  "bio": "Updated bio",
  "address": "456 Oak Ave",
  "city": "Chicago",
  "state": "IL",
  "zip_code": "60601",
  "profile_picture": "https://example.com/photo.jpg",
  "marketing_emails": true
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully.",
  "profile": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    ...
  }
}
```

**Editable Fields:**
- first_name
- last_name
- phone_number
- bio
- profile_picture
- address
- city
- state
- zip_code
- marketing_emails

**Read-Only Fields:**
- username
- email
- role
- email_verified
- phone_verified
- created_at
- updated_at

**Database Transactions:**
- All updates use `transaction.atomic()` for consistency
- Syncs updates between User and UserProfile models
- Audit fields automatically updated

### 4. Change Password
**Endpoint:** `POST /api/users/change-password/`

**Authentication:** Required (JWT token)

**Request:**
```json
{
  "old_password": "OldPass123!",
  "new_password": "NewPass456!",
  "confirm_password": "NewPass456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Your password has been changed successfully."
}
```

**Validation:**
- Old password must be correct
- New password must be different from old
- New password must include uppercase, lowercase, and number
- Min 8 characters

### 5. Password Reset Request
**Endpoint:** `POST /api/users/password-reset/request/`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account exists for that email, a reset link is ready.",
  "reset_url": "/reset-password.html?uid=MQ==&token=..."
}
```

## Security Measures

### Password Security
1. **Hashing**: Uses Django's `create_user()` which applies PBKDF2 hashing
2. **Strength Requirements**:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
3. **Change Validation**: Old password verified before change allowed

### Account Lockout
1. **Failed Attempts**: 5 failed login attempts triggers lockout
2. **Auto-Unlock**: Default 30-minute lockout period
3. **Counter Reset**: Successful login resets counter

### Data Validation
1. **Input Sanitization**: All inputs trimmed and validated
2. **Format Validation**: Phone, zip, email, URL validation
3. **Length Limits**: All text fields have max length constraints
4. **Regex Patterns**: Pattern matching for format compliance

### CSRF Protection
- All mutating endpoints protected with `@csrf_protect`
- Register, Login, Password Reset, Profile Update all CSRF-protected

### Case Sensitivity
- Username: Case-insensitive storage and lookup
- Email: Converted to lowercase for consistency
- Validation respects case rules (uppercase required in passwords)

### Audit Logging
- `last_modified_by`: Tracks who made changes
- `last_modified_reason`: Documents why changes were made
- Automatic timestamps on all saves

## Database Transactions

### Profile Update Transaction
```python
with transaction.atomic():
    # Update UserProfile
    updated_profile = serializer.save()
    
    # Update User model (first_name, last_name sync)
    user.save()
    
    # Both save atomically or rollback on error
```

**Benefits:**
- Ensures User and UserProfile stay in sync
- Automatic rollback on error
- Row-level locking prevents concurrent conflicts

## Serializer Validation

### RegisterSerializer
Validates all registration data with custom validators:
```python
validate_username(value)      # Unique, format, length
validate_email(value)         # Unique, valid format
validate_password(value)      # Strength requirements
validate_first_name(value)    # Length 2+
validate_last_name(value)     # Length 2+
validate_phone_number(value)  # Format validation
validate_role(value)          # Valid choice
validate_terms_accepted(value) # Must be True
```

### UpdateUserProfileSerializer
Partial updates with validation:
```python
validate_first_name(value)    # Length 2+ if provided
validate_last_name(value)     # Length 2+ if provided
validate_phone_number(value)  # Format validation
validate_zip_code(value)      # Format: XXXXX or XXXXX-XXXX
```

## Frontend Validation

### Client-Side Validation
Located in `BaseSite/album/settings.js`:

```javascript
validatePhoneNumber(phone)    // Regex: /^\+?1?\d{9,15}$/
validateZipCode(zip)          // Regex: /^\d{5}(?:-\d{4})?$/
validateUrl(url)              // URL constructor test
```

**Benefits:**
- Immediate feedback to user
- Reduces unnecessary API calls
- Better UX

### Server-Side Validation
All validation runs on backend regardless of client-side checks.

## User Flow Examples

### Registration Flow
1. User fills registration form
2. Client validates inputs (format, length)
3. Username availability checked via API
4. Form submitted with all data
5. Server validates all fields again
6. User and UserProfile created in transaction
7. JWT tokens returned for auto-login
8. User redirected to home page

### Profile Update Flow
1. Profile page loads, fetches user data
2. User modifies fields
3. Client validates on blur/submit
4. Form submitted via PATCH request
5. Server applies UpdateUserProfileSerializer
6. Updates synced between User and UserProfile
7. Audit fields recorded
8. Profile reloaded with updated data
9. Success message displayed

## Best Practices Implemented

### Database Design
- ✅ One-to-one relationship with User model (no duplication)
- ✅ Proper indexing for query performance
- ✅ Database constraints via validators
- ✅ Audit trail fields
- ✅ Atomic transactions

### Security
- ✅ Password hashing with PBKDF2
- ✅ Account lockout mechanism
- ✅ CSRF protection on all mutations
- ✅ Input validation on client and server
- ✅ Proper permission checks (IsAuthenticated)
- ✅ Read-only fields for sensitive data

### API Design
- ✅ Consistent error messages
- ✅ Proper HTTP status codes
- ✅ Clear field documentation
- ✅ Audit trail for changes
- ✅ Partial update support (PATCH)

### User Experience
- ✅ Real-time character counter (bio)
- ✅ Format help text for inputs
- ✅ Clear validation messages
- ✅ Successful update feedback
- ✅ Auto-reload to confirm changes

## Testing Checklist

### Registration
- [ ] Create account with all fields
- [ ] Username availability checked
- [ ] Password strength validated
- [ ] Email uniqueness verified
- [ ] Terms acceptance required
- [ ] Account created with audit trail

### Profile Viewing
- [ ] Authenticated users can view profile
- [ ] All fields displayed correctly
- [ ] Read-only fields disabled
- [ ] Unauthenticated users redirected

### Profile Update
- [ ] Single field updated (PATCH)
- [ ] Multiple fields updated (PATCH)
- [ ] Phone number validated
- [ ] Zip code validated
- [ ] URL picture validated
- [ ] Changes synced to User model
- [ ] Audit fields updated
- [ ] Transaction rolls back on error

### Security
- [ ] Failed login counter increments
- [ ] Account locks after 5 attempts
- [ ] Auto-unlock works after 30 minutes
- [ ] Password change requires old password
- [ ] CSRF tokens validated on mutations

## Future Enhancements

1. **Email Verification**
   - Send verification email on registration
   - Set `email_verified=True` after verification

2. **Phone Verification**
   - Send SMS code to phone number
   - Set `phone_verified=True` after verification

3. **Profile Picture Upload**
   - Store images in cloud storage
   - Generate thumbnails
   - Replace URL field with FileField

4. **Two-Factor Authentication**
   - Store 2FA secret key
   - Validate TOTP codes
   - Backup codes for recovery

5. **Activity History**
   - Track all profile changes
   - Store before/after values
   - Generate audit reports

6. **Data Export**
   - GDPR data export feature
   - Download all user data as JSON/CSV

7. **Account Preferences**
   - Notification settings
   - Privacy settings
   - Language/locale preferences

8. **Social Profiles**
   - Link to social accounts
   - Import profile data
   - Share on social media

## Troubleshooting

### Profile won't update
1. Check authentication (valid JWT token)
2. Verify field validation rules
3. Check console for serializer errors
4. Verify database migration applied

### Phone number validation failing
- Ensure format: +1-234-567-8901 or 2345678901
- Accepts 9-15 digits total
- Optional + and country code

### Zip code validation failing
- Format: 12345 (5 digits) or 12345-6789 (9 digits)
- Cannot use other formats or letters

### Profile picture URL not saving
- Must be valid URL starting with http:// or https://
- Must be accessible and serve image
- Check browser console for errors

### Account locked after too many attempts
- Auto-unlocks after 30 minutes
- Or admin can manually unlock via Django admin
- Failed attempts reset on successful login

## File References

### Backend
- [backend/users/models.py](backend/users/models.py) - UserProfile model definition
- [backend/users/serializers.py](backend/users/serializers.py) - Validation serializers
- [backend/users/views.py](backend/users/views.py) - API endpoints
- [backend/users/urls.py](backend/users/urls.py) - URL routing
- [backend/users/migrations/0005_*.py](backend/users/migrations/) - Database migrations

### Frontend
- [BaseSite/album/settings.html](BaseSite/album/settings.html) - Profile form
- [BaseSite/album/settings.js](BaseSite/album/settings.js) - Form handling
- [BaseSite/album/register.html](BaseSite/album/register.html) - Registration form
- [BaseSite/album/register.js](BaseSite/album/register.js) - Registration logic
