from django.contrib.auth.models import User
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(pre_delete, sender=User)
def prevent_superadmin_deletion(sender, instance, **kwargs):
    try:
        if instance.profile.is_superadmin:
            raise PermissionError('Cannot delete the superadmin user.')
    except UserProfile.DoesNotExist:
        pass
