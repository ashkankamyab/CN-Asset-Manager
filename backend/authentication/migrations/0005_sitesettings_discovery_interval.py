from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_sitesettings_email_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='discovery_interval',
            field=models.CharField(
                choices=[
                    ('disabled', 'Disabled'),
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('monthly', 'Monthly'),
                ],
                default='disabled',
                help_text='How often to run automatic asset discovery',
                max_length=10,
            ),
        ),
    ]
