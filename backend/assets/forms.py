from django import forms

from .models import Asset


class AssetForm(forms.ModelForm):
    class Meta:
        model = Asset
        fields = [
            'name', 'category', 'asset_type', 'status', 'criticality',
            'aws_account', 'aws_region', 'aws_resource_id', 'aws_resource_arn',
            'aws_service_type', 'owner', 'description', 'vendor', 'url', 'version',
            'data_classification', 'gdpr_relevant', 'contains_personal_data',
            'backup_enabled', 'monitoring_enabled', 'notes',
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'notes': forms.Textarea(attrs={'rows': 3}),
        }


class AssetFilterForm(forms.Form):
    search = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'placeholder': 'Search by name, ID, or tags...', 'class': 'form-control',
    }))
    asset_type = forms.ChoiceField(
        required=False, choices=[('', 'All Types')] + list(Asset.AssetType.choices),
    )
    aws_service_type = forms.ChoiceField(
        required=False, choices=[('', 'All Services')] + list(Asset.AWSServiceType.choices),
    )
    criticality = forms.ChoiceField(
        required=False, choices=[('', 'All Criticalities')] + list(Asset.Criticality.choices),
    )
    status = forms.ChoiceField(
        required=False, choices=[('', 'All Statuses')] + list(Asset.Status.choices),
    )
    aws_account = forms.UUIDField(required=False)
    aws_region = forms.CharField(required=False)


class BulkUpdateForm(forms.Form):
    asset_ids = forms.CharField(widget=forms.HiddenInput)
    owner = forms.CharField(required=False)
    criticality = forms.ChoiceField(
        required=False, choices=[('', '-- No Change --')] + list(Asset.Criticality.choices),
    )
    data_classification = forms.ChoiceField(
        required=False,
        choices=[('', '-- No Change --')] + list(Asset.DataClassification.choices),
    )
