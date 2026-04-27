from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from django.utils import timezone

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('donor', 'Donor'),
        ('recipient', 'Recipient'),
        ('organization', 'Organization'),
    ]
    
    # Account Information
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    
    # Contact Information
    phone_number = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Phone number must be 9-15 digits and may start with + and country code.',
                code='invalid_phone'
            )
        ]
    )
    phone_verified = models.BooleanField(default=False)
    
    # Profile Information
    bio = models.TextField(blank=True, null=True, max_length=500)
    profile_picture = models.URLField(blank=True, null=True)
    
    # Address Information
    address = models.TextField(blank=True, null=True, max_length=255)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=50, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    
    # Account Settings
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='donor', db_index=True)
    email_verified = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    marketing_emails = models.BooleanField(default=False)
    
    # Account Security & Activity
    last_login = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    account_locked = models.BooleanField(default=False)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    # Account Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Audit Information
    last_modified_by = models.CharField(max_length=50, default='system')  # 'user', 'system', 'admin'
    last_modified_reason = models.CharField(max_length=255, blank=True, null=True)  # 'profile_edit', 'password_reset', etc.

    class Meta:
        db_table = 'users_userprofile'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['role', 'email_verified']),
        ]
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def lock_account(self, duration_minutes=30):
        """Lock account after failed login attempts"""
        from datetime import timedelta
        self.account_locked = True
        self.account_locked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save()
    
    def unlock_account(self):
        """Unlock account"""
        self.account_locked = False
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.save()
    
    def increment_failed_login(self):
        """Increment failed login counter and lock if threshold reached"""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lock_account()
        else:
            self.save()
    
    def reset_failed_login(self):
        """Reset failed login counter on successful login"""
        self.failed_login_attempts = 0
        self.last_login = timezone.now()
        self.save()
    
    def is_account_locked(self):
        """Check if account is currently locked"""
        if not self.account_locked:
            return False
        
        # Unlock if lockout period has passed
        if self.account_locked_until and timezone.now() > self.account_locked_until:
            self.unlock_account()
            return False
        
        return True


class FoodCategory(models.Model):
    """Categories for food donations"""
    CATEGORY_CHOICES = [
        ('meat', 'Meat'),
        ('canned', 'Canned Goods'),
        ('bread', 'Bread'),
        ('veggies', 'Vegetables'),
    ]
    
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name_plural = "Food Categories"
    
    def __str__(self):
        return self.get_name_display()


class Food(models.Model):
    """Food items that can be donated"""
    name = models.CharField(max_length=255)
    category = models.ForeignKey(FoodCategory, on_delete=models.CASCADE, related_name='foods')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Foods"
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category.get_name_display()})"


class Donation(models.Model):
    """Tracks donations made by users"""
    PICKUP_PREFERENCE_CHOICES = [
        ('meet', 'Meet at door'),
        ('leave', 'Leave at door'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='donations')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=50)
    door_preference = models.CharField(max_length=10, choices=PICKUP_PREFERENCE_CHOICES)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"Donation from {self.first_name} {self.last_name} on {self.pickup_date}"


class DonationItem(models.Model):
    """Individual food items in a donation"""
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, default='items')

    def __str__(self):
        return f"{self.quantity} {self.unit} of {self.food.name}"



    # Ownership (PII Minimization: link to user instead of storing duplicate info)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='donations')
    
    # Donor info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()  # Pickup address
    
    # Donation details
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=50)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Donation from {self.first_name} {self.last_name} on {self.pickup_date}"


class DonationItem(models.Model):
    """Individual food items in a donation"""
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name='items')
    food = models.ForeignKey(Food, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=50, default='items')  # e.g., "cans", "lbs", "packages"
    
    def __str__(self):
        return f"{self.quantity} {self.unit} of {self.food.name}"
    