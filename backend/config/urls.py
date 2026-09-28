from django.contrib import admin
from django.urls import path, include

from food.views import (
    home,
    admin_dashboard,
    admin_logout
)


urlpatterns = [

    path(
        '',
        home,
        name='home'
    ),

    path(
        'admin/',
        admin.site.urls
    ),

    path(
        'admin-dashboard/',
        admin_dashboard,
        name='admin_dashboard'
    ),

    path(
        'admin-logout/',
        admin_logout,
        name='admin_logout'
    ),

    path(
        'api/',
        include('food.urls')
    ),
]