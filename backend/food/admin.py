from django.contrib import admin

from .models import (
    Food,
    Order,
    OrderItem
)


# ========================================
# FOOD
# ========================================

@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "name",
        "category",
        "price",
        "rating",
        "reviews"
    )

    search_fields = (
        "name",
        "category"
    )

    list_filter = (
        "category",
    )


# ========================================
# ORDER ITEM
# ========================================

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "order",
        "food",
        "quantity",
        "price"
    )

    search_fields = (
        "order__order_id",
        "food__name"
    )


# ========================================
# ORDER
# ========================================

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):

    list_display = (
        "order_id",
        "customer_name",
        "phone",
        "payment_method",
        "total_amount",
        "status",
        "created_at"
    )

    search_fields = (
        "order_id",
        "customer_name",
        "phone"
    )

    list_filter = (
        "status",
        "payment_method",
        "created_at"
    )

    ordering = (
        "-created_at",
    )

    # Allow changing status directly
    list_editable = (
        "status",
    )