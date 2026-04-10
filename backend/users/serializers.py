from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Food, FoodCategory, Donation, DonationItem

class RegisterSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, default='donor')

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'bio', 'role']
        extra_kwargs = {'password': {'write_only': True}}

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
            'id', 'first_name', 'last_name', 'email', 'phone',
            'pickup_date', 'pickup_time', 'door_preference',
            'created_at', 'status', 'items'
        ]
        read_only_fields = ['id', 'created_at', 'status']

