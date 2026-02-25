import boto3
from botocore.config import Config
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AWSAccount
from .serializers import AWSAccountSerializer


def _build_session(account):
    """Build a boto3 session from a management account's stored credentials.

    Falls back to default credentials if the account has no keys configured.
    """
    if account.aws_access_key_id and account.aws_secret_access_key:
        return boto3.Session(
            aws_access_key_id=account.aws_access_key_id,
            aws_secret_access_key=account.aws_secret_access_key,
        )
    return boto3.Session()


class AWSAccountViewSet(viewsets.ModelViewSet):
    serializer_class = AWSAccountSerializer
    search_fields = ['account_name', 'account_id']
    ordering_fields = ['account_name', 'account_id', 'environment', 'created_at']
    ordering = ['account_name']

    def get_queryset(self):
        return AWSAccount.objects.annotate(
            asset_count=Count(
                'assets',
                filter=Q(assets__status__in=['ACTIVE', 'UNKNOWN']),
            )
        )

    @action(detail=False, methods=['post'])
    def refresh_costs(self, request):
        from discovery.celery_tasks import refresh_costs_task

        refresh_costs_task.delay()
        return Response(
            {'status': 'Cost refresh queued.'},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        account = self.get_object()
        try:
            if account.account_type == AWSAccount.AccountType.MEMBER:
                mgmt = account.management_account
                session = _build_session(mgmt) if mgmt else boto3.Session()
                sts = session.client(
                    'sts', config=Config(connect_timeout=5, read_timeout=10)
                )
                role_arn = (
                    f"arn:aws:iam::{account.account_id}"
                    f":role/{account.organization_role_name}"
                )
                sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName='TISAXConnectionTest',
                    DurationSeconds=900,
                )
            else:
                session = _build_session(account)
                sts = session.client(
                    'sts', config=Config(connect_timeout=5, read_timeout=10)
                )
                sts.get_caller_identity()
            return Response({'success': True, 'message': 'Connection successful!'})
        except Exception as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
