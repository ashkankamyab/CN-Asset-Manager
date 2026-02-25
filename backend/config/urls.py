from django.conf import settings
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('api/', include('config.api_urls')),
    path('admin/', admin.site.urls),
    path('', include('dashboard.urls')),
    path('accounts/', include('accounts.urls')),
    path('discovery/', include('discovery.urls')),
    path('assets/', include('assets.urls')),
    path('assets/export/', include('exports.urls')),
]

if getattr(settings, 'OIDC_ENABLED', False):
    urlpatterns += [
        path('oidc/', include('mozilla_django_oidc.urls')),
    ]
