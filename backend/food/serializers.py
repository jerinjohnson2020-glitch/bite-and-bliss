from rest_framework import serializers
from django.contrib.auth.models import User

from .models import (
    Food,
    Order,
    OrderItem
)


class FoodSerializer(serializers.ModelSerializer):

    class Meta:

        model = Food

        fields = '__all__'


class OrderItemSerializer(
    serializers.ModelSerializer
):

    food_name = serializers.CharField(
        source="food.name",
        read_only=True
    )

    food_image = serializers.CharField(
        source="food.image",
        read_only=True
    )

    class Meta:

        model = OrderItem

        fields = [

            "food",

            "food_name",

            "food_image",

            "quantity",

            "price"

        ]


class OrderSerializer(
    serializers.ModelSerializer
):

    items = OrderItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:

        model = Order

        fields = [

            "order_id",

            "customer_name",

            "phone",

            "address",

            "payment_method",

            "payment_status",

            "total_amount",

            "status",

            "created_at",

            "items"

        ]


class RegisterSerializer(
    serializers.ModelSerializer
):

    password = serializers.CharField(
        write_only=True
    )

    class Meta:

        model = User

        fields = [

            "username",

            "email",

            "password"

        ]


    def create(
        self,
        validated_data
    ):

        user = User.objects.create_user(

            username=
                validated_data["username"],

            email=
                validated_data["email"],

            password=
                validated_data["password"]

        )

        return user