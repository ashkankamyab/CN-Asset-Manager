from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile, SiteSettings
from .permissions import IsAdmin
from .serializers import (
    AdminUserSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    SiteSettingsSerializer,
)

User = get_user_model()


class AdminUserListCreateView(ListCreateAPIView):
    """List all users or create a new user (admin only)."""
    permission_classes = [IsAdmin]
    pagination_class = None
    queryset = User.objects.select_related('profile').order_by('username')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminUserCreateSerializer
        return AdminUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a user (admin only)."""
    permission_classes = [IsAdmin]
    queryset = User.objects.select_related('profile')
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prevent editing superadmin role
        if instance.profile.is_superadmin and 'role' in request.data:
            if request.data['role'] != UserProfile.Role.SUPERADMIN:
                return Response(
                    {'detail': 'Cannot change the superadmin role.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminUserSerializer(instance).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.profile.is_superadmin:
            return Response(
                {'detail': 'Cannot delete the superadmin user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if instance.pk == request.user.pk:
            return Response(
                {'detail': 'Cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SiteSettingsView(APIView):
    """Get or update site settings (admin only)."""
    permission_classes = [IsAdmin]

    def get(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TestEmailView(APIView):
    """Send a test email to verify email configuration (admin only)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        to = request.data.get('to', '').strip()
        if not to:
            return Response({'detail': 'Recipient email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .email_utils import send_test_email
            send_test_email(to)
        except Exception as exc:
            return Response({'detail': f'Failed to send: {exc}'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': f'Test email sent to {to}.'})
