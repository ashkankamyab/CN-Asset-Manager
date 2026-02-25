from .models import UserProfile


def user_role(request):
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return {'is_admin_user': False, 'is_readonly_user': True}
    try:
        profile = request.user.profile
        return {
            'is_admin_user': profile.is_admin_or_superadmin,
            'is_readonly_user': profile.role == UserProfile.Role.READONLY,
        }
    except UserProfile.DoesNotExist:
        return {'is_admin_user': False, 'is_readonly_user': True}
