from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_management_account_rework'),
    ]

    operations = [
        migrations.AddField(
            model_name='awsaccount',
            name='estimated_monthly_cost',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Current month estimated cost (USD)',
            ),
        ),
        migrations.AddField(
            model_name='awsaccount',
            name='previous_month_cost',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
                help_text='Previous month total cost (USD)',
            ),
        ),
        migrations.AddField(
            model_name='awsaccount',
            name='cost_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
