from django.urls import path

from . import views

app_name = 'exports'

urlpatterns = [
    path('csv/', views.ExportAssetsCSVView.as_view(), name='csv'),
    path('excel/', views.ExportAssetsExcelView.as_view(), name='excel'),
]
