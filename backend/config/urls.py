from django.contrib import admin
from django.urls import include, path

from authentication.oidc import OIDCLoginView, OIDCCallbackView

urlpatterns = [
    path('api/', include('config.api_urls')),
    path('admin/', admin.site.urls),
    path('', include('dashboard.urls')),
    path('accounts/', include('accounts.urls')),
    path('discovery/', include('discovery.urls')),
    path('assets/', include('assets.urls')),
    path('assets/export/', include('exports.urls')),
    # OIDC — always registered, views check SiteSettings.oidc_enabled at runtime
    path('oidc/authenticate/', OIDCLoginView.as_view(), name='oidc_authentication_init'),
    path('oidc/callback/', OIDCCallbackView.as_view(), name='oidc_authentication_callback'),
]
