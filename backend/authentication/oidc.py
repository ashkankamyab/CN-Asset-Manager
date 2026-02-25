import logging

from django.conf import settings

from .models import UserProfile

logger = logging.getLogger(__name__)

try:
    from mozilla_django_oidc.auth import OIDCAuthenticationBackend

    class OIDCBackend(OIDCAuthenticationBackend):
        def _get_role_from_claims(self, claims):
            role_claim = getattr(settings, 'OIDC_ROLE_CLAIM', 'roles')
            admin_value = getattr(settings, 'OIDC_ADMIN_ROLE_VALUE', 'admin')
            roles = claims.get(role_claim, [])
            if isinstance(roles, str):
                roles = [roles]
            if admin_value in roles:
                return UserProfile.Role.ADMIN
            return UserProfile.Role.READONLY

        def create_user(self, claims):
            user = super().create_user(claims)
            role = self._get_role_from_claims(claims)
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'role': role,
                    'auth_source': UserProfile.AuthSource.OIDC,
                },
            )
            return user

        def update_user(self, user, claims):
            user = super().update_user(user, claims)
            role = self._get_role_from_claims(claims)
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'role': role,
                    'auth_source': UserProfile.AuthSource.OIDC,
                },
            )
            return user

        def filter_users_by_claims(self, claims):
            email = claims.get('email')
            if not email:
                return self.UserModel.objects.none()
            return self.UserModel.objects.filter(email__iexact=email)

except ImportError:
    logger.debug('mozilla-django-oidc not installed, OIDC backend unavailable.')
