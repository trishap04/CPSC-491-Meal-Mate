from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from .serializers import (
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    UpdateUserProfileSerializer,
    FoodSerializer,
    FoodCategorySerializer,
    DonationCreateSerializer,
    DonationSerializer,
)
from .models import Food, FoodCategory, Donation, DonationItem, UserProfile
from django.db.models import Q
from django.db import transaction


@method_decorator(csrf_protect, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "User registered successfully!",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get('identifier') or '').strip()
        password = request.data.get('password') or ''

        if not identifier or not password:
            return Response(
                {'error': 'Email/username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = identifier
        user = None
        user_profile = None

        if '@' in identifier:
            try:
                user = User.objects.get(email__iexact=identifier)
                username = user.username
            except User.DoesNotExist:
                return Response(
                    {'error': 'Invalid username/email or password.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        try:
            user = user or User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid username/email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            user_profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            user_profile = None

        if user_profile and user_profile.is_account_locked():
            locked_until = user_profile.account_locked_until
            return Response(
                {
                    'error': 'Your account is locked. Please try again later.',
                    'locked_until': locked_until.isoformat() if locked_until else None
                },
                status=status.HTTP_403_FORBIDDEN
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            if user_profile:
                user_profile.increment_failed_login()
            return Response(
                {'error': 'Invalid username/email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user_profile:
            user_profile.reset_failed_login()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful. Redirecting you home.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'redirect_url': '/index.html',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_200_OK)


class CheckUsernameAvailabilityView(APIView):
    """API to check if a username is available during registration or profile editing"""
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip().lower()
        exclude_user_id = request.data.get('exclude_user_id')  # For profile edits to exclude current user

        if not username:
            return Response({
                'available': False,
                'message': 'Username cannot be empty.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(username) < 3:
            return Response({
                'available': False,
                'message': 'Username must be at least 3 characters long.'
            }, status=status.HTTP_200_OK)

        if len(username) > 150:
            return Response({
                'available': False,
                'message': 'Username cannot exceed 150 characters.'
            }, status=status.HTTP_200_OK)

        # Check for valid characters (alphanumeric, underscore, hyphen only)
        if not all(c.isalnum() or c in '_-' for c in username):
            return Response({
                'available': False,
                'message': 'Username can only contain letters, numbers, underscores, and hyphens.'
            }, status=status.HTTP_200_OK)

        # Check if username exists (case-insensitive)
        query = User.objects.filter(username__iexact=username)
        
        # Exclude current user if provided (for profile editing)
        if exclude_user_id:
            query = query.exclude(id=exclude_user_id)

        if query.exists():
            return Response({
                'available': False,
                'message': 'This username is already taken.'
            }, status=status.HTTP_200_OK)

        return Response({
            'available': True,
            'message': 'Username is available.'
        }, status=status.HTTP_200_OK)


class CheckEmailAvailabilityView(APIView):
    """Check whether an email address is already registered (case-insensitive)."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()

        if not email:
            return Response(
                {'available': False, 'message': 'Email cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'available': False, 'message': 'An account with that email already exists.'},
                status=status.HTTP_200_OK
            )

        return Response(
            {'available': True, 'message': 'Email is available.'},
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name='dispatch')
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        password = (request.data.get('password') or '').strip()

        if not password:
            return Response(
                {'error': 'Your password is required to delete your account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(password):
            return Response(
                {'error': 'Incorrect password. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Best-effort: blacklist the caller's refresh token before the user row
        # is deleted (row deletion would make the token un-blacklistable anyway,
        # but this cleans up the blacklist table while the user still exists).
        refresh_token_str = request.data.get('refresh_token')
        if refresh_token_str:
            try:
                RefreshToken(refresh_token_str).blacklist()
            except Exception:
                pass

        request.user.delete()
        return Response({"message": "Your account has been permanently deleted."}, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            return Response({
                'message': 'If an account exists for that email, a reset link is ready.',
            }, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f'/reset-password.html?uid={uid}&token={token}'

        return Response({
            'message': 'Password reset link generated successfully.',
            'reset_url': reset_url,
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {'error': 'This reset link is invalid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'This reset link has expired or is invalid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Password updated successfully. You can now log in.',
            'redirect_url': '/login.html',
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """API to allow authenticated users to change their password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        user = request.user

        # Verify old password is correct
        if not user.check_password(old_password):
            return Response(
                {'error': 'Your current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent using the same password
        if user.check_password(new_password):
            return Response(
                {'error': 'Your new password cannot be the same as your current password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password
        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Your password has been changed successfully.',
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """API to retrieve current user's profile"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            serializer = UserProfileSerializer(user_profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


class UpdateUserProfileView(APIView):
    """
    API to update user's profile information securely with transaction handling
    
    Handles:
    - Personal information (first name, last name)
    - Contact details (phone number, address)
    - Profile customization (bio, picture)
    - Location information (city, state, zip)
    - Communication preferences (marketing emails)
    
    Ensures consistency between User and UserProfile models via transaction.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            user_profile = UserProfile.objects.select_for_update().get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateUserProfileSerializer(user_profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.db import transaction
            
            # Use atomic transaction to ensure data consistency
            with transaction.atomic():
                # Update the profile
                updated_profile = serializer.save()
                
                # Also update the User model's first_name and last_name for consistency
                user = request.user
                if 'first_name' in request.data:
                    user.first_name = request.data['first_name']
                if 'last_name' in request.data:
                    user.last_name = request.data['last_name']
                user.save()
                
                # Refresh the profile to get the updated audit fields
                updated_profile.refresh_from_db()
            
            return Response({
                'message': 'Profile updated successfully.',
                'profile': UserProfileSerializer(updated_profile).data
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to update profile: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class FoodCategoryView(APIView):
    """API to get all food categories"""
    permission_classes = [AllowAny]

    def get(self, request):
        categories = FoodCategory.objects.all()
        serializer = FoodCategorySerializer(categories, many=True)
        return Response(serializer.data)


class FoodSearchView(APIView):
    """API to search foods by name and optionally filter by category"""
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        category = request.query_params.get('category', '').strip()
        
        foods = Food.objects.all()
        
        # Filter by search query
        if query:
            foods = foods.filter(
                Q(name__icontains=query) | Q(description__icontains=query)
            )
        
        # Filter by category
        if category:
            foods = foods.filter(category__name=category)
        
        serializer = FoodSerializer(foods, many=True)
        return Response(serializer.data)


class FoodListView(APIView):
    """API to get all foods, optionally filtered by category"""
    permission_classes = [AllowAny]

    def get(self, request):
        category = request.query_params.get('category', '').strip()
        
        foods = Food.objects.all()
        if category:
            foods = foods.filter(category__name=category)
        
        serializer = FoodSerializer(foods, many=True)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class DonationCreateView(APIView):
    """API to create a new donation with items"""
    permission_classes = [AllowAny]
    def post(self, request):
        try:
            serializer = DonationCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Keep donation and its items in one transaction so partial writes
            # cannot leave orphaned or incomplete donation data behind.
            with transaction.atomic():
                save_kwargs = {}
                if request.user.is_authenticated:
                    save_kwargs['user'] = request.user
                donation = serializer.save(**save_kwargs)

            serializer = DonationSerializer(donation)
            return Response(
            {
                    'message': 'Donation submitted successfully.',
                    'donation': serializer.data
             },
            status=status.HTTP_201_CREATED
    )

        except ValidationError as exc:
            return Response(
                {
                    'message': 'Validation failed.',
                    'errors': exc.detail
                },
                status=status.HTTP_400_BAD_REQUEST,
    )

        except Exception as e:
            return Response(
                 {
                    'message': 'Failed to process donation.',
                    'error': str(e)
        },
        status=status.HTTP_400_BAD_REQUEST
    )


@method_decorator(csrf_exempt, name='dispatch')
class DonationDetailView(APIView):
    """API to retrieve donation details"""
    def get(self, request, donation_id):
        try:
            donation = Donation.objects.get(id=donation_id)
            
            # PII Minimization Audit: Only owner or staff can view full PII
            if donation.user and donation.user != request.user and not request.user.is_staff:
                return Response(
                    {'error': 'You do not have permission to view this donation.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = DonationSerializer(donation)
            return Response(serializer.data)
        except Donation.DoesNotExist:
            return Response(
                {'error': 'Donation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
