from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_sitesettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='email_backend',
            field=models.CharField(
                choices=[('console', 'Console (development)'), ('smtp', 'SMTP'), ('ses', 'Amazon SES'), ('google', 'Google API (Gmail)')],
                default='console', max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='email_from_address',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='email_from_name',
            field=models.CharField(blank=True, default='Cloud Native Asset Manager', max_length=100),
        ),
        # SMTP
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_host',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_port',
            field=models.PositiveIntegerField(default=587),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_username',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_password',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_use_tls',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='smtp_use_ssl',
            field=models.BooleanField(default=False),
        ),
        # Amazon SES
        migrations.AddField(
            model_name='sitesettings',
            name='ses_aws_region',
            field=models.CharField(blank=True, default='us-east-1', max_length=30),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='ses_aws_access_key_id',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='ses_aws_secret_access_key',
            field=models.CharField(blank=True, default='', max_length=256),
        ),
        # Google API
        migrations.AddField(
            model_name='sitesettings',
            name='google_service_account_json',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='google_delegated_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
    ]
