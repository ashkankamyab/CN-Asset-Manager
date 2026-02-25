from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserProfile


def _get_role(user):
    try:
        return user.profile.role
    except (UserProfile.DoesNotExist, AttributeError):
        return UserProfile.Role.READONLY


class IsAdminOrReadOnly(BasePermission):
    """
    Authenticated users with admin/superadmin role get full access.
    Authenticated readonly users only get safe (GET/HEAD/OPTIONS) methods.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        role = _get_role(request.user)
        return role in (UserProfile.Role.SUPERADMIN, UserProfile.Role.ADMIN)


class IsAdmin(BasePermission):
    """
    Only authenticated users with admin or superadmin role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = _get_role(request.user)
        return role in (UserProfile.Role.SUPERADMIN, UserProfile.Role.ADMIN)
