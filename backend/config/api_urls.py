from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.api_views import AWSAccountViewSet
from assets.api_views import AssetViewSet, AssetCategoryViewSet, AssetRelationshipViewSet
from dashboard.api_views import DashboardView
from discovery.api_views import DiscoveryJobViewSet, TriggerDiscoveryView

router = DefaultRouter()
router.register(r'accounts', AWSAccountViewSet, basename='account')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'categories', AssetCategoryViewSet, basename='category')
router.register(r'relationships', AssetRelationshipViewSet, basename='relationship')
router.register(r'discovery/jobs', DiscoveryJobViewSet, basename='discovery-job')

urlpatterns = [
    path('auth/', include('authentication.urls')),
    path('admin/', include('authentication.admin_urls')),
    path('dashboard/', DashboardView.as_view(), name='api-dashboard'),
    path('discovery/trigger/', TriggerDiscoveryView.as_view(), name='api-discovery-trigger'),
    path('', include(router.urls)),
]
