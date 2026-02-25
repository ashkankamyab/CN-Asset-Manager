from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect
from django.views.generic import DetailView, ListView, View

from assets.models import DiscoveryJob
from authentication.mixins import AdminRequiredMixin
from discovery.tasks import run_discovery


class TriggerDiscoveryView(AdminRequiredMixin, View):
    def post(self, request):
        account_id = request.POST.get('account_id') or None
        user = request.user if request.user.is_authenticated else None
        job = run_discovery(account_id=account_id, user=user)
        messages.info(request, f'Discovery job {str(job.id)[:8]} started. Refresh to see progress.')
        return redirect('discovery:jobs')


class DiscoveryJobListView(LoginRequiredMixin, ListView):
    model = DiscoveryJob
    template_name = 'discovery/jobs.html'
    context_object_name = 'jobs'
    paginate_by = 25

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        from accounts.models import AWSAccount
        ctx['accounts'] = AWSAccount.objects.filter(is_active=True)
        return ctx


class DiscoveryJobDetailView(LoginRequiredMixin, DetailView):
    model = DiscoveryJob
    template_name = 'discovery/job_detail.html'
    context_object_name = 'job'
