from django.contrib import admin

from .models import AWSAccount


@admin.register(AWSAccount)
class AWSAccountAdmin(admin.ModelAdmin):
    list_display = ['account_name', 'account_id', 'account_type', 'environment', 'is_active', 'management_account', 'last_discovery_at']
    list_filter = ['account_type', 'environment', 'is_active']
    search_fields = ['account_name', 'account_id']
    raw_id_fields = ['management_account']
