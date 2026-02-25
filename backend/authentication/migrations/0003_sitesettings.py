from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_create_groups_and_superadmin'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('oidc_enabled', models.BooleanField(default=False)),
                ('oidc_client_id', models.CharField(blank=True, default='', max_length=255)),
                ('oidc_client_secret', models.CharField(blank=True, default='', max_length=255)),
                ('oidc_authority_url', models.URLField(blank=True, default='', help_text='Base URL of the OIDC provider', max_length=500)),
                ('oidc_authorization_endpoint', models.URLField(blank=True, default='', max_length=500)),
                ('oidc_token_endpoint', models.URLField(blank=True, default='', max_length=500)),
                ('oidc_user_endpoint', models.URLField(blank=True, default='', max_length=500)),
                ('oidc_jwks_endpoint', models.URLField(blank=True, default='', max_length=500)),
                ('oidc_sign_algo', models.CharField(default='RS256', max_length=10)),
                ('oidc_role_claim', models.CharField(default='roles', help_text='JWT claim that contains user roles', max_length=100)),
                ('oidc_admin_role_value', models.CharField(default='admin', help_text='Claim value that maps to admin role', max_length=100)),
                ('session_timeout_minutes', models.PositiveIntegerField(default=480, help_text='Session timeout in minutes')),
            ],
            options={
                'verbose_name': 'Site Settings',
                'verbose_name_plural': 'Site Settings',
            },
        ),
    ]
