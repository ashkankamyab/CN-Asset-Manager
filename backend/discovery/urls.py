from django.urls import path

from . import views

app_name = 'discovery'

urlpatterns = [
    path('trigger/', views.TriggerDiscoveryView.as_view(), name='trigger'),
    path('jobs/', views.DiscoveryJobListView.as_view(), name='jobs'),
    path('jobs/<uuid:pk>/', views.DiscoveryJobDetailView.as_view(), name='job_detail'),
]
