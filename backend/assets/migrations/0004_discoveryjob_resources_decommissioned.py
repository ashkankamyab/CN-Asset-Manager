from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assets', '0003_asset_department'),
    ]

    operations = [
        migrations.AddField(
            model_name='discoveryjob',
            name='resources_decommissioned',
            field=models.IntegerField(default=0),
        ),
    ]
