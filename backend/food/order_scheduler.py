from datetime import timedelta

from django.utils import timezone

from .models import Order


def update_order_statuses():

    now = timezone.now()

    orders = Order.objects.filter(
        status__in=[
            "Pending",
            "Confirmed",
            "Preparing",
            "Out for Delivery",
        ]
    )

    for order in orders:

        elapsed = now - order.created_at

        # ---------------------------------------------
        # Pending → Confirmed
        # After 30 seconds
        # ---------------------------------------------

        if (
            order.status == "Pending"
            and elapsed >= timedelta(seconds=30)
        ):

            order.status = "Confirmed"

            order.save(
                update_fields=["status"]
            )

            continue


        # ---------------------------------------------
        # Confirmed → Preparing
        # After 90 seconds total
        # ---------------------------------------------

        if (
            order.status == "Confirmed"
            and elapsed >= timedelta(seconds=90)
        ):

            order.status = "Preparing"

            order.save(
                update_fields=["status"]
            )

            continue


        # ---------------------------------------------
        # Preparing → Out for Delivery
        # After 210 seconds total
        # ---------------------------------------------

        if (
            order.status == "Preparing"
            and elapsed >= timedelta(seconds=210)
        ):

            order.status = "Out for Delivery"

            order.save(
                update_fields=["status"]
            )

            continue


        # ---------------------------------------------
        # Out for Delivery → Delivered
        # After 390 seconds total
        # ---------------------------------------------

        if (
            order.status == "Out for Delivery"
            and elapsed >= timedelta(seconds=390)
        ):

            order.status = "Delivered"

            order.save(
                update_fields=["status"]
            )