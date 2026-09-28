from django.shortcuts import render
from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate,logout
from django.db.models import Sum, Count, F, DecimalField, ExpressionWrapper
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes
)

from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework.authtoken.models import Token

from .models import (
    Food,
    Order,
    OrderItem,
    Favorite,
    CustomerProfile
)

from .serializers import (
    FoodSerializer,
    OrderSerializer,
    RegisterSerializer
)


# ============================================================
# FOOD LIST
# ============================================================

@api_view(['GET'])
def food_list(request):

    foods = Food.objects.all()

    data = []

    for food in foods:

        image_path = food.image

        if image_path:

            if not image_path.startswith("/static/"):
                image_path = "/static/food/" + image_path

        data.append({
            "id": food.id,
            "name": food.name,
            "category": food.category,
            "price": food.price,
            "image": image_path,
            "rating": food.rating,
            "reviews": food.reviews,
            "discount": food.discount,
            "description": food.description
        })

    return Response(
        data,
        status=status.HTTP_200_OK
    )


# ============================================================
# CREATE ORDER
# ============================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_order(request):

    data = request.data

    customer_name = data.get("customer_name")
    phone = data.get("phone")
    address = data.get("address")
    payment_method = data.get("payment_method")
    total_amount = data.get("total_amount")

    order_items = data.get("items", [])

    # --------------------------------------------------------
    # Validate basic order information
    # --------------------------------------------------------

    if not customer_name:
        return Response(
            {"error": "Customer name is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not phone:
        return Response(
            {"error": "Phone number is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not address:
        return Response(
            {"error": "Address is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not payment_method:
        return Response(
            {"error": "Payment method is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not total_amount:
        return Response(
            {"error": "Total amount is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not order_items:
        return Response(
            {"error": "Order must contain at least one item"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # Validate food items
    # --------------------------------------------------------

    validated_items = []

    for item in order_items:

        food_id = item.get("food")

        quantity = item.get("quantity")

        price = item.get("price")

        if not food_id:
            return Response(
                {"error": "Food ID is missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not quantity:
            return Response(
                {"error": "Quantity is missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            food = Food.objects.get(id=food_id)

        except Food.DoesNotExist:
            return Response(
                {
                    "error": f"Food with ID {food_id} does not exist"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_items.append({
            "food": food,
            "quantity": quantity,
            "price": price
        })

    # --------------------------------------------------------
    # Generate Order ID
    # --------------------------------------------------------

    import random

    order_id = "BB" + str(random.randint(100000, 999999))

    while Order.objects.filter(order_id=order_id).exists():

        order_id = "BB" + str(random.randint(100000, 999999))

    # --------------------------------------------------------
    # Create Order
    # --------------------------------------------------------

    order = Order.objects.create(
        user=request.user,
        order_id=order_id,
        customer_name=customer_name,
        phone=phone,
        address=address,
        payment_method=payment_method,
        total_amount=total_amount,
        status="Pending"
    )

    # --------------------------------------------------------
    # Create Order Items
    # --------------------------------------------------------

    for item in validated_items:

        OrderItem.objects.create(
            order=order,
            food=item["food"],
            quantity=item["quantity"],
            price=item["price"]
        )

    # --------------------------------------------------------
    # Return created order
    # --------------------------------------------------------

    serializer = OrderSerializer(order)

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED
    )


# ============================================================
# MY ORDERS
# ============================================================

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def my_orders(request):

    orders = Order.objects.filter(
        user=request.user
    ).order_by("-created_at")

    serializer = OrderSerializer(
        orders,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


# ============================================================
# REGISTER USER
# ============================================================

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def register_user(request):

    serializer = RegisterSerializer(
        data=request.data
    )

    if serializer.is_valid():

        user = serializer.save()

        phone = request.data.get("phone", "")

        CustomerProfile.objects.create(
            user=user,
            phone=phone
        )

        return Response(
            {
                "message": "User registered successfully",
                "username": user.username,
                "email": user.email,
                "phone": phone
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# LOGIN USER
# ============================================================

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def login_user(request):

    username = request.data.get("username")

    password = request.data.get("password")

    # --------------------------------------------------------
    # Validate username
    # --------------------------------------------------------

    if not username:

        return Response(
            {
                "error": "Username is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # Validate password
    # --------------------------------------------------------

    if not password:

        return Response(
            {
                "error": "Password is required"
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # Authenticate user
    # --------------------------------------------------------

    user = authenticate(
        username=username,
        password=password
    )

    if user is None:

        return Response(
            {
                "error": "Invalid username or password"
            },
            status=status.HTTP_401_UNAUTHORIZED
        )

    # --------------------------------------------------------
    # Create / Get Token
    # --------------------------------------------------------

    token, created = Token.objects.get_or_create(
        user=user
    )

    # --------------------------------------------------------
    # Return login response
    # --------------------------------------------------------

    return Response(
        {
            "message": "Login successful",
            "username": user.username,
            "email": user.email,
            "token": token.key
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# HOME PAGE
# ============================================================

def home(request):

    return render(
        request,
        "food/index.html"
    )

@api_view(['GET'])
def food_sales_analytics(request):

    analytics = (
        OrderItem.objects
        .values(
            'food__id',
            'food__name'
        )
        .annotate(
            order_count=Count('order', distinct=True),
            quantity_sold=Sum('quantity'),
            total_revenue=Sum(
                ExpressionWrapper(
                    F('quantity') * F('price'),
                    output_field=DecimalField(
                        max_digits=12,
                        decimal_places=2
                    )
                )
            )
        )
        .order_by('-quantity_sold')
    )

    return Response(
        analytics,
        status=status.HTTP_200_OK
    )

@api_view(['GET'])
def dashboard_summary(request):

    total_orders = Order.objects.count()

    total_foods_sold = (
        OrderItem.objects.aggregate(
            total=Sum('quantity')
        )['total'] or 0
    )

    total_revenue = (
        OrderItem.objects.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('quantity') * F('price'),
                    output_field=DecimalField(
                        max_digits=12,
                        decimal_places=2
                    )
                )
            )
        )['total'] or 0
    )

    top_food = (
        OrderItem.objects
        .values('food__name')
        .annotate(
            total_quantity=Sum('quantity')
        )
        .order_by('-total_quantity')
        .first()
    )

    top_food_name = (
        top_food['food__name']
        if top_food
        else None
    )

    return Response(
        {
            "total_orders": total_orders,
            "total_foods_sold": total_foods_sold,
            "total_revenue": total_revenue,
            "top_food": top_food_name
        },
        status=status.HTTP_200_OK
    )

# ============================================================
# ADMIN DASHBOARD
# ============================================================

@login_required(login_url="/admin/login/")
def admin_dashboard(request):

    if not request.user.is_staff:
        return redirect("/")

    return render(
        request,
        "admin_dashboard/dashboard.html"
    )

# ============================================================
# ADMIN LOGOUT
# ============================================================

def admin_logout(request):

    logout(request)

    return redirect("/admin/login/")

# ============================================================
# ADMIN ORDERS
# ============================================================

from rest_framework.authentication import SessionAuthentication


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_orders(request):

    if not request.user.is_staff:

        return Response(
            {"error": "Admin access required"},
            status=status.HTTP_403_FORBIDDEN
        )


    orders = (
        Order.objects
        .select_related("user")
        .prefetch_related("items__food")
        .order_by("-created_at")
    )


    serializer = OrderSerializer(
        orders,
        many=True
    )


    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )

# ============================================================
# FAVORITES
# ============================================================

@api_view(['GET', 'POST', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def favorites(request):

    # GET FAVORITES
    if request.method == 'GET':

        favorite_foods = Food.objects.filter(
            favorited_by__user=request.user
        )

        data = []

        for food in favorite_foods:

            image_path = food.image

            if image_path and not image_path.startswith("/static/"):
                image_path = "/static/food/" + image_path

            data.append({
                "id": food.id,
                "name": food.name,
                "category": food.category,
                "price": food.price,
                "image": image_path,
                "rating": food.rating,
                "reviews": food.reviews,
                "discount": food.discount,
                "description": food.description
            })

        return Response(
            data,
            status=status.HTTP_200_OK
        )

    # ADD FAVORITE
    if request.method == 'POST':

        food_id = request.data.get("food_id")

        if not food_id:
            return Response(
                {"error": "food_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            food = Food.objects.get(id=food_id)
        except Food.DoesNotExist:
            return Response(
                {"error": "Food not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            food=food
        )

        return Response({
            "message": "Added to favorites",
            "favorite": True,
            "food_id": food.id
        })

    # REMOVE FAVORITE
    if request.method == 'DELETE':

        food_id = request.data.get("food_id")

        if not food_id:
            return Response(
                {"error": "food_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        Favorite.objects.filter(
            user=request.user,
            food_id=food_id
        ).delete()

        return Response({
            "message": "Removed from favorites",
            "favorite": False,
            "food_id": int(food_id)
        })

        # ============================================================
# CUSTOMER PROFILE
# ============================================================

@api_view(['GET', 'PATCH'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def customer_profile(request):

    user = request.user

    profile, created = CustomerProfile.objects.get_or_create(
        user=user
    )

    # GET PROFILE
    if request.method == 'GET':

        return Response(
            {
                "username": user.username,
                "email": user.email,
                "phone": profile.phone
            },
            status=status.HTTP_200_OK
        )

    # UPDATE PROFILE
    if request.method == 'PATCH':

        username = request.data.get(
            "username",
            user.username
        ).strip()

        email = request.data.get(
            "email",
            user.email
        ).strip()

        phone = request.data.get(
            "phone",
            profile.phone
        ).strip()

        if not username:
            return Response(
                {"error": "Username is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.exclude(
            id=user.id
        ).filter(username=username).exists():

            return Response(
                {"error": "Username is already taken"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.exclude(
            id=user.id
        ).filter(email=email).exists():

            return Response(
                {"error": "Email is already in use"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.username = username
        user.email = email
        user.save()

        profile.phone = phone
        profile.save()

        return Response(
            {
                "message": "Profile updated successfully",
                "username": user.username,
                "email": user.email,
                "phone": profile.phone
            },
            status=status.HTTP_200_OK
        )