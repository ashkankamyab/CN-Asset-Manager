import uuid

from django.conf import settings
from django.db import models


class AssetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='bi-box', help_text='Bootstrap Icons class')
    color = models.CharField(max_length=20, default='primary')

    class Meta:
        verbose_name_plural = 'Asset Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Asset(models.Model):
    class AssetType(models.TextChoices):
        AWS_SERVICE = 'AWS_SERVICE', 'AWS Service'
        SELF_HOSTED = 'SELF_HOSTED', 'Self Hosted'
        SAAS = 'SAAS', 'SaaS'
        ON_PREMISE = 'ON_PREMISE', 'On Premise'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        DECOMMISSIONED = 'DECOMMISSIONED', 'Decommissioned'
        UNKNOWN = 'UNKNOWN', 'Unknown'

    class Criticality(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical'
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'

    class AWSServiceType(models.TextChoices):
        EC2 = 'EC2', 'EC2'
        EKS = 'EKS', 'EKS'
        RDS = 'RDS', 'RDS'
        ELASTICACHE = 'ELASTICACHE', 'ElastiCache'
        ALB = 'ALB', 'ALB'
        NLB = 'NLB', 'NLB'
        VPC = 'VPC', 'VPC'
        LAMBDA = 'LAMBDA', 'Lambda'
        ECR = 'ECR', 'ECR'
        COGNITO = 'COGNITO', 'Cognito'
        OPENSEARCH = 'OPENSEARCH', 'OpenSearch'
        S3 = 'S3', 'S3'
        IAM = 'IAM', 'IAM'
        SNS = 'SNS', 'SNS'
        SQS = 'SQS', 'SQS'
        MSK = 'MSK', 'MSK'
        CLOUDFRONT = 'CLOUDFRONT', 'CloudFront'
        ROUTE53 = 'ROUTE53', 'Route53'
        ACM = 'ACM', 'ACM'
        SECRETSMANAGER = 'SECRETSMANAGER', 'Secrets Manager'
        OTHER = 'OTHER', 'Other'

    class DataClassification(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Public'
        INTERNAL = 'INTERNAL', 'Internal'
        CONFIDENTIAL = 'CONFIDENTIAL', 'Confidential'
        STRICTLY_CONFIDENTIAL = 'STRICTLY_CONFIDENTIAL', 'Strictly Confidential'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset_id = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=500)
    category = models.ForeignKey(AssetCategory, on_delete=models.SET_NULL, null=True, blank=True)
    asset_type = models.CharField(max_length=20, choices=AssetType.choices, default=AssetType.AWS_SERVICE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    criticality = models.CharField(max_length=10, choices=Criticality.choices, default=Criticality.MEDIUM)

    # AWS-specific fields
    aws_account = models.ForeignKey(
        'accounts.AWSAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='assets'
    )
    aws_region = models.CharField(max_length=30, blank=True, default='')
    aws_resource_id = models.CharField(max_length=500, blank=True, default='')
    aws_resource_arn = models.CharField(max_length=1024, blank=True, default='')
    aws_service_type = models.CharField(
        max_length=20, choices=AWSServiceType.choices, blank=True, default=''
    )

    # Flexible data storage
    metadata = models.JSONField(default=dict, blank=True)
    ip_addresses = models.JSONField(default=list, blank=True)
    dns_names = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=dict, blank=True)

    # Ownership and documentation
    owner = models.CharField(max_length=255, blank=True, default='')
    description = models.TextField(blank=True, default='')
    vendor = models.CharField(max_length=255, blank=True, default='')
    url = models.CharField(max_length=500, blank=True, default='')
    version = models.CharField(max_length=100, blank=True, default='')

    # Compliance fields
    data_classification = models.CharField(
        max_length=25, choices=DataClassification.choices, default=DataClassification.INTERNAL
    )
    gdpr_relevant = models.BooleanField(default=False)
    contains_personal_data = models.BooleanField(default=False)
    backup_enabled = models.BooleanField(default=False)
    monitoring_enabled = models.BooleanField(default=False)

    notes = models.TextField(blank=True, default='')

    # Timestamps
    discovered_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    is_manually_added = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['aws_resource_arn']),
            models.Index(fields=['aws_account', 'aws_region', 'aws_resource_id']),
            models.Index(fields=['asset_type']),
            models.Index(fields=['status']),
            models.Index(fields=['criticality']),
            models.Index(fields=['aws_service_type']),
        ]

    def __str__(self):
        return f'{self.asset_id} - {self.name}'

    def save(self, *args, **kwargs):
        if not self.asset_id:
            last = Asset.objects.order_by('-asset_id').values_list('asset_id', flat=True).first()
            if last:
                try:
                    num = int(last.split('-')[1]) + 1
                except (IndexError, ValueError):
                    num = 1
            else:
                num = 1
            self.asset_id = f'ASSET-{num:04d}'
        super().save(*args, **kwargs)


class AssetRelationship(models.Model):
    class RelationshipType(models.TextChoices):
        DEPENDS_ON = 'DEPENDS_ON', 'Depends On'
        CONTAINS = 'CONTAINS', 'Contains'
        CONNECTS_TO = 'CONNECTS_TO', 'Connects To'
        MANAGED_BY = 'MANAGED_BY', 'Managed By'

    source_asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='outgoing_relationships')
    target_asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='incoming_relationships')
    relationship_type = models.CharField(max_length=20, choices=RelationshipType.choices)
    description = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ['source_asset', 'target_asset', 'relationship_type']

    def __str__(self):
        return f'{self.source_asset} -> {self.relationship_type} -> {self.target_asset}'


class DiscoveryJob(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        RUNNING = 'RUNNING', 'Running'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aws_account = models.ForeignKey(
        'accounts.AWSAccount', on_delete=models.SET_NULL, null=True, blank=True,
        help_text='Null means all accounts',
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    resources_discovered = models.IntegerField(default=0)
    resources_updated = models.IntegerField(default=0)
    resources_new = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default='')
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    log_output = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        target = self.aws_account or 'All Accounts'
        return f'Discovery {self.id.hex[:8]} - {target} ({self.status})'

    @property
    def duration(self):
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
