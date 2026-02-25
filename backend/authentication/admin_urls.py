from django.urls import path

from . import admin_api_views

urlpatterns = [
    path('users/', admin_api_views.AdminUserListCreateView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', admin_api_views.AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('settings/', admin_api_views.SiteSettingsView.as_view(), name='admin-settings'),
    path('settings/test-email/', admin_api_views.TestEmailView.as_view(), name='admin-test-email'),
]
