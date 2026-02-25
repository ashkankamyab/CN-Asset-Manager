import re

from rest_framework import serializers

from accounts.serializers import AWSAccountSerializer
from .models import Asset, AssetCategory, AssetRelationship, DiscoveryJob

URL_SCHEME_RE = re.compile(
    r'^[a-zA-Z][a-zA-Z0-9+\-.]*://',  # RFC 3986 scheme
)


def validate_url_scheme(value):
    if not value:
        return value
    if not URL_SCHEME_RE.match(value):
        raise serializers.ValidationError(
            'URL must start with a scheme (e.g. http://, https://, s3://, ftp://, webdav://).'
        )
    return value


class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = ['id', 'name', 'description', 'icon', 'color']


class RelationshipSerializer(serializers.ModelSerializer):
    related_asset_id = serializers.CharField(source='target_asset.asset_id', read_only=True)
    related_asset_name = serializers.CharField(source='target_asset.name', read_only=True)
    related_asset_pk = serializers.UUIDField(source='target_asset.pk', read_only=True)

    class Meta:
        model = AssetRelationship
        fields = [
            'id', 'relationship_type', 'description',
            'related_asset_id', 'related_asset_name', 'related_asset_pk',
        ]


class IncomingRelationshipSerializer(serializers.ModelSerializer):
    related_asset_id = serializers.CharField(source='source_asset.asset_id', read_only=True)
    related_asset_name = serializers.CharField(source='source_asset.name', read_only=True)
    related_asset_pk = serializers.UUIDField(source='source_asset.pk', read_only=True)

    class Meta:
        model = AssetRelationship
        fields = [
            'id', 'relationship_type', 'description',
            'related_asset_id', 'related_asset_name', 'related_asset_pk',
        ]


class AssetListSerializer(serializers.ModelSerializer):
    aws_account_name = serializers.CharField(
        source='aws_account.account_name', read_only=True, default=''
    )
    category_name = serializers.CharField(
        source='category.name', read_only=True, default=''
    )
    criticality_display = serializers.CharField(
        source='get_criticality_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    asset_type_display = serializers.CharField(
        source='get_asset_type_display', read_only=True
    )
    aws_service_type_display = serializers.CharField(
        source='get_aws_service_type_display', read_only=True
    )

    class Meta:
        model = Asset
        fields = [
            'id', 'asset_id', 'name', 'asset_type', 'asset_type_display',
            'aws_service_type', 'aws_service_type_display',
            'aws_account', 'aws_account_name', 'aws_region',
            'status', 'status_display', 'criticality', 'criticality_display',
            'owner', 'category_name', 'created_at', 'last_seen_at',
        ]


class AssetDetailSerializer(serializers.ModelSerializer):
    aws_account_detail = AWSAccountSerializer(source='aws_account', read_only=True)
    category_detail = AssetCategorySerializer(source='category', read_only=True)
    outgoing_relationships = RelationshipSerializer(many=True, read_only=True)
    incoming_relationships = IncomingRelationshipSerializer(many=True, read_only=True)
    criticality_display = serializers.CharField(
        source='get_criticality_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    asset_type_display = serializers.CharField(
        source='get_asset_type_display', read_only=True
    )
    aws_service_type_display = serializers.CharField(
        source='get_aws_service_type_display', read_only=True
    )
    data_classification_display = serializers.CharField(
        source='get_data_classification_display', read_only=True
    )
    url = serializers.CharField(
        max_length=500, required=False, allow_blank=True,
        validators=[validate_url_scheme],
    )

    class Meta:
        model = Asset
        fields = [
            'id', 'asset_id', 'name', 'category', 'category_detail',
            'asset_type', 'asset_type_display',
            'status', 'status_display',
            'criticality', 'criticality_display',
            'aws_account', 'aws_account_detail', 'aws_region',
            'aws_resource_id', 'aws_resource_arn',
            'aws_service_type', 'aws_service_type_display',
            'metadata', 'ip_addresses', 'dns_names', 'tags',
            'owner', 'description', 'vendor', 'url', 'version',
            'data_classification', 'data_classification_display',
            'gdpr_relevant', 'contains_personal_data',
            'backup_enabled', 'monitoring_enabled',
            'notes', 'discovered_at', 'last_seen_at',
            'is_manually_added', 'created_at', 'updated_at',
            'outgoing_relationships', 'incoming_relationships',
        ]
        read_only_fields = ['id', 'asset_id', 'created_at', 'updated_at']


class AssetRelationshipWriteSerializer(serializers.ModelSerializer):
    source_asset_id_display = serializers.CharField(
        source='source_asset.asset_id', read_only=True
    )
    source_asset_name = serializers.CharField(
        source='source_asset.name', read_only=True
    )
    target_asset_id_display = serializers.CharField(
        source='target_asset.asset_id', read_only=True
    )
    target_asset_name = serializers.CharField(
        source='target_asset.name', read_only=True
    )

    class Meta:
        model = AssetRelationship
        fields = [
            'id', 'source_asset', 'target_asset', 'relationship_type', 'description',
            'source_asset_id_display', 'source_asset_name',
            'target_asset_id_display', 'target_asset_name',
        ]


class BulkUpdateSerializer(serializers.Serializer):
    asset_ids = serializers.ListField(child=serializers.UUIDField())
    owner = serializers.CharField(required=False, allow_blank=True)
    criticality = serializers.ChoiceField(
        choices=Asset.Criticality.choices, required=False
    )
    data_classification = serializers.ChoiceField(
        choices=Asset.DataClassification.choices, required=False
    )


class DiscoveryJobSerializer(serializers.ModelSerializer):
    aws_account_name = serializers.CharField(
        source='aws_account.account_name', read_only=True, default=''
    )
    triggered_by_username = serializers.CharField(
        source='triggered_by.username', read_only=True, default=''
    )
    duration_seconds = serializers.SerializerMethodField()

    class Meta:
        model = DiscoveryJob
        fields = [
            'id', 'aws_account', 'aws_account_name',
            'status', 'started_at', 'completed_at',
            'resources_discovered', 'resources_updated', 'resources_new',
            'error_message', 'triggered_by_username',
            'log_output', 'duration_seconds',
        ]

    def get_duration_seconds(self, obj):
        d = obj.duration
        return d.total_seconds() if d else None
