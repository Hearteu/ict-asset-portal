from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='portal_index'),
    re_path(r'^api/stats/?$', views.stats_api, name='api_stats'),
    re_path(r'^api/assets/?$', views.assets_api, name='api_assets'),
    re_path(r'^api/assets/(?P<asset_id>\d+)/?$', views.asset_detail_api, name='api_asset_detail'),
    re_path(r'^api/assets/export/csv/?$', views.export_csv, name='api_export_csv'),
    re_path(r'^api/jobs/?$', views.jobs_api, name='api_jobs'),
    re_path(r'^api/jobs/(?P<job_id>\d+)/?$', views.job_detail_api, name='api_job_detail'),
]
