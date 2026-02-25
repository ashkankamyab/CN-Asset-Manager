from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import CreateView, DetailView, ListView, UpdateView, View

from authentication.mixins import AdminRequiredMixin

from .forms import AssetFilterForm, AssetForm, BulkUpdateForm
from .models import Asset


class AssetListView(LoginRequiredMixin, ListView):
    model = Asset
    template_name = 'assets/list.html'
    context_object_name = 'assets'
    paginate_by = 50

    def get_queryset(self):
        qs = Asset.objects.exclude(status=Asset.Status.DECOMMISSIONED).select_related('aws_account', 'category')
        form = AssetFilterForm(self.request.GET)
        if form.is_valid():
            search = form.cleaned_data.get('search')
            if search:
                qs = qs.filter(
                    Q(name__icontains=search)
                    | Q(asset_id__icontains=search)
                    | Q(aws_resource_id__icontains=search)
                    | Q(aws_resource_arn__icontains=search)
                )
            if form.cleaned_data.get('asset_type'):
                qs = qs.filter(asset_type=form.cleaned_data['asset_type'])
            if form.cleaned_data.get('aws_service_type'):
                qs = qs.filter(aws_service_type=form.cleaned_data['aws_service_type'])
            if form.cleaned_data.get('criticality'):
                qs = qs.filter(criticality=form.cleaned_data['criticality'])
            if form.cleaned_data.get('status'):
                qs = qs.filter(status=form.cleaned_data['status'])
            if form.cleaned_data.get('aws_account'):
                qs = qs.filter(aws_account_id=form.cleaned_data['aws_account'])
            if form.cleaned_data.get('aws_region'):
                qs = qs.filter(aws_region=form.cleaned_data['aws_region'])

        sort = self.request.GET.get('sort', '-created_at')
        allowed_sorts = [
            'asset_id', '-asset_id', 'name', '-name', 'criticality', '-criticality',
            'status', '-status', 'aws_service_type', '-aws_service_type',
            'created_at', '-created_at', 'last_seen_at', '-last_seen_at',
        ]
        if sort in allowed_sorts:
            qs = qs.order_by(sort)
        return qs

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['filter_form'] = AssetFilterForm(self.request.GET)
        ctx['bulk_form'] = BulkUpdateForm()
        ctx['current_sort'] = self.request.GET.get('sort', '-created_at')
        from accounts.models import AWSAccount
        ctx['aws_accounts'] = AWSAccount.objects.filter(is_active=True)
        ctx['regions'] = (
            Asset.objects.exclude(aws_region='')
            .values_list('aws_region', flat=True)
            .distinct()
            .order_by('aws_region')
        )
        return ctx


class AssetDetailView(LoginRequiredMixin, DetailView):
    model = Asset
    template_name = 'assets/detail.html'
    context_object_name = 'asset'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        asset = self.object
        ctx['outgoing'] = asset.outgoing_relationships.select_related('target_asset').all()
        ctx['incoming'] = asset.incoming_relationships.select_related('source_asset').all()
        return ctx


class AssetCreateView(AdminRequiredMixin, CreateView):
    model = Asset
    form_class = AssetForm
    template_name = 'assets/form.html'
    success_url = reverse_lazy('assets:list')

    def form_valid(self, form):
        form.instance.is_manually_added = True
        messages.success(self.request, f'Asset "{form.instance.name}" created.')
        return super().form_valid(form)


class AssetUpdateView(AdminRequiredMixin, UpdateView):
    model = Asset
    form_class = AssetForm
    template_name = 'assets/form.html'

    def get_success_url(self):
        return reverse_lazy('assets:detail', kwargs={'pk': self.object.pk})

    def form_valid(self, form):
        messages.success(self.request, f'Asset "{form.instance.name}" updated.')
        return super().form_valid(form)


class AssetDeleteView(AdminRequiredMixin, View):
    def post(self, request, pk):
        asset = Asset.objects.get(pk=pk)
        asset.status = Asset.Status.DECOMMISSIONED
        asset.save(update_fields=['status'])
        messages.success(request, f'Asset "{asset.name}" decommissioned.')
        return redirect('assets:list')


class AssetBulkUpdateView(AdminRequiredMixin, View):
    def post(self, request):
        form = BulkUpdateForm(request.POST)
        if form.is_valid():
            ids = [i.strip() for i in form.cleaned_data['asset_ids'].split(',') if i.strip()]
            assets = Asset.objects.filter(pk__in=ids)
            update_fields = []
            if form.cleaned_data.get('owner'):
                assets.update(owner=form.cleaned_data['owner'])
            if form.cleaned_data.get('criticality'):
                assets.update(criticality=form.cleaned_data['criticality'])
            if form.cleaned_data.get('data_classification'):
                assets.update(data_classification=form.cleaned_data['data_classification'])
            messages.success(request, f'Updated {assets.count()} assets.')
        return redirect('assets:list')
