from django.db import models
from django.contrib.auth.models import User


class Food(models.Model):

    name = models.CharField(
        max_length=100
    )

    category = models.CharField(
        max_length=50
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    image = models.CharField(
        max_length=255,
        blank=True
    )

    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0
    )

    reviews = models.IntegerField(
        default=0
    )

    discount = models.CharField(
        max_length=20,
        blank=True
    )

    description = models.TextField(
    blank=True

    )


    def __str__(self):
        return self.name


class Order(models.Model):


    STATUS_CHOICES = [

        ("Pending", "Pending"),

        ("Confirmed", "Confirmed"),

        ("Preparing", "Preparing"),

        ("Out for Delivery", "Out for Delivery"),

        ("Delivered", "Delivered"),

    ]


    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
        null=True,
        blank=True
    )


    order_id = models.CharField(
        max_length=20,
        unique=True
    )


    customer_name = models.CharField(
        max_length=100
    )


    phone = models.CharField(
        max_length=20
    )


    address = models.TextField()


    payment_method = models.CharField(
        max_length=50
    )


    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    PAYMENT_STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Paid", "Paid"),
        ("Failed", "Failed"),
        ("Not Required", "Not Required"),
    ]

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="Pending"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="Pending"
    )


    created_at = models.DateTimeField(
        auto_now_add=True
    )


    def __str__(self):
        return self.order_id


class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )


    food = models.ForeignKey(
        Food,
        on_delete=models.CASCADE
    )


    quantity = models.PositiveIntegerField()


    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )


    def __str__(self):

        return (
            f"{self.order.order_id} - "
            f"{self.food.name}"
        )

class Favorite(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorites"
    )

    food = models.ForeignKey(
        Food,
        on_delete=models.CASCADE,
        related_name="favorited_by"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "food"],
                name="unique_user_food_favorite"
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.food.name}"

class CustomerProfile(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    phone = models.CharField(
        max_length=20,
        blank=True
    )

    def __str__(self):
        return self.user.username
