import django.db.models.deletion
from django.db import migrations, models


def rename_root_to_management(apps, schema_editor):
    AWSAccount = apps.get_model('accounts', 'AWSAccount')
    AWSAccount.objects.filter(account_type='ROOT').update(account_type='MANAGEMENT')


def rename_management_to_root(apps, schema_editor):
    AWSAccount = apps.get_model('accounts', 'AWSAccount')
    AWSAccount.objects.filter(account_type='MANAGEMENT').update(account_type='ROOT')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        # 1. Add new fields
        migrations.AddField(
            model_name='awsaccount',
            name='aws_access_key_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='AWS access key ID (for management accounts)',
                max_length=128,
            ),
        ),
        migrations.AddField(
            model_name='awsaccount',
            name='aws_secret_access_key',
            field=models.CharField(
                blank=True,
                default='',
                help_text='AWS secret access key (for management accounts)',
                max_length=128,
            ),
        ),
        migrations.AddField(
            model_name='awsaccount',
            name='management_account',
            field=models.ForeignKey(
                blank=True,
                help_text='Management account used to assume role into this member account',
                limit_choices_to={'account_type': 'MANAGEMENT'},
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='member_accounts',
                to='accounts.awsaccount',
            ),
        ),
        # 2. Rename ROOT → MANAGEMENT in account_type choices
        migrations.AlterField(
            model_name='awsaccount',
            name='account_type',
            field=models.CharField(
                choices=[('MANAGEMENT', 'Management Account'), ('MEMBER', 'Member Account')],
                default='MEMBER',
                max_length=10,
            ),
        ),
        # 3. Data migration: rename existing ROOT rows
        migrations.RunPython(rename_root_to_management, rename_management_to_root),
    ]
