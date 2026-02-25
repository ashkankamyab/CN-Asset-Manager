from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fields = ('role', 'is_superadmin', 'auth_source')
    readonly_fields = ('is_superadmin',)


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]

    def has_delete_permission(self, request, obj=None):
        if obj is not None:
            try:
                if obj.profile.is_superadmin:
                    return False
            except UserProfile.DoesNotExist:
                pass
        return super().has_delete_permission(request, obj)

    def delete_model(self, request, obj):
        try:
            if obj.profile.is_superadmin:
                messages.error(request, 'Cannot delete the superadmin user.')
                return
        except UserProfile.DoesNotExist:
            pass
        super().delete_model(request, obj)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
