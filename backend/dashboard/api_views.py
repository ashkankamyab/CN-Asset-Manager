from django.db.models import Count, Q, Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import AWSAccount
from assets.models import Asset, DiscoveryJob


class DashboardView(APIView):
    def get(self, request):
        active_assets = Asset.objects.exclude(status=Asset.Status.DECOMMISSIONED)

        total_assets = active_assets.count()
        total_accounts = AWSAccount.objects.filter(is_active=True).count()
        critical_assets = active_assets.filter(
            criticality=Asset.Criticality.CRITICAL
        ).count()

        last_job = DiscoveryJob.objects.filter(
            status=DiscoveryJob.Status.COMPLETED
        ).first()
        last_discovery = last_job.completed_at.isoformat() if last_job else None

        by_type = list(
            active_assets.values('asset_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        by_service = list(
            active_assets.exclude(aws_service_type='')
            .values('aws_service_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        by_criticality = list(
            active_assets.values('criticality')
            .annotate(count=Count('id'))
            .order_by('criticality')
        )

        by_status = list(
            active_assets.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        accounts = list(
            AWSAccount.objects.filter(is_active=True)
            .annotate(
                asset_count=Count(
                    'assets',
                    filter=Q(assets__status__in=['ACTIVE', 'UNKNOWN']),
                )
            )
            .values(
                'id', 'account_name', 'account_id', 'environment',
                'last_discovery_at', 'asset_count',
                'estimated_monthly_cost', 'previous_month_cost', 'cost_updated_at',
            )
        )
        # Convert UUID/Decimal to JSON-friendly types
        for acct in accounts:
            acct['id'] = str(acct['id'])
            for field in ('estimated_monthly_cost', 'previous_month_cost'):
                val = acct.get(field)
                acct[field] = str(val) if val is not None else None
            if acct.get('cost_updated_at'):
                acct['cost_updated_at'] = acct['cost_updated_at'].isoformat()

        total_monthly_cost = (
            AWSAccount.objects.filter(is_active=True)
            .aggregate(total=Sum('estimated_monthly_cost'))['total']
        )
        total_previous_month_cost = (
            AWSAccount.objects.filter(is_active=True)
            .aggregate(total=Sum('previous_month_cost'))['total']
        )

        recent_jobs_qs = (
            DiscoveryJob.objects
            .select_related('aws_account', 'triggered_by')
            .all()[:10]
        )
        recent_jobs = []
        for job in recent_jobs_qs:
            recent_jobs.append({
                'id': str(job.id),
                'aws_account_name': job.aws_account.account_name if job.aws_account else '',
                'status': job.status,
                'resources_discovered': job.resources_discovered,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'duration_seconds': job.duration.total_seconds() if job.duration else None,
            })

        return Response({
            'total_assets': total_assets,
            'total_accounts': total_accounts,
            'critical_assets': critical_assets,
            'last_discovery': last_discovery,
            'total_monthly_cost': str(total_monthly_cost) if total_monthly_cost else None,
            'total_previous_month_cost': str(total_previous_month_cost) if total_previous_month_cost else None,
            'by_type': by_type,
            'by_service': by_service,
            'by_criticality': by_criticality,
            'by_status': by_status,
            'accounts': accounts,
            'recent_jobs': recent_jobs,
        })
