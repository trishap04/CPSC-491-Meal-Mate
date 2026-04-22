from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
    UserProfileView,
    UpdateUserProfileView,
    FoodCategoryView,
    FoodSearchView,
    FoodListView,
    DonationCreateView,
    DonationDetailView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/update/', UpdateUserProfileView.as_view(), name='update-user-profile'),
    path('api/categories/', FoodCategoryView.as_view(), name='food-categories'),
    path('api/foods/search/', FoodSearchView.as_view(), name='food-search'),
    path('api/foods/', FoodListView.as_view(), name='food-list'),
    path('api/donations/', DonationCreateView.as_view(), name='donation-create'),
    path('api/donations/<int:donation_id>/', DonationDetailView.as_view(), name='donation-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
