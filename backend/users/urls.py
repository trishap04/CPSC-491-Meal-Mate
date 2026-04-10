from django.urls import path
from .views import (
    RegisterView,
    FoodCategoryView,
    FoodSearchView,
    FoodListView,
    DonationCreateView,
    DonationDetailView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('api/categories/', FoodCategoryView.as_view(), name='food-categories'),
    path('api/foods/search/', FoodSearchView.as_view(), name='food-search'),
    path('api/foods/', FoodListView.as_view(), name='food-list'),
    path('api/donations/', DonationCreateView.as_view(), name='donation-create'),
    path('api/donations/<int:donation_id>/', DonationDetailView.as_view(), name='donation-detail'),
]
