from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('donor', 'Donor'),
        ('recipient', 'Recipient'),
        ('organization', 'Organization'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='donor')
    email_verified = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


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
    door_preference = models.CharField(max_length=10, choices=PICKUP_PREFERENCE_CHOICES)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')
    
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
