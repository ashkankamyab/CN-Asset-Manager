from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile, SiteSettings

User = get_user_model()


class UserProfileInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'is_superadmin', 'auth_source']
        read_only_fields = ['is_superadmin', 'auth_source']


class AdminUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    is_superadmin = serializers.BooleanField(source='profile.is_superadmin', read_only=True)
    auth_source = serializers.CharField(source='profile.auth_source', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_active',
            'role', 'is_superadmin', 'auth_source',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, default=UserProfile.Role.READONLY)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_active', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', UserProfile.Role.READONLY)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Profile is auto-created by signal; update the role
        user.profile.role = role
        user.profile.auth_source = UserProfile.AuthSource.LOCAL
        user.profile.save()
        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'is_active', 'role', 'password']

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        if role is not None:
            instance.profile.role = role
            instance.profile.save()

        return instance


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        exclude = ['id']
