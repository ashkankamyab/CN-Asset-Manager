import logging

from django.conf import settings
from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from mozilla_django_oidc.views import (
    OIDCAuthenticationRequestView as _BaseAuthRequestView,
    OIDCAuthenticationCallbackView as _BaseCallbackView,
)

from .models import UserProfile, SiteSettings

logger = logging.getLogger(__name__)

# Maps mozilla-django-oidc setting names → SiteSettings field names
_SETTINGS_MAP = {
    'OIDC_RP_CLIENT_ID': 'oidc_client_id',
    'OIDC_RP_CLIENT_SECRET': 'oidc_client_secret',
    'OIDC_OP_AUTHORIZATION_ENDPOINT': 'oidc_authorization_endpoint',
    'OIDC_OP_TOKEN_ENDPOINT': 'oidc_token_endpoint',
    'OIDC_OP_USER_ENDPOINT': 'oidc_user_endpoint',
    'OIDC_OP_JWKS_ENDPOINT': 'oidc_jwks_endpoint',
    'OIDC_RP_SIGN_ALGO': 'oidc_sign_algo',
}


def _get_oidc_setting(attr, *args):
    """Read an OIDC setting from the database SiteSettings, falling back to Django settings."""
    if attr in _SETTINGS_MAP:
        try:
            site = SiteSettings.load()
            return getattr(site, _SETTINGS_MAP[attr])
        except Exception:
            pass
    return getattr(settings, attr, *args)


def is_oidc_enabled():
    try:
        return SiteSettings.load().oidc_enabled
    except Exception:
        return False


class OIDCBackend(OIDCAuthenticationBackend):
    """Custom OIDC backend that reads all settings from the database."""

    def get_settings(self, attr, *args):
        return _get_oidc_setting(attr, *args)

    def authenticate(self, request, **kwargs):
        if not is_oidc_enabled():
            return None
        return super().authenticate(request, **kwargs)

    def _get_role_from_claims(self, claims):
        try:
            site = SiteSettings.load()
            role_claim = site.oidc_role_claim or 'roles'
            admin_value = site.oidc_admin_role_value or 'admin'
        except Exception:
            role_claim = 'roles'
            admin_value = 'admin'
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


class OIDCLoginView(_BaseAuthRequestView):
    """Custom OIDC login view that reads settings from the database."""

    def get_settings(self, attr, *args):
        return _get_oidc_setting(attr, *args)

    def get(self, request):
        if not is_oidc_enabled():
            from django.http import HttpResponseNotFound
            return HttpResponseNotFound('OIDC is not enabled.')
        return super().get(request)


class OIDCCallbackView(_BaseCallbackView):
    """Custom OIDC callback view that reads settings from the database."""

    def get_settings(self, attr, *args):
        return _get_oidc_setting(attr, *args)
