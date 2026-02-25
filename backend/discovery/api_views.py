from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import DiscoveryJob
from assets.serializers import DiscoveryJobSerializer
from authentication.permissions import IsAdmin
from discovery.tasks import run_discovery


class DiscoveryJobViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DiscoveryJob.objects.select_related('aws_account', 'triggered_by')
    serializer_class = DiscoveryJobSerializer
    ordering = ['-started_at']
    filterset_fields = ['status', 'aws_account']


class TriggerDiscoveryView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        if DiscoveryJob.objects.filter(
            status__in=[DiscoveryJob.Status.PENDING, DiscoveryJob.Status.RUNNING],
        ).exists():
            return Response(
                {'error': 'A discovery job is already in progress.'},
                status=status.HTTP_409_CONFLICT,
            )

        account_id = request.data.get('account_id') or None
        user = request.user if request.user.is_authenticated else None
        job = run_discovery(account_id=account_id, user=user)
        serializer = DiscoveryJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
