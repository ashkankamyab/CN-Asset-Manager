from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin

from .models import UserProfile


class AdminRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    """Requires login + admin or superadmin role."""

    def test_func(self):
        try:
            return self.request.user.profile.is_admin_or_superadmin
        except (UserProfile.DoesNotExist, AttributeError):
            return False
