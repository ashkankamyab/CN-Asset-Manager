from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_awsaccount_cost_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='awsaccount',
            name='discovery_regions',
            field=models.JSONField(
                blank=True, default=list,
                help_text='Regions to scan during discovery. Empty = global default.',
            ),
        ),
    ]
