from django import forms

from .models import AWSAccount


class AWSAccountForm(forms.ModelForm):
    class Meta:
        model = AWSAccount
        fields = [
            'account_id', 'account_name', 'account_type', 'environment',
            'organization_role_name', 'is_active',
            'aws_access_key_id', 'aws_secret_access_key', 'management_account',
        ]
        widgets = {
            'account_id': forms.TextInput(attrs={'placeholder': '123456789012', 'maxlength': 12}),
            'account_name': forms.TextInput(attrs={'placeholder': 'my-aws-account'}),
        }

    def clean_account_id(self):
        account_id = self.cleaned_data['account_id']
        if not account_id.isdigit() or len(account_id) != 12:
            raise forms.ValidationError('AWS Account ID must be exactly 12 digits.')
        return account_id
