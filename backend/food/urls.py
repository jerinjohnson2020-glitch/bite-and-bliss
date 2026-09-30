from django.urls import path

from .views import (
    food_list,
    create_order,
    initiate_payu_payment,
    my_orders,
    register_user,
    login_user,
    food_sales_analytics,
    dashboard_summary,
    admin_orders,
    favorites,
    customer_profile,
    payu_response,
)


urlpatterns = [

    path(
        "foods/",
        food_list
    ),

    path(
        "orders/",
        create_order
    ),

    path(
        "payu/initiate/",
        initiate_payu_payment
    ),

    path(
        "my-orders/",
        my_orders
    ),

    path(
        "register/",
        register_user
    ),

    path(
        "login/",
        login_user
    ),

    path(
        "analytics/food-sales/",
        food_sales_analytics
    ),

    path(
        "analytics/summary/",
        dashboard_summary
    ),

    path(
        "admin/orders/",
        admin_orders
    ),

    path("favorites/", 
         favorites),

    path("profile/", customer_profile),

    path("payu/response/", payu_response,
         name="payu_response"),
]