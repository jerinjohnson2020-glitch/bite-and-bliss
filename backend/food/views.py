import requests
import hashlib
import hmac
import random
from decimal import Decimal, InvalidOperation
from django.shortcuts import redirect
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction
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
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

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

@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_order(request):
    data = request.data

    customer_name = str(data.get("customer_name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    address = str(data.get("address", "")).strip()
    payment_method = str(data.get("payment_method", "")).strip()
    order_items = data.get("items", [])

    # Validate customer details
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

    # This endpoint is for Cash on Delivery only.
    if payment_method not in ["Cash on Delivery", "COD"]:
        return Response(
            {"error": "Use the PayU endpoint for online payments"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(order_items, list) or not order_items:
        return Response(
            {"error": "Order must contain at least one item"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate cart items and calculate subtotal from database prices.
    validated_items = []
    subtotal = Decimal("0.00")

    for item in order_items:
        if not isinstance(item, dict):
            return Response(
                {"error": "Invalid item format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        food_id = item.get("food")
        quantity_value = item.get("quantity")

        try:
            quantity = int(quantity_value)
        except (TypeError, ValueError):
            return Response(
                {"error": "Each item must have a valid quantity"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quantity <= 0:
            return Response(
                {"error": "Quantity must be greater than zero"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            food = Food.objects.get(id=food_id)
        except (Food.DoesNotExist, TypeError, ValueError):
            return Response(
                {"error": f"Food with ID {food_id} was not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        food_price = Decimal(str(food.price))
        subtotal += food_price * quantity

        validated_items.append({
            "food": food,
            "quantity": quantity,
            "price": food_price
        })

    delivery_fee = Decimal("40.00")
    total_amount = subtotal + delivery_fee

    # Generate a unique order ID.
    order_id = "BB" + str(random.randint(100000, 999999))

    while Order.objects.filter(order_id=order_id).exists():
        order_id = "BB" + str(random.randint(100000, 999999))

    # Create order and order items together.
    with transaction.atomic():
        order = Order.objects.create(
            user=request.user,
            order_id=order_id,
            customer_name=customer_name,
            phone=phone,
            address=address,
            payment_method="Cash on Delivery",
            payment_status="Not Required",
            total_amount=total_amount,
            status="Pending"
        )

        for item in validated_items:
            OrderItem.objects.create(
                order=order,
                food=item["food"],
                quantity=item["quantity"],
                price=item["price"]
            )
    send_make_order_notification(order)
    serializer = OrderSerializer(order)

    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED
    )

# ============================================================
# PAYU PAYMENT INITIATION
# ============================================================

@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def initiate_payu_payment(request):

    data = request.data

    customer_name = str(data.get("customer_name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    address = str(data.get("address", "")).strip()
    payment_method = str(data.get("payment_method", "")).strip()
    order_items = data.get("items", [])

    # --------------------------------------------------------
    # Validate customer details
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
            {"error": "Delivery address is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if payment_method not in ["UPI", "Card"]:
        return Response(
            {"error": "PayU payment method must be UPI or Card"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(order_items, list) or not order_items:
        return Response(
            {"error": "Order must contain at least one item"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # Check PayU configuration
    # --------------------------------------------------------

    payu_key = getattr(settings, "PAYU_KEY", "")
    payu_salt = getattr(settings, "PAYU_SALT", "")
    success_url = getattr(settings, "PAYU_SUCCESS_URL", "")
    failure_url = getattr(settings, "PAYU_FAILURE_URL", "")

    if not all([payu_key, payu_salt, success_url, failure_url]):
        return Response(
            {
                "error": (
                    "PayU is not fully configured. "
                    "Check the PayU key, salt, success URL, and failure URL."
                )
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # --------------------------------------------------------
    # Validate cart and calculate price from database
    # --------------------------------------------------------

    validated_items = []
    subtotal = Decimal("0.00")

    for item in order_items:

        if not isinstance(item, dict):
            return Response(
                {"error": "Invalid item format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        food_id = item.get("food")
        quantity_value = item.get("quantity")

        try:
            quantity = int(quantity_value)
        except (TypeError, ValueError):
            return Response(
                {"error": "Each item must have a valid quantity"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quantity <= 0:
            return Response(
                {"error": "Quantity must be greater than zero"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            food = Food.objects.get(id=food_id)
        except (Food.DoesNotExist, TypeError, ValueError):
            return Response(
                {"error": f"Food with ID {food_id} was not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use the database price, not the browser's price.
        food_price = Decimal(str(food.price))
        subtotal += food_price * quantity

        validated_items.append({
            "food": food,
            "quantity": quantity,
            "price": food_price
        })

    delivery_fee = Decimal("40.00")
    total_amount = subtotal + delivery_fee
    amount_text = format(total_amount.quantize(Decimal("0.01")), ".2f")

    # --------------------------------------------------------
    # Create a unique order ID
    # --------------------------------------------------------

    order_id = "BB" + str(random.randint(100000, 999999))

    while Order.objects.filter(order_id=order_id).exists():
        order_id = "BB" + str(random.randint(100000, 999999))

    # --------------------------------------------------------
    # Create pending order and its items
    # --------------------------------------------------------

    with transaction.atomic():

        order = Order.objects.create(
            user=request.user,
            order_id=order_id,
            customer_name=customer_name,
            phone=phone,
            address=address,
            payment_method=payment_method,
            total_amount=total_amount,
            payment_status="Pending",
            status="Pending"
        )

        for item in validated_items:
            OrderItem.objects.create(
                order=order,
                food=item["food"],
                quantity=item["quantity"],
                price=item["price"]
            )

    # --------------------------------------------------------
    # Prepare PayU hosted checkout request
    # --------------------------------------------------------

    txnid = order.order_id
    productinfo = f"Bite & Bliss Order {order.order_id}"
    firstname = customer_name[:60]
    email = request.user.email or "customer@example.com"

    # Standard PayU hosted-checkout hash:
    # key|txnid|amount|productinfo|firstname|email|
    # udf1|udf2|udf3|udf4|udf5||||||salt
    hash_values = [
        payu_key,
        txnid,
        amount_text,
        productinfo,
        firstname,
        email,
        "", "", "", "", "",
        "", "", "", "", "",
        payu_salt
    ]

    hash_string = "|".join(hash_values)

    payment_hash = hashlib.sha512(
        hash_string.encode("utf-8")
    ).hexdigest()

    payu_fields = {
        "key": payu_key,
        "txnid": txnid,
        "amount": amount_text,
        "productinfo": productinfo,
        "firstname": firstname,
        "email": email,
        "phone": phone,
        "surl": success_url,
        "furl": failure_url,
        "hash": payment_hash,
    }

    return Response(
        {
            "message": "PayU checkout prepared",
            "order_id": order.order_id,
            "payment_url": settings.PAYU_BASE_URL,
            "payu_fields": payu_fields
        },
        status=status.HTTP_201_CREATED
    )


def verify_payu_transaction(txnid):
    key = settings.PAYU_KEY
    salt = settings.PAYU_SALT
    command = "verify_payment"

    verify_hash = hashlib.sha512(
        f"{key}|{command}|{txnid}|{salt}".encode("utf-8")
    ).hexdigest()

    response = requests.post(
        "https://test.payu.in/merchant/postservice?form=2",
        data={
            "key": key,
            "command": command,
            "var1": txnid,
            "hash": verify_hash,
        },
        timeout=20,
    )

    response.raise_for_status()
    result = response.json()

    if str(result.get("status")) != "1":
        return None

    transaction_details = result.get("transaction_details", {})
    return transaction_details.get(txnid)
def send_make_order_notification(order):
    webhook_url = getattr(settings, "MAKE_WEBHOOK_URL", "")

    if not webhook_url:
        return

    payload = {
        "order_id": order.order_id,
        "customer_name": order.customer_name,
        "payment_method": order.payment_method,
        "total_amount": str(order.total_amount),
    }

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=5,
        )
        response.raise_for_status()

    except requests.RequestException:
        # Do not interrupt a valid order if Make.com is unavailable.
        return

@csrf_exempt
@require_POST
def payu_response(request):
    """
    Receive PayU's success/failure response.
    Verify callback hash and amount, then verify successful
    payments directly with PayU before marking the order Paid.
    """
    data = request.POST

    key = data.get("key", "")
    txnid = data.get("txnid", "")
    status_value = data.get("status", "").lower()
    response_hash = data.get("hash", "").lower()

    amount_value = data.get("amount", "")
    productinfo = data.get("productinfo", "")
    firstname = data.get("firstname", "")
    email = data.get("email", "")

    udf1 = data.get("udf1", "")
    udf2 = data.get("udf2", "")
    udf3 = data.get("udf3", "")
    udf4 = data.get("udf4", "")
    udf5 = data.get("udf5", "")

    salt = settings.PAYU_SALT

    if not salt:
        return HttpResponse("PayU salt is not configured.", status=500)

    if not all([key, txnid, status_value, response_hash, amount_value]):
        return HttpResponse(
            "Required PayU response fields are missing.",
            status=400,
        )

    if key != settings.PAYU_KEY:
        return HttpResponse("Invalid PayU key.", status=400)

    # Verify PayU's response hash.
    hash_values = [
        salt,
        status_value,
        "",
        "",
        "",
        "",
        "",
        udf5,
        udf4,
        udf3,
        udf2,
        udf1,
        email,
        firstname,
        productinfo,
        amount_value,
        txnid,
        key,
    ]

    additional_charges = data.get("additionalCharges", "")
    if additional_charges:
        hash_values.insert(0, additional_charges)

    calculated_hash = hashlib.sha512(
        "|".join(hash_values).encode("utf-8")
    ).hexdigest().lower()

    if not hmac.compare_digest(calculated_hash, response_hash):
        return HttpResponse(
            "PayU response hash verification failed.",
            status=400,
        )

    # Find the order created by our backend.
    try:
        order = Order.objects.get(order_id=txnid)
    except Order.DoesNotExist:
        return HttpResponse("Order not found.", status=404)

    # Compare callback amount with the amount saved in our database.
    try:
        response_amount = Decimal(amount_value).quantize(
            Decimal("0.01")
        )
        saved_amount = Decimal(str(order.total_amount)).quantize(
            Decimal("0.01")
        )
    except (InvalidOperation, TypeError, ValueError):
        return HttpResponse("Invalid payment amount.", status=400)

    if response_amount != saved_amount:
        return HttpResponse(
            "Payment amount does not match the order.",
            status=400,
        )

    # A success callback is not enough: verify directly with PayU.
    if status_value == "success":
        try:
            verified_payment = verify_payu_transaction(txnid)
        except (requests.RequestException, ValueError):
            return HttpResponse(
                "Could not verify payment with PayU. "
                "The order has not been marked as paid.",
                status=502,
            )

        if not verified_payment:
            return HttpResponse(
                "PayU could not confirm this transaction. "
                "The order has not been marked as paid.",
                status=502,
            )

        verified_status = str(
            verified_payment.get("status", "")
        ).lower()

        verified_unmapped_status = str(
            verified_payment.get("unmappedstatus", "")
        ).lower()

        verified_txnid = str(
            verified_payment.get("txnid", "")
        )

        verified_amount = verified_payment.get("amt", "")

        # Require PayU's verified transaction ID and captured status.
        if (
            verified_txnid != txnid
            or verified_status != "success"
            or verified_unmapped_status != "captured"
        ):
            return HttpResponse(
                "PayU has not confirmed a captured payment. "
                "The order has not been marked as paid.",
                status=400,
            )

        try:
            verified_amount = Decimal(
                str(verified_amount)
            ).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError, ValueError):
            return HttpResponse(
                "PayU returned an invalid verified amount.",
                status=400,
            )

        if verified_amount != saved_amount:
            return HttpResponse(
                "Verified PayU amount does not match the order.",
                status=400,
            )

        if order.payment_status != "Paid":
            order.payment_status = "Paid"
            order.save(update_fields=["payment_status"])

            send_make_order_notification(order)

        return redirect(
            f"/?payment=success&order_id={order.order_id}"
        )

    # A verified failure callback does not mark an existing paid order failed.
    if status_value == "failure":
        if order.payment_status != "Paid":
            order.payment_status = "Failed"
            order.save(update_fields=["payment_status"])

        return redirect(
    f"/?payment=failed&order_id={order.order_id}"
)

    return redirect(
    f"/?payment=pending&order_id={order.order_id}"
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

        # Set payment status based on the selected method
    if payment_method == "Cash on Delivery":
        payment_status = "Not Required"
    else:
        payment_status = "Pending"

    # Create Order
    order = Order.objects.create(
        user=request.user,
        order_id=order_id,
        customer_name=customer_name,
        phone=phone,
        address=address,
        payment_method=payment_method,
        payment_status=payment_status,
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

    #send order details to Make.com
def send_make_order_notification(order):
    webhook_url = getattr(settings, "MAKE_WEBHOOK_URL", "")

    if not webhook_url:
        print("Make.com error: webhook URL is missing")
        return

    print("Make.com: sending order notification")

    payload = {
        "order_id": order.order_id,
        "customer_name": order.customer_name,
        "payment_method": order.payment_method,
        "total_amount": str(order.total_amount),
    }

    try:
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=10,
        )

        print("Make.com HTTP status:", response.status_code)
        response.raise_for_status()

    except requests.RequestException as error:
        print("Make.com request failed:", error)
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
