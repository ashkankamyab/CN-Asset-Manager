from rest_framework import serializers

from .models import AWSAccount


class AWSAccountSerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(read_only=True, default=0)
    account_type_display = serializers.CharField(
        source='get_account_type_display', read_only=True
    )
    environment_display = serializers.CharField(
        source='get_environment_display', read_only=True
    )
    aws_secret_access_key = serializers.CharField(
        write_only=True, required=False, allow_blank=True, default=''
    )
    management_account_name = serializers.CharField(
        source='management_account.account_name', read_only=True, default=''
    )

    class Meta:
        model = AWSAccount
        fields = [
            'id', 'account_id', 'account_name', 'account_type',
            'account_type_display', 'environment', 'environment_display',
            'organization_role_name', 'is_active', 'last_discovery_at',
            'created_at', 'updated_at', 'asset_count',
            'aws_access_key_id', 'aws_secret_access_key',
            'management_account', 'management_account_name',
            'discovery_regions',
            'estimated_monthly_cost', 'previous_month_cost', 'cost_updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_account_id(self, value):
        if len(value) != 12 or not value.isdigit():
            raise serializers.ValidationError(
                'Account ID must be exactly 12 digits.'
            )
        return value

    def validate(self, attrs):
        account_type = attrs.get('account_type', getattr(self.instance, 'account_type', None))
        management_account = attrs.get('management_account', getattr(self.instance, 'management_account', None))

        if account_type == AWSAccount.AccountType.MANAGEMENT and management_account is not None:
            raise serializers.ValidationError({
                'management_account': 'A management account cannot have a parent management account.',
            })

        return attrs
