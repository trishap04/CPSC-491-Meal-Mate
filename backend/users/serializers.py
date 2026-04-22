from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Food, FoodCategory, Donation, DonationItem
import re


class RegisterSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    role = serializers.CharField(required=False, default='donor')
    terms_accepted = serializers.BooleanField(required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'bio', 'role', 'terms_accepted']
        extra_kwargs = {'password': {'write_only': True, 'min_length': 8}}

    def validate_username(self, value):
        """Validate username is unique (case-insensitive)"""
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        # Check for valid format
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            raise serializers.ValidationError('Username can only contain letters, numbers, underscores, and hyphens.')
        if len(value) < 3:
            raise serializers.ValidationError('Username must be at least 3 characters long.')
        return value

    def validate_email(self, value):
        """Validate email is unique (case-insensitive)"""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('That email is already registered.')
        return value.lower()

    def validate_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError('Password must contain at least one number.')
        return value

    def validate_first_name(self, value):
        """Validate first name"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('First name must be at least 2 characters long.')
        return value.strip() if value else value

    def validate_last_name(self, value):
        """Validate last name"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('Last name must be at least 2 characters long.')
        return value.strip() if value else value

    def validate_phone_number(self, value):
        """Validate phone number format"""
        if value and not re.match(r'^\+?1?\d{9,15}$', value.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')):
            raise serializers.ValidationError('Invalid phone number format. Use 9-15 digits.')
        return value

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError('You must accept the terms and conditions.')
        return value

    def validate_role(self, value):
        """Validate role is one of the allowed choices"""
        valid_roles = ['donor', 'recipient', 'organization']
        if value not in valid_roles:
            raise serializers.ValidationError(f'Role must be one of: {", ".join(valid_roles)}')
        return value

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '').strip()
        last_name = validated_data.pop('last_name', '').strip()
        phone_number = validated_data.pop('phone_number', '').strip()
        bio = validated_data.pop('bio', '').strip()
        role = validated_data.pop('role', 'donor')
        terms_accepted = validated_data.pop('terms_accepted', False)
        
        # Create user with hashed password via create_user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'].lower(),
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )
        
        # Create user profile
        UserProfile.objects.create(
            user=user, 
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number if phone_number else None,
            bio=bio if bio else None,
            role=role,
            terms_accepted=terms_accepted,
            email_verified=False,
            last_modified_by='system',
            last_modified_reason='account_created'
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        """Validate new password strength"""
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError('Password must contain at least one number.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(min_length=8, write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        """Validate new password strength"""
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError('Password must contain at least one lowercase letter.')
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError('Password must contain at least one number.')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'The new password and confirmation do not match.'
            })
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 
            'phone_verified', 'bio', 'profile_picture', 'address', 'city', 'state', 
            'zip_code', 'role', 'email_verified', 'marketing_emails', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'role', 'email_verified', 'phone_verified',
            'created_at', 'updated_at'
        ]


class UpdateUserProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile information"""
    
    class Meta:
        model = UserProfile
        fields = [
            'first_name', 'last_name', 'phone_number', 'bio', 'profile_picture',
            'address', 'city', 'state', 'zip_code', 'marketing_emails'
        ]
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True, 'max_length': 100},
            'last_name': {'required': False, 'allow_blank': True, 'max_length': 100},
            'phone_number': {'required': False, 'allow_blank': True, 'max_length': 20},
            'bio': {'required': False, 'allow_blank': True, 'max_length': 500},
            'profile_picture': {'required': False, 'allow_blank': True, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True, 'max_length': 255},
            'city': {'required': False, 'allow_blank': True, 'max_length': 100},
            'state': {'required': False, 'allow_blank': True, 'max_length': 50},
            'zip_code': {'required': False, 'allow_blank': True, 'max_length': 20},
            'marketing_emails': {'required': False}
        }

    def validate_first_name(self, value):
        """Validate first name"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('First name must be at least 2 characters long.')
        return value.strip() if value else value

    def validate_last_name(self, value):
        """Validate last name"""
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('Last name must be at least 2 characters long.')
        return value.strip() if value else value

    def validate_phone_number(self, value):
        """Validate phone number format"""
        if value:
            # Remove common formatting characters
            cleaned = value.replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            if not re.match(r'^\+?1?\d{9,15}$', cleaned):
                raise serializers.ValidationError('Invalid phone number format.')
        return value

    def validate_zip_code(self, value):
        """Validate zip code format"""
        if value and not re.match(r'^[0-9]{5}(?:-[0-9]{4})?$', value):
            raise serializers.ValidationError('Invalid zip code format. Use XXXXX or XXXXX-XXXX.')
        return value

    def update(self, instance, validated_data):
        """Update profile with audit information"""
        # Strip whitespace from string fields
        for field in ['first_name', 'last_name', 'bio', 'address', 'city', 'state']:
            if field in validated_data and validated_data[field]:
                validated_data[field] = validated_data[field].strip()

        # Update audit fields
        validated_data['last_modified_by'] = 'user'
        validated_data['last_modified_reason'] = 'profile_edit'

        return super().update(instance, validated_data)


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = ['id', 'name', 'description']


class FoodSerializer(serializers.ModelSerializer):
    category = FoodCategorySerializer(read_only=True)
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    
    class Meta:
        model = Food
        fields = ['id', 'name', 'category', 'category_name', 'description']


class DonationItemSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = DonationItem
        fields = ['id', 'food', 'food_id', 'quantity', 'unit']


class DonationSerializer(serializers.ModelSerializer):
    items = DonationItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Donation
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'address',
            'pickup_date', 'pickup_time', 'door_preference',
            'created_at', 'status', 'items'
        ]
        read_only_fields = ['id', 'created_at', 'status']
