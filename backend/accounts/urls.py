from django.urls import path

from . import views

app_name = 'accounts'

urlpatterns = [
    path('', views.AccountListView.as_view(), name='list'),
    path('add/', views.AccountCreateView.as_view(), name='add'),
    path('<uuid:pk>/edit/', views.AccountUpdateView.as_view(), name='edit'),
    path('<uuid:pk>/test/', views.AccountTestConnectionView.as_view(), name='test'),
]
