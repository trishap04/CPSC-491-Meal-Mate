# Meal Mate Donation Cart Implementation Guide

## Overview
Replaced static cart text with a fully functional donation cart system. Users can now:
- Select food categories (Meat, Canned Goods, Bread, Vegetables)
- Search for food items by name
- Add/remove items from donation cart
- Specify quantities for each item
- Submit donations with all food items

## Changes Made

### Backend (Django)

#### 1. **New Models** (`backend/users/models.py`)
- **FoodCategory**: Represents food categories (meat, canned, bread, veggies)
- **Food**: Individual food items with category relationships
- **Donation**: Main donation record with donor information
- **DonationItem**: Line items in a donation (food + quantity)

#### 2. **New API Endpoints** (`backend/users/views.py`)
- `GET /api/users/api/categories/` - Get all food categories
- `GET /api/users/api/foods/` - Get foods (filtered by category)
- `GET /api/users/api/foods/search/?q=<search_term>` - Search foods by name
- `POST /api/users/api/donations/` - Create new donation with items
- `GET /api/users/api/donations/<id>/` - Get donation details

#### 3. **Updated URL Routes** (`backend/users/urls.py`)
Added new API endpoints for foods and donations

#### 4. **Admin Interface** (`backend/users/admin.py`)
Registered all new models in Django admin for easy management

#### 5. **Management Command** (`backend/users/management/commands/populate_foods.py`)
Automatically populates database with sample food items

### Frontend (HTML/CSS/JS)

#### 1. **Updated HTML** (`BaseSite/album/checkout.html`)
- Added category selection buttons (Meat, Canned Goods, Bread, Vegetables)
- Added food search bar
- Added food list display area
- Replaced static cart with dynamic cart that updates in real-time
- Cart shows item counts and total items

#### 2. **Enhanced Styling** (`BaseSite/album/checkout.css`)
- Added styles for category buttons
- Improved food list appearance
- Dynamic cart item styling
- Responsive design for mobile devices
- Interactive hover effects

#### 3. **New JavaScript Logic** (`BaseSite/album/checkout.js`)
Complete rewrite with following features:
- **Category Loading**: Loads and displays food categories
- **Food Search**: Real-time search with debouncing
- **Dynamic Cart**: Add/remove items, update quantities
- **Form Validation**: Ensures at least one item before submission
- **API Integration**: Submits donation data to backend
- **Session Storage**: Saves donation data locally

## Setup Instructions

### 1. Run Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Populate Sample Food Data
```bash
python manage.py populate_foods
```

This creates:
- 4 food categories
- 40+ sample food items across all categories

### 3. Create Django Admin User (if needed)
```bash
python manage.py createsuperuser
```

### 4. Start Django Development Server
```bash
python manage.py runserver
```
Server will run at `http://localhost:8000`

### 5. Update CORS Settings (if needed)
Make sure `ALLOWED_HOSTS` in `backend/settings.py` includes your frontend domain:
```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'yourdomain.com']
```

### 6. Update API_BASE_URL in checkout.js
Make sure the `API_BASE_URL` in `BaseSite/album/checkout.js` points to your backend:
```javascript
const API_BASE_URL = 'http://localhost:8000/api/users';
```

## How It Works

### User Flow:
1. **View Donation Page** → User sees the donation form with new cart interface
2. **Select Category** → User clicks a food category button (Meat, Canned Goods, etc.)
3. **Search/Browse** → User searches for specific food or browses available items
4. **Add to Cart** → User clicks "Add" button to add items to donation cart
5. **Manage Cart** → User can adjust quantities or remove items
6. **Complete Form** → User fills in donor info, pickup date/time, preferences
7. **Submit** → System validates data and creates donation record in database

### API Data Flow:
```
Frontend (checkout.html)
    ↓
API Calls (checkout.js)
    ↓
Django Backend (views.py)
    ↓
Database (sqlite3)
```

## Database Schema

### FoodCategory
- id (Primary Key)
- name (meat, canned, bread, veggies)
- description

### Food
- id (Primary Key)
- name
- category_id (Foreign Key)
- description
- created_at

### Donation
- id (Primary Key)
- first_name
- last_name
- email
- phone
- pickup_date
- pickup_time
- door_preference (meet/leave)
- created_at
- status

### DonationItem
- id (Primary Key)
- donation_id (Foreign Key)
- food_id (Foreign Key)
- quantity
- unit (items, cans, lbs, etc.)

## Admin Features

Access Django Admin at: `http://localhost:8000/admin/`

**Available Sections:**
- **Foods** - Add/edit/delete food items
- **Food Categories** - Manage food categories
- **Donations** - View all donations with inline items editor
- **Donation Items** - View/manage individual donation line items

## Features Implemented

✅ Dynamic food categories (Meat, Canned Goods, Bread, Vegetables)
✅ Real-time food search with debouncing
✅ Add/remove items from cart
✅ Quantity management
✅ Cart item count tracking
✅ Form validation (requires at least 1 item)
✅ Complete donor information form
✅ API integration for data persistence
✅ Session storage for local data
✅ Responsive design
✅ Admin interface for food management

## Customization Options

### Add More Food Categories:
Edit the categories list in `BaseSite/album/checkout.js`:
```javascript
const categories = ['meat', 'canned', 'bread', 'veggies', 'dairy'];
const categoryLabels = {
  'meat': 'Meat',
  'canned': 'Canned Goods',
  'bread': 'Bread',
  'veggies': 'Vegetables',
  'dairy': 'Dairy Products'
};
```

### Modify API Base URL:
Change in `BaseSite/album/checkout.js`:
```javascript
const API_BASE_URL = 'your-backend-url/api/users';
```

### Add More Food Items:
1. Go to Django Admin
2. Click "Foods" section
3. Click "Add Food"
4. Fill in name, category, and description

## Troubleshooting

### API calls not working:
- Check that Django server is running (`http://localhost:8000`)
- Verify `API_BASE_URL` in checkout.js is correct
- Check browser console for errors (F12 → Console)

### Foods not loading:
- Run `python manage.py populate_foods` to add sample data
- Check that migrations have been run
- Verify FoodCategory objects exist in database

### Cart not submitting:
- Ensure at least one item is in the cart
- Check browser console for validation errors
- Verify all form fields are completed

## Next Steps

1. **Add Payment Processing** - Integrate payment gateway if needed
2. **Email Notifications** - Send confirmation emails to donors
3. **Tracking System** - Allow donors to track their donations
4. **Analytics** - Track donation statistics by category/location
5. **User Accounts** - Allow donors to save preferences
6. **Pickup Scheduling** - Better pickup time management

## Files Modified/Created

**Created:**
- `backend/users/management/commands/__init__.py`
- `backend/users/management/commands/populate_foods.py`
- `backend/users/management/__init__.py`

**Modified:**
- `backend/users/models.py` - Added Food, FoodCategory, Donation, DonationItem models
- `backend/users/views.py` - Added new API views
- `backend/users/urls.py` - Added new URL patterns
- `backend/users/serializers.py` - Added new serializers
- `backend/users/admin.py` - Registered new models
- `BaseSite/album/checkout.html` - Updated cart UI
- `BaseSite/album/checkout.js` - Complete rewrite with new functionality
- `BaseSite/album/checkout.css` - Added new styles

## Support
For issues or questions, check the Django logs and browser console for detailed error messages.
