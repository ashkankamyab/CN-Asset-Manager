from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count, Q
from django.views.generic import TemplateView

from accounts.models import AWSAccount
from assets.models import Asset, DiscoveryJob


class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'dashboard/index.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        active_assets = Asset.objects.exclude(status=Asset.Status.DECOMMISSIONED)

        ctx['total_assets'] = active_assets.count()
        ctx['total_accounts'] = AWSAccount.objects.filter(is_active=True).count()
        ctx['critical_assets'] = active_assets.filter(criticality=Asset.Criticality.CRITICAL).count()

        last_job = DiscoveryJob.objects.filter(status=DiscoveryJob.Status.COMPLETED).first()
        ctx['last_discovery'] = last_job.completed_at if last_job else None

        # By asset type
        ctx['by_type'] = (
            active_assets.values('asset_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # By AWS service type
        ctx['by_service'] = (
            active_assets.exclude(aws_service_type='')
            .values('aws_service_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # By criticality
        ctx['by_criticality'] = (
            active_assets.values('criticality')
            .annotate(count=Count('id'))
            .order_by('criticality')
        )

        # By status
        ctx['by_status'] = (
            active_assets.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        # Accounts summary
        ctx['accounts'] = AWSAccount.objects.filter(is_active=True).annotate(
            asset_count=Count('assets', filter=Q(assets__status__in=['ACTIVE', 'UNKNOWN']))
        )

        # Recent jobs
        ctx['recent_jobs'] = DiscoveryJob.objects.all()[:10]

        return ctx
