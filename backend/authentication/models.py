from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        SUPERADMIN = 'superadmin', 'Super Admin'
        ADMIN = 'admin', 'Admin'
        READONLY = 'readonly', 'Read Only'

    class AuthSource(models.TextChoices):
        LOCAL = 'local', 'Local'
        OIDC = 'oidc', 'OIDC'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.READONLY,
    )
    is_superadmin = models.BooleanField(default=False)
    auth_source = models.CharField(
        max_length=10,
        choices=AuthSource.choices,
        default=AuthSource.LOCAL,
    )

    def __str__(self):
        return f'{self.user.username} ({self.get_role_display()})'

    @property
    def is_admin_or_superadmin(self):
        return self.role in (self.Role.SUPERADMIN, self.Role.ADMIN)


class SiteSettings(models.Model):
    """Singleton model for application-wide settings."""

    # OIDC
    oidc_enabled = models.BooleanField(default=False)
    oidc_client_id = models.CharField(max_length=255, blank=True, default='')
    oidc_client_secret = models.CharField(max_length=255, blank=True, default='')
    oidc_authority_url = models.URLField(max_length=500, blank=True, default='',
                                         help_text='Base URL of the OIDC provider (e.g. https://login.microsoftonline.com/tenant/v2.0)')
    oidc_authorization_endpoint = models.URLField(max_length=500, blank=True, default='')
    oidc_token_endpoint = models.URLField(max_length=500, blank=True, default='')
    oidc_user_endpoint = models.URLField(max_length=500, blank=True, default='')
    oidc_jwks_endpoint = models.URLField(max_length=500, blank=True, default='')
    oidc_sign_algo = models.CharField(max_length=10, default='RS256')
    oidc_role_claim = models.CharField(max_length=100, default='roles',
                                        help_text='JWT claim that contains user roles')
    oidc_admin_role_value = models.CharField(max_length=100, default='admin',
                                              help_text='Claim value that maps to admin role')

    # Email
    class EmailBackend(models.TextChoices):
        CONSOLE = 'console', 'Console (development)'
        SMTP = 'smtp', 'SMTP'
        SES = 'ses', 'Amazon SES'
        GOOGLE = 'google', 'Google API (Gmail)'

    email_backend = models.CharField(
        max_length=10, choices=EmailBackend.choices, default=EmailBackend.CONSOLE,
    )
    email_from_address = models.EmailField(blank=True, default='', help_text='Default From address')
    email_from_name = models.CharField(max_length=100, blank=True, default='Cloud Native Asset Manager')

    # SMTP
    smtp_host = models.CharField(max_length=255, blank=True, default='')
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True, default='')
    smtp_password = models.CharField(max_length=255, blank=True, default='')
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)

    # Amazon SES
    ses_aws_region = models.CharField(max_length=30, blank=True, default='us-east-1')
    ses_aws_access_key_id = models.CharField(max_length=128, blank=True, default='')
    ses_aws_secret_access_key = models.CharField(max_length=256, blank=True, default='')

    # Google API (Gmail)
    google_service_account_json = models.TextField(blank=True, default='',
                                                     help_text='Service account JSON key')
    google_delegated_email = models.EmailField(blank=True, default='',
                                                help_text='Email of user to impersonate (domain-wide delegation)')

    # General
    session_timeout_minutes = models.PositiveIntegerField(default=480,
                                                           help_text='Session timeout in minutes')

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def __str__(self):
        return 'Site Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
