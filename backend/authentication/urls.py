from django.urls import path

from . import api_views

urlpatterns = [
    path('csrf/', api_views.CSRFView.as_view(), name='auth-csrf'),
    path('login/', api_views.LoginView.as_view(), name='auth-login'),
    path('me/', api_views.CurrentUserView.as_view(), name='auth-me'),
    path('logout/', api_views.LogoutView.as_view(), name='auth-logout'),
    path('config/', api_views.ConfigView.as_view(), name='auth-config'),
    path('forgot-password/', api_views.ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('reset-password/', api_views.ResetPasswordView.as_view(), name='auth-reset-password'),
]
