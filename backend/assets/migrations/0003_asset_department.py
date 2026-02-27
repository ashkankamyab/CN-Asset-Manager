from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assets', '0002_url_to_charfield'),
    ]

    operations = [
        migrations.AddField(
            model_name='asset',
            name='department',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
