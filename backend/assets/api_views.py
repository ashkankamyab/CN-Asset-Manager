from django.db.models import Q
from django_filters import rest_framework as django_filters
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import AWSAccount
from .models import Asset, AssetCategory, AssetRelationship
from .serializers import (
    AssetListSerializer,
    AssetDetailSerializer,
    AssetCategorySerializer,
    BulkUpdateSerializer,
    AssetRelationshipWriteSerializer,
)


class AssetFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    asset_type = django_filters.ChoiceFilter(choices=Asset.AssetType.choices)
    aws_service_type = django_filters.ChoiceFilter(choices=Asset.AWSServiceType.choices)
    criticality = django_filters.ChoiceFilter(choices=Asset.Criticality.choices)
    status = django_filters.ChoiceFilter(choices=[
        c for c in Asset.Status.choices if c[0] != 'DECOMMISSIONED'
    ])
    aws_account = django_filters.UUIDFilter(field_name='aws_account_id')
    aws_region = django_filters.CharFilter(field_name='aws_region')

    exclude_asset_type = django_filters.CharFilter(method='filter_exclude_asset_type')
    exclude_aws_service_type = django_filters.CharFilter(method='filter_exclude_aws_service_type')
    exclude_criticality = django_filters.CharFilter(method='filter_exclude_criticality')
    exclude_status = django_filters.CharFilter(method='filter_exclude_status')
    exclude_aws_account = django_filters.CharFilter(method='filter_exclude_aws_account')
    exclude_aws_region = django_filters.CharFilter(method='filter_exclude_aws_region')

    class Meta:
        model = Asset
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value)
            | Q(asset_id__icontains=value)
            | Q(aws_resource_id__icontains=value)
            | Q(aws_resource_arn__icontains=value)
        )

    def _exclude_csv(self, queryset, field, value):
        values = [v.strip() for v in value.split(',') if v.strip()]
        if values:
            return queryset.exclude(**{f'{field}__in': values})
        return queryset

    def filter_exclude_asset_type(self, queryset, name, value):
        return self._exclude_csv(queryset, 'asset_type', value)

    def filter_exclude_aws_service_type(self, queryset, name, value):
        return self._exclude_csv(queryset, 'aws_service_type', value)

    def filter_exclude_criticality(self, queryset, name, value):
        return self._exclude_csv(queryset, 'criticality', value)

    def filter_exclude_status(self, queryset, name, value):
        return self._exclude_csv(queryset, 'status', value)

    def filter_exclude_aws_account(self, queryset, name, value):
        return self._exclude_csv(queryset, 'aws_account_id', value)

    def filter_exclude_aws_region(self, queryset, name, value):
        return self._exclude_csv(queryset, 'aws_region', value)


class AssetViewSet(viewsets.ModelViewSet):
    filterset_class = AssetFilter
    ordering_fields = [
        'asset_id', 'name', 'criticality', 'status',
        'aws_service_type', 'created_at', 'last_seen_at',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Asset.objects
            .exclude(status=Asset.Status.DECOMMISSIONED)
            .select_related('aws_account', 'category')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return AssetListSerializer
        return AssetDetailSerializer

    def perform_create(self, serializer):
        serializer.save(is_manually_added=True)

    @action(detail=True, methods=['post'])
    def decommission(self, request, pk=None):
        asset = self.get_object()
        asset.status = Asset.Status.DECOMMISSIONED
        asset.save(update_fields=['status'])
        return Response({'detail': f'Asset "{asset.name}" decommissioned.'})

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        serializer = BulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ids = serializer.validated_data['asset_ids']
        assets = Asset.objects.filter(pk__in=ids)
        count = assets.count()

        if 'owner' in serializer.validated_data and serializer.validated_data['owner']:
            assets.update(owner=serializer.validated_data['owner'])
        if 'criticality' in serializer.validated_data:
            assets.update(criticality=serializer.validated_data['criticality'])
        if 'data_classification' in serializer.validated_data:
            assets.update(
                data_classification=serializer.validated_data['data_classification']
            )

        return Response({'detail': f'Updated {count} assets.'})

    @action(detail=False, methods=['post'], url_path='bulk_add_dependency')
    def bulk_add_dependency(self, request):
        asset_ids = request.data.get('asset_ids', [])
        target_asset_id = request.data.get('target_asset')
        relationship_type = request.data.get('relationship_type', 'DEPENDS_ON')

        if not asset_ids or not target_asset_id:
            return Response(
                {'detail': 'asset_ids and target_asset are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_types = [c[0] for c in AssetRelationship.RelationshipType.choices]
        if relationship_type not in valid_types:
            return Response(
                {'detail': f'Invalid relationship_type. Must be one of: {valid_types}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target = Asset.objects.get(pk=target_asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'detail': 'Target asset not found.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = 0
        for aid in asset_ids:
            if str(aid) == str(target_asset_id):
                continue
            _, was_created = AssetRelationship.objects.get_or_create(
                source_asset_id=aid,
                target_asset_id=target_asset_id,
                relationship_type=relationship_type,
            )
            if was_created:
                created += 1

        return Response({'detail': f'Added {created} dependencies to "{target.name}".'})

    @action(detail=False, methods=['get'])
    def filter_options(self, request):
        return Response({
            'asset_types': [
                {'value': c[0], 'label': c[1]} for c in Asset.AssetType.choices
            ],
            'aws_service_types': [
                {'value': c[0], 'label': c[1]} for c in Asset.AWSServiceType.choices
            ],
            'criticalities': [
                {'value': c[0], 'label': c[1]} for c in Asset.Criticality.choices
            ],
            'statuses': [
                {'value': c[0], 'label': c[1]}
                for c in Asset.Status.choices
                if c[0] != 'DECOMMISSIONED'
            ],
            'data_classifications': [
                {'value': c[0], 'label': c[1]}
                for c in Asset.DataClassification.choices
            ],
            'aws_accounts': [
                {'value': str(a.id), 'label': a.account_name}
                for a in AWSAccount.objects.filter(is_active=True)
            ],
            'aws_regions': list(
                Asset.objects
                .exclude(aws_region='')
                .values_list('aws_region', flat=True)
                .distinct()
                .order_by('aws_region')
            ),
        })


    @action(detail=False, methods=['get'])
    def autocomplete(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        qs = (
            Asset.objects
            .exclude(status=Asset.Status.DECOMMISSIONED)
            .filter(
                Q(name__icontains=q)
                | Q(asset_id__icontains=q)
                | Q(ip_addresses__icontains=q)
                | Q(dns_names__icontains=q)
            )[:15]
        )
        results = [
            {
                'id': str(a.id),
                'asset_id': a.asset_id,
                'name': a.name,
                'aws_service_type': a.aws_service_type,
            }
            for a in qs
        ]
        return Response(results)


class AssetRelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = AssetRelationshipWriteSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return AssetRelationship.objects.select_related(
            'source_asset', 'target_asset'
        )


class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer
    search_fields = ['name']
    ordering = ['name']
