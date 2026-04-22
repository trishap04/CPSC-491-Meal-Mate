from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
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
    DonationSerializer,
)
from .models import Food, FoodCategory, Donation, DonationItem, UserProfile
from django.db.models import Q
from rest_framework_simplejwt.tokens import RefreshToken


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
        if '@' in identifier:
            try:
                username = User.objects.get(email__iexact=identifier).username
            except User.DoesNotExist:
                return Response(
                    {'error': 'No account matches that email address.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'error': 'Invalid username/email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful. Redirecting you home.',
            'redirect_url': '/index.html',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_200_OK)


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


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


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
    """API to update user's profile (first name and last name)"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            user_profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = UpdateUserProfileSerializer(user_profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Also update the User model's first_name and last_name for consistency
            user = request.user
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            user.save()
            
            return Response({
                'message': 'Profile updated successfully.',
                'profile': UserProfileSerializer(user_profile).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FoodCategoryView(APIView):
    """API to get all food categories"""
    def get(self, request):
        categories = FoodCategory.objects.all()
        serializer = FoodCategorySerializer(categories, many=True)
        return Response(serializer.data)


class FoodSearchView(APIView):
    """API to search foods by name and optionally filter by category"""
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
    def get(self, request):
        category = request.query_params.get('category', '').strip()
        
        foods = Food.objects.all()
        if category:
            foods = foods.filter(category__name=category)
        
        serializer = FoodSerializer(foods, many=True)
        return Response(serializer.data)


class DonationCreateView(APIView):
    """API to create a new donation with items"""
    def post(self, request):
        try:
            # Extract donation info
            donation_data = {
                'first_name': request.data.get('first_name'),
                'last_name': request.data.get('last_name'),
                'email': request.data.get('email'),
                'phone': request.data.get('phone'),
                'pickup_date': request.data.get('pickup_date'),
                'pickup_time': request.data.get('pickup_time'),
                'door_preference': request.data.get('door_preference'),
            }
            
            # Create donation
            donation = Donation.objects.create(**donation_data)
            
            # Extract and create donation items
            items_data = request.data.get('items', [])
            for item in items_data:
                food_id = item.get('food_id')
                quantity = item.get('quantity', 1)
                unit = item.get('unit', 'items')
                
                try:
                    food = Food.objects.get(id=food_id)
                    DonationItem.objects.create(
                        donation=donation,
                        food=food,
                        quantity=quantity,
                        unit=unit
                    )
                except Food.DoesNotExist:
                    donation.delete()
                    return Response(
                        {'error': f'Food with id {food_id} does not exist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            serializer = DonationSerializer(donation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DonationDetailView(APIView):
    """API to retrieve donation details"""
    def get(self, request, donation_id):
        try:
            donation = Donation.objects.get(id=donation_id)
            serializer = DonationSerializer(donation)
            return Response(serializer.data)
        except Donation.DoesNotExist:
            return Response(
                {'error': 'Donation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
