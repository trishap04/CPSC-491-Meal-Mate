from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Food, FoodCategory, Donation, DonationItem


class RegisterSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, default='donor')
    terms_accepted = serializers.BooleanField(required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'bio', 'role', 'terms_accepted']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('That email is already registered.')
        return value

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError('You must accept the terms and conditions.')
        return value

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        phone_number = validated_data.pop('phone_number', '')
        bio = validated_data.pop('bio', '')
        role = validated_data.pop('role', 'donor')
        terms_accepted = validated_data.pop('terms_accepted', False)
        
        # create_user automatically handles basic PBKDF2 hashing out of the box
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )
        UserProfile.objects.create(
            user=user, 
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            bio=bio, 
            role=role,
            terms_accepted=terms_accepted,
            email_verified=False
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(min_length=8, write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'bio', 'role', 'email_verified', 'created_at']
        read_only_fields = ['id', 'username', 'email', 'role', 'email_verified', 'created_at']


class UpdateUserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True}
        }


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
