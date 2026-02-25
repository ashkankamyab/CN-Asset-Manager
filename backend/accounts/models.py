import uuid

from django.db import models


class AWSAccount(models.Model):
    class AccountType(models.TextChoices):
        MANAGEMENT = 'MANAGEMENT', 'Management Account'
        MEMBER = 'MEMBER', 'Member Account'

    class Environment(models.TextChoices):
        PRODUCTION = 'PRODUCTION', 'Production'
        STAGING = 'STAGING', 'Staging'
        DEVELOPMENT = 'DEVELOPMENT', 'Development'
        SHARED = 'SHARED', 'Shared Services'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_id = models.CharField(max_length=12, unique=True, help_text='12-digit AWS account ID')
    account_name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=10, choices=AccountType.choices, default=AccountType.MEMBER)
    environment = models.CharField(max_length=20, choices=Environment.choices, default=Environment.DEVELOPMENT)
    organization_role_name = models.CharField(
        max_length=255,
        default='OrganizationAccountAccessRole',
        help_text='IAM role name to assume in this account',
    )
    aws_access_key_id = models.CharField(
        max_length=128, blank=True, default='',
        help_text='AWS access key ID (for management accounts)',
    )
    aws_secret_access_key = models.CharField(
        max_length=128, blank=True, default='',
        help_text='AWS secret access key (for management accounts)',
    )
    management_account = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='member_accounts',
        limit_choices_to={'account_type': 'MANAGEMENT'},
        help_text='Management account used to assume role into this member account',
    )
    discovery_regions = models.JSONField(
        default=list, blank=True,
        help_text='Regions to scan during discovery. Empty = global default.',
    )
    is_active = models.BooleanField(default=True)
    last_discovery_at = models.DateTimeField(null=True, blank=True)

    # Cost tracking
    estimated_monthly_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Current month estimated cost (USD)',
    )
    previous_month_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Previous month total cost (USD)',
    )
    cost_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['account_name']
        verbose_name = 'AWS Account'
        verbose_name_plural = 'AWS Accounts'

    def __str__(self):
        return f'{self.account_name} ({self.account_id})'
