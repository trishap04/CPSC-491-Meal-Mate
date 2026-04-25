from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Food, FoodCategory, Donation, DonationItem


class RegisterSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, default='donor')
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'bio', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('That username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('That email is already registered.')
        return value

    def create(self, validated_data):
        bio = validated_data.pop('bio', '')
        role = validated_data.pop('role', 'donor')
        # create_user automatically handles basic PBKDF2 hashing out of the box
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        UserProfile.objects.create(user=user, bio=bio, role=role)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = ['id', 'name', 'description']


class FoodSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)
    category_details = FoodCategorySerializer(source='category', read_only=True)
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    
    class Meta:
        model = Food
        fields = ['id', 'name', 'category', 'category_details', 'category_name', 'description']


class DonationItemSerializer(serializers.ModelSerializer):
    food = FoodSerializer(read_only=True)
    food_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = DonationItem
        fields = ['id', 'food', 'food_id', 'quantity', 'unit']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def validate_food_id(self, value):
        if not Food.objects.filter(id=value).exists():
            raise serializers.ValidationError(f'Food with id {value} does not exist.')
        return value


class DonationCreateSerializer(serializers.ModelSerializer):
    items = DonationItemSerializer(many=True, write_only=True)

    class Meta:
        model = Donation
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'address',
            'pickup_date', 'pickup_time', 'door_preference', 'items'
        ]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one donation item is required.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        donation = Donation.objects.create(**validated_data)

        donation_items = []
        for item_data in items_data:
            food_id = item_data.pop('food_id')
            donation_items.append(
                DonationItem(
                    donation=donation,
                    food_id=food_id,
                    **item_data,
                )
            )

        DonationItem.objects.bulk_create(donation_items)
        return donation


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
