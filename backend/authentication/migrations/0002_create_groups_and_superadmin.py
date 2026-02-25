from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_groups_and_superadmin(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('authentication', 'UserProfile')

    # Create groups
    Group.objects.get_or_create(name='admin')
    Group.objects.get_or_create(name='readonly')

    # Create default superadmin user
    if not User.objects.filter(username='superadmin').exists():
        user = User(
            username='superadmin',
            email='admin@example.com',
            password=make_password('changeme'),
            is_staff=True,
            is_superuser=True,
        )
        user.save()
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': 'superadmin',
                'is_superadmin': True,
                'auth_source': 'local',
            },
        )


def reverse(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=['admin', 'readonly']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_groups_and_superadmin, reverse),
    ]
