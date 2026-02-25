import boto3
from botocore.config import Config
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.views.generic import CreateView, ListView, UpdateView, View

from authentication.mixins import AdminRequiredMixin

from .forms import AWSAccountForm
from .models import AWSAccount


class AccountListView(LoginRequiredMixin, ListView):
    model = AWSAccount
    template_name = 'accounts/list.html'
    context_object_name = 'accounts'


class AccountCreateView(AdminRequiredMixin, CreateView):
    model = AWSAccount
    form_class = AWSAccountForm
    template_name = 'accounts/form.html'
    success_url = reverse_lazy('accounts:list')

    def form_valid(self, form):
        messages.success(self.request, f'Account "{form.instance.account_name}" created.')
        return super().form_valid(form)


class AccountUpdateView(AdminRequiredMixin, UpdateView):
    model = AWSAccount
    form_class = AWSAccountForm
    template_name = 'accounts/form.html'
    success_url = reverse_lazy('accounts:list')

    def form_valid(self, form):
        messages.success(self.request, f'Account "{form.instance.account_name}" updated.')
        return super().form_valid(form)


class AccountTestConnectionView(LoginRequiredMixin, View):
    def post(self, request, pk):
        account = AWSAccount.objects.get(pk=pk)
        try:
            session = boto3.Session()
            if account.account_type == AWSAccount.AccountType.MEMBER:
                sts = session.client('sts', config=Config(connect_timeout=5, read_timeout=10))
                role_arn = f"arn:aws:iam::{account.account_id}:role/{account.organization_role_name}"
                sts.assume_role(
                    RoleArn=role_arn,
                    RoleSessionName='TISAXConnectionTest',
                    DurationSeconds=900,
                )
            else:
                sts = session.client('sts', config=Config(connect_timeout=5, read_timeout=10))
                sts.get_caller_identity()
            return JsonResponse({'success': True, 'message': 'Connection successful!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})
