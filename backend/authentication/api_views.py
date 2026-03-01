import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.profile
            role = profile.role
            is_superadmin = profile.is_superadmin
        except UserProfile.DoesNotExist:
            role = UserProfile.Role.READONLY
            is_superadmin = False

        return Response({
            'id': user.pk,
            'username': user.username,
            'email': user.email,
            'role': role,
            'is_superadmin': is_superadmin,
        })


@method_decorator(ensure_csrf_cookie, name='dispatch')
class CSRFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'detail': 'CSRF cookie set.'})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'detail': 'Invalid username or password.'},
                status=400,
            )
        login(request, user)
        try:
            profile = user.profile
            role = profile.role
            is_superadmin = profile.is_superadmin
        except UserProfile.DoesNotExist:
            role = UserProfile.Role.READONLY
            is_superadmin = False
        return Response({
            'id': user.pk,
            'username': user.username,
            'email': user.email,
            'role': role,
            'is_superadmin': is_superadmin,
        })


class ConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from authentication.oidc import is_oidc_enabled
        return Response({
            'oidc_enabled': is_oidc_enabled(),
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Logged out.'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=400)

        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})

        # Only allow password reset for local users
        try:
            if user.profile.auth_source != UserProfile.AuthSource.LOCAL:
                return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})
        except UserProfile.DoesNotExist:
            pass

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f'{request.build_absolute_uri("/reset-password")}?uid={uid}&token={token}'

        try:
            from .email_utils import send_email
            send_email(
                subject='Password Reset — Cloud Native Asset Manager',
                body_text=f'Hi {user.username},\n\nClick the link below to reset your password:\n{reset_url}\n\nThis link expires in 24 hours.\n\nIf you did not request this, please ignore this email.',
                body_html=(
                    f'<p>Hi {user.username},</p>'
                    f'<p>Click the link below to reset your password:</p>'
                    f'<p><a href="{reset_url}">{reset_url}</a></p>'
                    f'<p>This link expires in 24 hours.</p>'
                    f'<p><small>If you did not request this, please ignore this email.</small></p>'
                ),
                to_list=[user.email],
            )
        except Exception:
            logger.exception('Failed to send password reset email to %s', email)
            return Response({'detail': 'Failed to send email. Please contact an administrator.'}, status=500)

        return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        password = request.data.get('password', '')

        if not uid or not token or not password:
            return Response({'detail': 'uid, token, and password are required.'}, status=400)

        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=400)

        try:
            pk = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid reset link.'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Reset link has expired or is invalid.'}, status=400)

        user.set_password(password)
        user.save()

        return Response({'detail': 'Password has been reset successfully.'})
