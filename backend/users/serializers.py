from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

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
