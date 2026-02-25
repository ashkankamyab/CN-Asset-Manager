from django.contrib import admin

from .models import Asset, AssetCategory, AssetRelationship, DiscoveryJob


@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'color']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'name', 'asset_type', 'aws_service_type', 'status', 'criticality', 'aws_account']
    list_filter = ['asset_type', 'status', 'criticality', 'aws_service_type', 'aws_account']
    search_fields = ['name', 'asset_id', 'aws_resource_id', 'aws_resource_arn']
    readonly_fields = ['asset_id', 'created_at', 'updated_at']


@admin.register(AssetRelationship)
class AssetRelationshipAdmin(admin.ModelAdmin):
    list_display = ['source_asset', 'relationship_type', 'target_asset']


@admin.register(DiscoveryJob)
class DiscoveryJobAdmin(admin.ModelAdmin):
    list_display = ['id', 'aws_account', 'status', 'started_at', 'completed_at', 'resources_discovered']
    list_filter = ['status']
