# 🍴 Bite & Bliss – Full-Stack Food Ordering Platform

Bite & Bliss is a full-stack food ordering and restaurant management web application designed to provide a complete online food ordering experience.

The platform allows customers to browse food items, search and filter the menu, manage favorites, add items to a cart, place orders using Cash on Delivery or online payment, and track their orders.

The system also provides administrators with a custom dashboard for managing customer orders, monitoring revenue, analyzing food sales, identifying the most ordered foods, and tracking food-wise performance.

---

## 📌 Project Overview

Bite & Bliss combines a modern food-ordering frontend with a Django REST Framework backend and MySQL database.

The application supports:

- Customer registration and login
- Token-based authentication
- Food menu browsing
- Food search
- Food categories
- Shopping cart
- Wishlist / Favorites
- Checkout
- Cash on Delivery
- Online payment using PayU
- Payment verification
- Order management
- Order history
- Custom administrator dashboard
- Sales analytics
- Most ordered food analysis
- Food-wise quantity and revenue tracking
- Automated order notifications using Make.com  and Gmail

---

# ✨ Features

## 👤 Customer Features

### 🔐 User Authentication

Customers can:

- Register an account
- Login securely
- Logout
- Access authenticated features
- View their profile

Authentication is implemented using Django REST Framework Token Authentication.

---

## 🍕 Food Menu

Customers can:

- Browse available food items
- View food names
- View food descriptions
- View prices
- View food images
- Explore available menu items

---

## 🔎 Food Search

Customers can search for food items from the menu.

The search functionality helps users quickly find the food they want without manually browsing the complete menu.

---

## 🗂️ Food Categories

Food items can be organized into categories.

This allows customers to browse different types of food more easily.

---

## ❤️ Wishlist / Favorites

Customers can save their preferred food items for quick access later.

Features include:

- Add food items to favorites
- Remove food items from favorites
- View saved favorite foods
- Quickly access preferred food items before ordering

---

## 🛒 Shopping Cart

Customers can:

- Add food items to the cart
- Increase item quantity
- Decrease item quantity
- Remove items
- View cart contents
- Calculate the order subtotal
- View delivery charges
- View the final order amount

---

## 💳 Checkout

The checkout system allows customers to provide their delivery details and select a payment method.

The available payment methods are:

### 💵 Cash on Delivery

Customers can place an order using Cash on Delivery.

The order is created directly in the backend and assigned a pending status.

### 💳 Online Payment

Online payments are processed through PayU hosted checkout.

The application supports online payment options provided by PayU, including:

- UPI
- Debit/Credit Card

The application does not directly collect or store sensitive card information such as:

- Card number
- CVV
- UPI credentials

Payment information is handled through the PayU hosted payment page.

---

# 📦 Order Management

Customers can:

- Place orders
- View order details
- View order history
- View payment method
- View payment status
- View order status

The system supports order statuses such as:

- Pending
- Confirmed
- Preparing
- Out for Delivery
- Delivered

---

# 👨‍💼 Admin Dashboard

Bite & Bliss includes a custom administrator dashboard for monitoring restaurant operations, customer orders, and food sales.

The dashboard provides an overview of important restaurant metrics.

## 📊 Dashboard Metrics

The administrator can view:

- Total Orders
- Total Revenue
- Total Foods Sold
- Top Performing Food

Example dashboard information:

```text
Total Orders: 49
Total Revenue: ₹19,155
Foods Sold: 96
Top Food: Chicken Pizza