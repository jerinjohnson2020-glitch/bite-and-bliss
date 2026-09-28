/* =========================================================
   BITE & BLISS
   MAIN JAVASCRIPT
   CORRECTED / STABLE VERSION
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */
let favoriteFoodIds = new Set();

let foods = [];

let cart = [];

const API_URL =
    "/api";

function openFoodDetails(food) {

    const overlay =
        document.getElementById("foodDetailsOverlay");


    const image =
        document.getElementById("foodDetailsImage");

    const name =
        document.getElementById("foodDetailsName");

    const category =
        document.getElementById("foodDetailsCategory");

    const discount =
        document.getElementById("foodDetailsDiscount");

    const rating =
        document.getElementById("foodDetailsRating");

    const description =
        document.getElementById("foodDetailsDescription");

    const price =
        document.getElementById("foodDetailsPrice");

    const addButton =
        document.getElementById("foodDetailsAddBtn");

    if (!overlay) {
        console.error(
            "Food Details overlay not found."
        );
        return;
    }

    image.src =
        getFoodImage(food.image);

    image.alt =
        food.name || "Food";

    name.textContent =
        food.name || "Food";

    category.textContent =
        food.category || "";

        if (food.discount) {
    discount.textContent =
        food.discount;

    discount.style.display =
        "inline-block";
} else {
    discount.textContent =
        "";

    discount.style.display =
        "none";
}

    rating.textContent =
        `⭐ ${food.rating || 0} (${food.reviews || 0})`;

    description.textContent =
    food.description ||
    "Delicious food from Bite & Bliss.";

    price.textContent =
        `₹${food.price}`;

    addButton.onclick =
        function () {

            addToCart(
                Number(food.id)
            );

            closeFoodDetails();

        };

    overlay.style.display =
        "flex";
}

function closeFoodDetails() {

    const overlay =
        document.getElementById(
            "foodDetailsOverlay"
        );

    if (overlay) {
        overlay.style.display =
            "none";
    }
}

/* =========================================================
   IMAGE URL HELPER
========================================================= */

function getFoodImage(image) {

    if (!image) {
        return "/static/food/images/food.jpg";
    }

    const imagePath = String(image).trim();

    if (!imagePath) {
        return "/static/food/images/food.jpg";
    }

    /* Already a complete URL */
    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }

    /* Already an absolute Django/static path */
    if (imagePath.startsWith("/static/")) {
        return imagePath;
    }

    /* Django may return /media/... */
    if (imagePath.startsWith("/media/")) {
        return imagePath;
    }

    /* Remove leading slash */
    const cleanPath =
        imagePath.replace(/^\/+/, "");

    /*
       If database contains:
       images/chicken_burger.jpg

       convert to:
       /static/food/images/chicken_burger.jpg
    */

    if (cleanPath.startsWith("images/")) {
        return "/static/food/" + cleanPath;
    }

    /*
       If database contains only:
       chicken_burger.jpg
    */

    return "/static/food/images/" + cleanPath;
}


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadCart();

        loadFoods();

        setupPageEvents();

        updateAuthButtons();

        updateCartCount();

        /*
           Browser autofill protection.
           Some browsers/password managers can put the
           logged-in username into the search box.
        */

        setInterval(
            protectSearchInput,
            300
        );

    }
);


/* =========================================================
   SETUP PAGE EVENTS
========================================================= */

function setupPageEvents() {

    /* =====================================================
       SEARCH
    ===================================================== */

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const searchBtn =
        document.getElementById(
            "searchBtn"
        );


    if (searchInput) {

        searchInput.value = "";

        searchInput.addEventListener(
            "input",
            function () {

                /*
                   IMPORTANT:

                   Only perform a search when the user
                   is actually using the search box.

                   This prevents browser autofill from
                   destroying the food cards.
                */

                if (
                    document.activeElement !==
                    searchInput
                ) {

                    const value =
                        String(
                            searchInput.value || ""
                        )
                        .toLowerCase()
                        .trim();

                    const username =
                        String(
                            localStorage.getItem(
                                "username"
                            ) || ""
                        )
                        .toLowerCase()
                        .trim();

                    const email =
                        String(
                            localStorage.getItem(
                                "email"
                            ) || ""
                        )
                        .toLowerCase()
                        .trim();


                    if (
                        value === username ||
                        value === email
                    ) {

                        searchInput.value = "";

                    }

                    displayFoods(foods);

                    return;
                }


                searchFoods();

            }
        );

    }


    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                searchFoods();

            }
        );

    }


    /* =====================================================
       CART BUTTON
    ===================================================== */

    const cartBtn =
        document.getElementById(
            "cartBtn"
        );


    if (cartBtn) {

        cartBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                openCart();

            }
        );

    }


    /* =====================================================
       CLOSE CART
    ===================================================== */

    const closeCartBtn =
        document.getElementById(
            "closeCart"
        );


    if (closeCartBtn) {

        closeCartBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                closeCart();

            }
        );

    }


    /* =====================================================
       CHECKOUT
    ===================================================== */

    const checkoutBtn =
        document.getElementById(
            "checkoutBtn"
        );


    if (checkoutBtn) {

        checkoutBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                openCheckout();

            }
        );

    }


    /* =====================================================
       CLOSE CHECKOUT
    ===================================================== */

    const closeCheckoutBtn =
        document.getElementById(
            "closeCheckout"
        );


    if (closeCheckoutBtn) {

        closeCheckoutBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                closeCheckout();

            }
        );

    }


    /* =====================================================
       CATEGORY BUTTONS
    ===================================================== */

    const categoryButtons =
        document.querySelectorAll(
            ".category"
        );


    categoryButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();


                    const category =
                        button.dataset.category;


                    categoryButtons.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    filterCategory(
                        category
                    );

                }
            );

        }
    );

}


/* =========================================================
   LOAD FOODS
========================================================= */

async function loadFoods() {

    try {

        const response =
            await fetch(
                `${API_URL}/foods/`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load foods"
            );

        }


        const data =
            await response.json();


        foods =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Foods loaded:",
            foods.length
        );


        displayFoods(
            foods
        );


    } catch (error) {

        console.error(
            "Food loading error:",
            error
        );


        const container =
            document.getElementById(
                "food-container"
            );


        if (container) {

            container.innerHTML = `
                <p style="
                    width:100%;
                    text-align:center;
                    padding:30px;
                    color:#777;
                ">
                    Unable to load food items.
                    Please make sure Django server is running.
                </p>
            `;

        }

    }

}


/* =========================================================
   DISPLAY FOODS
========================================================= */

function displayFoods(
    foodList
) {

    const container =
        document.getElementById(
            "food-container"
        );


    if (!container) {

        console.error(
            "ERROR: #food-container not found."
        );

        return;
    }


    /*
       Never destroy the food list when the
       original food array still contains data.

       This is an additional safety check.
    */

    if (
        (!foodList ||
        foodList.length === 0) &&
        foods.length > 0
    ) {

        /*
           If an accidental empty search/filter
           happens, restore the original foods.
        */

        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (
            searchInput &&
            !searchInput.value.trim()
        ) {

            foodList = foods;

        }

    }


    container.innerHTML = "";


    if (
        !foodList ||
        foodList.length === 0
    ) {

        container.innerHTML = `
            <p style="
                width:100%;
                text-align:center;
                padding:30px;
                color:#777;
            ">
                No food items found.
            </p>
        `;

        return;
    }


    foodList.forEach(
        function (food) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "food-card";
            // Apply a special class to drink items
if (
    String(food.category || "")
        .toLowerCase()
        .includes("drink")
) {
    card.classList.add("drink-food-card");
}


           const image =
    getFoodImage(food.image);

            card.innerHTML = `

    <div class="food-card-top">

        <img
            src="${image}"
            alt="${food.name}"
            onerror="
                this.onerror=null;
                this.src='/static/food/images/pizza.jpg';
            "
        >

        <button
            type="button"
            class="favorite-btn"
            data-food-id="${food.id}"
            aria-label="Add to favorites"
        >
            ♡
        </button>

    </div>

    <div class="food-info">

        <h3>
            ${food.name}
        </h3>

        <p class="food-category">
            ${food.category || ""}
        </p>

        <div class="food-rating">
            ⭐ ${food.rating || 0}
            (${food.reviews || 0})
        </div>

        <div class="food-bottom">

            <strong>
                ₹${food.price}
            </strong>

            <button
                type="button"
                class="add-food-btn"
                data-food-id="${food.id}"
            >
                Add
            </button>

        </div>

    </div>

`;

            card.addEventListener(
    "click",
    function (event) {

        if (
            event.target.closest(".favorite-btn")
        ) {
            return;
        }

        if (
            event.target.closest(".favorite-add-btn")
        ) {
            return;
        }

        if (
            event.target.closest(".favorite-remove-btn")
        ) {
            return;
        }

        openFoodDetails(food);

    }
);

            const addButton =
                card.querySelector(
                    ".add-food-btn"
                );

            const favoriteButton =
    card.querySelector(
        ".favorite-btn"
    );

if (favoriteButton) {

    favoriteButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            toggleFavorite(
                Number(food.id),
                favoriteButton
            );

        }
    );

}


            if (addButton) {

                addButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();


                        const foodId =
                            Number(
                                addButton.dataset.foodId
                            );


                        addToCart(
                            foodId
                        );

                    }
                );

            }


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

function searchFoods() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput) {
        return;
    }


    const searchText =
        searchInput.value
            .toLowerCase()
            .trim();


    /*
       Empty search = show everything.
    */

    if (!searchText) {

        displayFoods(
            foods
        );

        return;
    }


    /*
       Get logged-in information.
    */

    const savedUsername =
        String(
            localStorage.getItem(
                "username"
            ) || ""
        )
        .toLowerCase()
        .trim();


    const savedEmail =
        String(
            localStorage.getItem(
                "email"
            ) || ""
        )
        .toLowerCase()
        .trim();


    /*
       NEVER allow username/email to become
       a food search.
    */

    if (
        searchText === savedUsername ||
        searchText === savedEmail
    ) {

        searchInput.value = "";

        displayFoods(
            foods
        );

        return;
    }


    /*
       Normal food search.
    */

    const filteredFoods =
        foods.filter(
            function (food) {

                const name =
                    String(
                        food.name || ""
                    )
                    .toLowerCase();


                const category =
                    String(
                        food.category || ""
                    )
                    .toLowerCase();


                return (
                    name.includes(
                        searchText
                    )
                    ||
                    category.includes(
                        searchText
                    )
                );

            }
        );


    displayFoods(
        filteredFoods
    );

}


/* =========================================================
   SEARCH AUTOFILL PROTECTION
========================================================= */

function protectSearchInput() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput) {
        return;
    }


    const currentValue =
        String(
            searchInput.value || ""
        )
        .toLowerCase()
        .trim();


    if (!currentValue) {
        return;
    }


    const username =
        String(
            localStorage.getItem(
                "username"
            ) || ""
        )
        .toLowerCase()
        .trim();


    const email =
        String(
            localStorage.getItem(
                "email"
            ) || ""
        )
        .toLowerCase()
        .trim();


    /*
       Browser inserted username/email.
    */

    if (
        currentValue === username ||
        currentValue === email
    ) {

        searchInput.value = "";

        displayFoods(
            foods
        );

        return;
    }


    /*
       Browser autofill may insert an email
       even when it isn't exactly the stored
       email for some reason.
    */

    if (
        document.activeElement !== searchInput
    ) {

        if (
            currentValue.includes("@")
        ) {

            searchInput.value = "";

            displayFoods(
                foods
            );

        }

    }

}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function filterCategory(
    category
) {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (searchInput) {

        searchInput.value = "";

    }


    if (
        !category ||
        category === "All"
    ) {

        displayFoods(
            foods
        );

        return;
    }


    const filteredFoods =
        foods.filter(
            function (food) {

                return String(
                    food.category || ""
                )
                .toLowerCase()
                ===
                String(
                    category
                )
                .toLowerCase();

            }
        );


    displayFoods(
        filteredFoods
    );

}

/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(
    foodId
) {

    const food =
        foods.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    foodId
                );

            }
        );


    if (!food) {

        console.error(
            "Food not found:",
            foodId
        );

        return;
    }


    const existingItem =
        cart.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    foodId
                );

            }
        );


    if (existingItem) {

        existingItem.quantity += 1;

    } else {

        cart.push({

            id:
                Number(
                    food.id
                ),

            name:
                food.name,

            price:
                Number(
                    food.price
                ),

            image:
                food.image,

            quantity:
                1

        });

    }


    saveCart();

    updateCartCount();

    showToast(
        `${food.name} added to cart`
    );

}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart() {

    localStorage.setItem(
        "biteBlissCart",
        JSON.stringify(
            cart
        )
    );

}


/* =========================================================
   LOAD CART
========================================================= */

function loadCart() {

    try {

        const savedCart =
            localStorage.getItem(
                "biteBlissCart"
            );


        if (savedCart) {

            const parsedCart =
                JSON.parse(
                    savedCart
                );


            if (
                Array.isArray(
                    parsedCart
                )
            ) {

                cart =
                    parsedCart;

            }

        }

    } catch (error) {

        console.error(
            "Cart loading error:",
            error
        );

        cart = [];

    }

}


/* =========================================================
   UPDATE CART COUNT
========================================================= */

function updateCartCount() {

    const cartCount =
        document.getElementById(
            "cartCount"
        );


    if (!cartCount) {
        return;
    }


    const totalItems =
        cart.reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    Number(
                        item.quantity
                    )
                );

            },
            0
        );


    cartCount.textContent =
        totalItems;

}


/* =========================================================
   OPEN CART
========================================================= */

function openCart() {

    const overlay =
        document.getElementById(
            "cartOverlay"
        );


    if (!overlay) {

        console.error(
            "cartOverlay not found."
        );

        return;
    }


    displayCart();


    overlay.style.display =
        "flex";

}


/* =========================================================
   CLOSE CART
========================================================= */

function closeCart() {

    const overlay =
        document.getElementById(
            "cartOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   DISPLAY CART
========================================================= */

function displayCart() {

    const container =
        document.getElementById(
            "cartItems"
        );

    const totalElement =
        document.getElementById(
            "cartTotal"
        );


    if (!container) {

        console.error(
            "cartItems not found."
        );

        return;
    }


    container.innerHTML = "";


    if (cart.length === 0) {

        container.innerHTML = `

            <div class="empty-cart">

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add some delicious food!
                </p>

            </div>

        `;


        if (totalElement) {

            totalElement.textContent =
                "₹0";

        }


        return;
    }


    let total = 0;


    cart.forEach(
        function (
            item,
            index
        ) {

            const price =
                Number(
                    item.price
                );

            const quantity =
                Number(
                    item.quantity
                );


            const itemTotal =
                price *
                quantity;


            total +=
                itemTotal;


            const cartItem =
                document.createElement(
                    "div"
                );


            cartItem.className =
                "cart-item";

            cartItem.innerHTML = `

        <img
    src="${item.image || "/static/food/images/food.jpg"}"
    alt="${item.name}"
    onerror="
        this.onerror=null;
        this.src='/static/food/images/food.jpg';
    "
>

                <div class="cart-item-info">

                    <h3>
                        ${item.name}
                    </h3>

                    <p>
                        ₹${price.toFixed(2)}
                    </p>


                    <div class="quantity-controls">

                        <button
                            type="button"
                            class="quantity-minus"
                            data-index="${index}"
                        >
                            −
                        </button>


                        <span>
                            ${quantity}
                        </span>


                        <button
                            type="button"
                            class="quantity-plus"
                            data-index="${index}"
                        >
                            +
                        </button>

                    </div>

                </div>


                <strong>
                    ₹${itemTotal.toFixed(2)}
                </strong>


                <button
                    type="button"
                    class="remove-cart-item"
                    data-index="${index}"
                >
                    ✕
                </button>

            `;


            const minusButton =
                cartItem.querySelector(
                    ".quantity-minus"
                );


            const plusButton =
                cartItem.querySelector(
                    ".quantity-plus"
                );


            const removeButton =
                cartItem.querySelector(
                    ".remove-cart-item"
                );


            if (minusButton) {

                minusButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        changeQuantity(
                            index,
                            -1
                        );

                    }
                );

            }


            if (plusButton) {

                plusButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        changeQuantity(
                            index,
                            1
                        );

                    }
                );

            }


            if (removeButton) {

                removeButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        removeFromCart(
                            index
                        );

                    }
                );

            }


            container.appendChild(
                cartItem
            );

        }
    );


    if (totalElement) {

        totalElement.textContent =
            `₹${total.toFixed(2)}`;

    }

}


/* =========================================================
   CHANGE QUANTITY
========================================================= */

function changeQuantity(
    index,
    change
) {

    if (!cart[index]) {
        return;
    }


    cart[index].quantity =
        Number(
            cart[index].quantity
        ) +
        Number(
            change
        );


    if (
        cart[index].quantity <= 0
    ) {

        cart.splice(
            index,
            1
        );

    }


    saveCart();

    updateCartCount();

    displayCart();

}


/* =========================================================
   REMOVE FROM CART
========================================================= */

function removeFromCart(
    index
) {

    if (!cart[index]) {
        return;
    }


    cart.splice(
        index,
        1
    );


    saveCart();

    updateCartCount();

    displayCart();

}

/* =========================================================
   AUTO-FILL CHECKOUT FROM CUSTOMER PROFILE
========================================================= */

async function loadCheckoutProfile() {
    const token = localStorage.getItem("authToken");

    if (!token) {
        return;
    }

    try {
        const response = await fetch("/api/profile/", {
            method: "GET",
            headers: {
                "Authorization": "Token " + token
            }
        });

        if (!response.ok) {
            throw new Error("Could not load customer profile");
        }

        const data = await response.json();

        const nameInput = document.getElementById("customerName");
        const phoneInput = document.getElementById("customerPhone");

        if (nameInput) {
            nameInput.value = data.username || "";
        }

        if (phoneInput) {
            phoneInput.value = data.phone || "";
        }

    } catch (error) {
        console.error("Checkout profile loading error:", error);
    }
}


/* =========================================================
   OPEN CHECKOUT
========================================================= */

function openCheckout() {

    if (
        !cart ||
        cart.length === 0
    ) {

        alert(
            "Your cart is empty."
        );

        return;
    }


    closeCart();


    const overlay =
        document.getElementById(
            "checkoutOverlay"
        );


    if (!overlay) {

        console.error(
            "checkoutOverlay not found."
        );

        return;
    }


    updateCheckoutSummary();

overlay.style.display = "flex";

loadCheckoutProfile();

}


/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckout() {

    const overlay =
        document.getElementById(
            "checkoutOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   UPDATE CHECKOUT SUMMARY
========================================================= */

function updateCheckoutSummary() {

    const itemsContainer =
        document.getElementById(
            "checkoutItems"
        );

    const subtotalElement =
        document.getElementById(
            "checkoutSubtotal"
        );

    const deliveryElement =
        document.getElementById(
            "deliveryFee"
        );

    const totalElement =
        document.getElementById(
            "checkoutTotal"
        );


    let subtotal = 0;


    if (itemsContainer) {

        itemsContainer.innerHTML =
            "";

    }


    cart.forEach(
        function (item) {

            const price =
                Number(
                    item.price
                );

            const quantity =
                Number(
                    item.quantity
                );


            const itemTotal =
                price *
                quantity;


            subtotal +=
                itemTotal;


            if (itemsContainer) {

                const itemElement =
                    document.createElement(
                        "div"
                    );


                itemElement.className =
                    "checkout-item";


                itemElement.innerHTML = `
                    <span>
                        ${item.name}
                        × ${quantity}
                    </span>

                    <strong>
                        ₹${itemTotal.toFixed(2)}
                    </strong>
                `;


                itemsContainer.appendChild(
                    itemElement
                );

            }

        }
    );


    const deliveryFee =
        cart.length > 0
            ? 40
            : 0;


    const grandTotal =
        subtotal +
        deliveryFee;


    if (subtotalElement) {

        subtotalElement.textContent =
            `₹${subtotal.toFixed(2)}`;

    }


    if (deliveryElement) {

        deliveryElement.textContent =
            `₹${deliveryFee.toFixed(2)}`;

    }


    if (totalElement) {

        totalElement.textContent =
            `₹${grandTotal.toFixed(2)}`;

    }

}


/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder(
    event
) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    const authToken =
        localStorage.getItem(
            "authToken"
        );


    if (!authToken) {

        alert(
            "Please login before placing an order."
        );

        closeCheckout();

        openLogin();

        return;
    }


    if (
        !cart ||
        cart.length === 0
    ) {

        alert(
            "Your cart is empty."
        );

        return;
    }


    const customerName =
        document.getElementById(
            "customerName"
        )?.value.trim();


    const phone =
        document.getElementById(
            "customerPhone"
        )?.value.trim();


    const address =
        document.getElementById(
            "customerAddress"
        )?.value.trim();


    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        )?.value;


    if (
        !customerName ||
        !phone ||
        !address ||
        !paymentMethod
    ) {

        alert(
            "Please fill all checkout details."
        );

        return;
    }


    const subtotal =
        cart.reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    Number(
                        item.price
                    ) *
                    Number(
                        item.quantity
                    )
                );

            },
            0
        );


    const deliveryFee =
        40;


    const totalAmount =
        subtotal +
        deliveryFee;


const orderItems = cart.map(function (item) {

    const foodId = Number(item.id);
    const quantity = Number(item.quantity);
    const price = Number(item.price);

    console.log("Preparing order item:", {
        foodId: foodId,
        quantity: quantity,
        price: price,
        originalItem: item
    });

    return {
        food: foodId,
        quantity: quantity,
        price: price
    };

});


    try {

        const response =
            await fetch(
                `${API_URL}/orders/`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Token ${authToken}`

                    },

                    body:
                        JSON.stringify({

                            customer_name:
                                customerName,

                            phone:
                                phone,

                            address:
                                address,

                            payment_method:
                                paymentMethod,

                            total_amount:
                                totalAmount,

                            items:
                                orderItems

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            
            
            console.error(
                "Order error:",
                data
            );


            alert(
                data.detail ||
                "Order could not be placed."
            );


            return;
        }


        /* Clear cart */

        cart = [];


        saveCart();

        updateCartCount();


        closeCheckout();

        closePayment();


        showOrderConfirmation(
            data
        );


    } catch (error) {

        console.error(
            "Order error:",
            error
        );


        alert(
            "Could not connect to the server."
        );

    }

}


/* =========================================================
   ORDER CONFIRMATION
========================================================= */
function showOrderConfirmation(order) {

    const overlay = document.getElementById(
        "orderConfirmationOverlay"
    );

    const orderIdElement = document.getElementById(
        "confirmationOrderId"
    );

    const orderId = order.order_id || "N/A";

    if (orderIdElement) {
        orderIdElement.textContent = orderId;
    }

    if (overlay) {
        overlay.style.display = "flex";
    }

}


function closeOrderConfirmation() {

    const overlay = document.getElementById(
        "orderConfirmationOverlay"
    );

    if (overlay) {
        overlay.style.display = "none";
    }

}


function viewOrdersFromConfirmation() {

    closeOrderConfirmation();

    openMyOrders();

}

/* =========================================================
   LOGIN
========================================================= */

function openLogin() {

    const overlay =
        document.getElementById(
            "loginOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "flex";

    }

}


function closeLogin() {

    const overlay =
        document.getElementById(
            "loginOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   REGISTER
========================================================= */

function openRegister() {

    const overlay =
        document.getElementById(
            "registerOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "flex";

    }

}


function closeRegister() {

    const overlay =
        document.getElementById(
            "registerOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   SWITCH LOGIN / REGISTER
========================================================= */

function switchToRegister() {

    closeLogin();

    openRegister();

}


function switchToLogin() {

    closeRegister();

    openLogin();

}


/* =========================================================
   REGISTER USER
========================================================= */

async function registerUser(
    event
) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    const username =
        document.getElementById(
            "registerUsername"
        )?.value.trim();


    const email =
        document.getElementById(
            "registerEmail"
        )?.value.trim();


    const password =
        document.getElementById(
            "registerPassword"
        )?.value;


    if (
        !username ||
        !email ||
        !password
    ) {

        alert(
            "Please fill all registration fields."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/register/`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            username:
                                username,

                            email:
                                email,

                            password:
                                password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                JSON.stringify(data)
            );

            return;
        }


        alert(
            "Registration successful! Please login."
        );


        closeRegister();

        openLogin();


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        alert(
            "Could not connect to server."
        );

    }

}


/* =========================================================
   LOGIN USER
========================================================= */

async function loginUser(
    event
) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    const username =
        document.getElementById(
            "loginUsername"
        )?.value.trim();


    const password =
        document.getElementById(
            "loginPassword"
        )?.value;


    if (
        !username ||
        !password
    ) {

        alert(
            "Please enter username and password."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/login/`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            username:
                                username,

                            password:
                                password

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.detail ||
                "Invalid username or password."
            );

            return;
        }


        localStorage.setItem(
            "authToken",
            data.token
        );


        localStorage.setItem(
            "username",
            data.username ||
            username
        );


        localStorage.setItem(
            "email",
            data.email ||
            ""
        );


        closeLogin();

        updateAuthButtons();


        showToast(
            "Login successful!"
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        alert(
            "Could not connect to server."
        );

    }

}


/* =========================================================
   AUTH BUTTONS
========================================================= */

function updateAuthButtons() {

    const authButtons =
        document.getElementById(
            "authButtons"
        );


    if (!authButtons) {
        return;
    }


    const authToken =
        localStorage.getItem(
            "authToken"
        );


    if (!authToken) {

        authButtons.innerHTML = `

            <button
                class="login-btn"
                id="loginButton"
                type="button"
            >
                Login
            </button>

            <button
                class="register-btn"
                id="registerButton"
                type="button"
            >
                Register
            </button>

        `;


        const loginButton =
            document.getElementById(
                "loginButton"
            );


        const registerButton =
            document.getElementById(
                "registerButton"
            );


        if (loginButton) {

            loginButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openLogin();

                }
            );

        }


        if (registerButton) {

            registerButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openRegister();

                }
            );

        }


        return;
    }


    const username =
        localStorage.getItem(
            "username"
        ) ||
        "User";


    authButtons.innerHTML = `

        <button
            class="profile-btn"
            id="profileButton"
            type="button"
        >
            👤 ${username}
        </button>

        <button
            class="my-orders-btn"
            id="myOrdersButton"
            type="button"
        >
            📦 My Orders
        </button>

        <button
            class="logout-btn"
            id="logoutButton"
            type="button"
        >
            Logout
        </button>

    `;


    const profileButton =
        document.getElementById(
            "profileButton"
        );


    const myOrdersButton =
        document.getElementById(
            "myOrdersButton"
        );


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (profileButton) {

        profileButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openProfile();

            }
        );

    }


    if (myOrdersButton) {

        myOrdersButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openMyOrders();

            }
        );

    }


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                logoutUser();

            }
        );

    }

}


/* =========================================================
   PROFILE
========================================================= */

function openProfile() {

    const authToken =
        localStorage.getItem(
            "authToken"
        );


    if (!authToken) {

        openLogin();

        return;
    }


    const overlay =
        document.getElementById(
            "profileOverlay"
        );


    const profileUsername =
        document.getElementById(
            "profileUsername"
        );


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    if (!overlay) {

        alert(
            "Profile section is missing."
        );

        return;
    }


    const username =
        localStorage.getItem(
            "username"
        ) ||
        "-";


    const email =
        localStorage.getItem(
            "email"
        ) ||
        "-";


    if (profileUsername) {

        profileUsername.textContent =
            username;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email;

    }


    overlay.style.display =
        "flex";

}

const token = localStorage.getItem("authToken");

fetch("/api/profile/", {
    method: "GET",
    headers: {
        "Authorization": "Token " + token
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error("Could not load profile");
    }
    return response.json();
})
.then(data => {
    document.getElementById("profileUsername").textContent =
        data.username || "-";

    document.getElementById("profileEmail").textContent =
        data.email || "-";

    document.getElementById("profilePhone").textContent =
        data.phone || "-";
})
.catch(error => {
    console.error("Profile loading error:", error);
});

// Open profile edit form
document.getElementById("editProfileBtn").addEventListener("click", function () {
    document.getElementById("editProfileUsername").value =
        document.getElementById("profileUsername").textContent;

    document.getElementById("editProfileEmail").value =
        document.getElementById("profileEmail").textContent;

    document.getElementById("editProfilePhone").value =
        document.getElementById("profilePhone").textContent;

    document.getElementById("profileEditForm").style.display = "block";
    document.getElementById("editProfileBtn").style.display = "none";
});

// Cancel editing
document.getElementById("cancelProfileEditBtn").addEventListener("click", function () {
    document.getElementById("profileEditForm").style.display = "none";
    document.getElementById("editProfileBtn").style.display = "inline-block";
});

// Save profile changes
document.getElementById("saveProfileBtn").addEventListener("click", async function () {
    const token = localStorage.getItem("authToken");

    if (!token) {
        alert("Please log in first.");
        return;
    }

    const username = document.getElementById("editProfileUsername").value.trim();
    const email = document.getElementById("editProfileEmail").value.trim();
    const phone = document.getElementById("editProfilePhone").value.trim();

    if (!username || !email) {
        alert("Username and email are required.");
        return;
    }

    const saveButton = document.getElementById("saveProfileBtn");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const response = await fetch("/api/profile/", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Token " + token
            },
            body: JSON.stringify({
                username: username,
                email: email,
                phone: phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || JSON.stringify(data));
            return;
        }

        // Update the profile display
        document.getElementById("profileUsername").textContent =
            data.username || username;

        document.getElementById("profileEmail").textContent =
            data.email || email;

        document.getElementById("profilePhone").textContent =
            data.phone || phone;

        // Update saved browser values if your site uses them
        localStorage.setItem("username", data.username || username);
        localStorage.setItem("email", data.email || email);

        document.getElementById("profileEditForm").style.display = "none";
        document.getElementById("editProfileBtn").style.display = "inline-block";

        alert("Profile updated successfully!");

    } catch (error) {
        console.error("Profile update error:", error);
        alert("Could not update profile. Please try again.");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
    }
});

/* =========================================================
   CLOSE PROFILE
========================================================= */

function closeProfile() {

    const overlay =
        document.getElementById(
            "profileOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   PROFILE → MY ORDERS
========================================================= */

function openMyOrdersFromProfile() {

    closeProfile();

    openMyOrders();

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "authToken"
    );

    localStorage.removeItem(
        "username"
    );

    localStorage.removeItem(
        "email"
    );


    closeProfile();

    updateAuthButtons();


    showToast(
        "Logged out successfully"
    );

}


/* =========================================================
   MY ORDERS AUTO-REFRESH
========================================================= */

let myOrdersRefreshTimer = null;
let isRefreshingMyOrders = false;


/* =========================================================
   OPEN MY ORDERS
========================================================= */

async function openMyOrders() {

    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
        openLogin();
        return;
    }

    const overlay = document.getElementById("myOrdersOverlay");
    const content = document.getElementById("myOrdersContent");

    if (!overlay || !content) {
        alert("My Orders section is missing.");
        return;
    }

    overlay.style.display = "flex";

    content.innerHTML = `
        <p>Loading your orders...</p>
    `;

    // Prevent multiple refresh timers.
    if (myOrdersRefreshTimer !== null) {
        clearInterval(myOrdersRefreshTimer);
        myOrdersRefreshTimer = null;
    }

    // Load orders immediately when opening.
    await refreshMyOrders();

    // Refresh the order list every 5 seconds.
    myOrdersRefreshTimer = setInterval(
        refreshMyOrders,
        5000
    );
}


/* =========================================================
   REFRESH MY ORDERS
========================================================= */

async function refreshMyOrders() {

    // Prevent overlapping requests.
    if (isRefreshingMyOrders) {
        return;
    }

    const overlay = document.getElementById("myOrdersOverlay");
    const content = document.getElementById("myOrdersContent");

    // Do not refresh if the popup is closed or missing.
    if (
        !overlay ||
        !content ||
        overlay.style.display === "none"
    ) {
        return;
    }

    const authToken = localStorage.getItem("authToken");

    if (!authToken) {
        closeMyOrders();
        openLogin();
        return;
    }

    isRefreshingMyOrders = true;

    try {

        const response = await fetch(
            `${API_URL}/my-orders/`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Token ${authToken}`
                }
            }
        );

        const orders = await response.json();

        if (!response.ok) {

            console.error("My Orders error:", orders);

            // Show an error only if there is no order list yet.
            if (!content.querySelector(".my-order-card")) {
                content.innerHTML = `
                    <p>Could not load your orders.</p>
                `;
            }

            return;
        }

        // Update the visible orders and their current statuses.
        displayMyOrders(orders);

    } catch (error) {

        console.error("My Orders refresh error:", error);

        // Keep the currently displayed orders if refresh fails.
        if (!content.querySelector(".my-order-card")) {
            content.innerHTML = `
                <p>Could not connect to the server.</p>
            `;
        }

    } finally {
        isRefreshingMyOrders = false;
    }
}


/* =========================================================
   CLOSE MY ORDERS
========================================================= */

function closeMyOrders() {

    const overlay = document.getElementById("myOrdersOverlay");

    // Stop automatic refresh when the popup closes.
    if (myOrdersRefreshTimer !== null) {
        clearInterval(myOrdersRefreshTimer);
        myOrdersRefreshTimer = null;
    }

    if (overlay) {
        overlay.style.display = "none";
    }
}
/* =========================================================
   DISPLAY MY ORDERS
========================================================= */

function displayMyOrders(orders) {

    const content = document.getElementById("myOrdersContent");

    if (!content) {
        return;
    }

    if (!orders || orders.length === 0) {

        content.innerHTML = `

            <div class="no-orders">

                <h3>
                    No Orders Yet
                </h3>

                <p>
                    Your orders will appear here.
                </p>

                <button
                    type="button"
                    onclick="closeMyOrders()"
                >
                    Start Ordering
                </button>

            </div>

        `;

        return;
    }


    content.innerHTML = "";


    orders.forEach(function (order) {

        const orderCard = document.createElement("div");

        orderCard.className = "my-order-card";


        /* =================================================
           ORDER STATUS
        ================================================= */

        const orderStatus = order.status || "Pending";


        /* =================================================
           STATUS CLASS
        ================================================= */

        const statusClass =
            orderStatus
                .toLowerCase()
                .replace(/\s+/g, "-");


        /* =================================================
           CREATED DATE
        ================================================= */

        const createdDate = order.created_at
            ? new Date(order.created_at).toLocaleString()
            : "";


        /* =================================================
           ITEMS
        ================================================= */

        let itemsHTML = "";


        if (
            order.items &&
            order.items.length > 0
        ) {

            order.items.forEach(function (item) {

                itemsHTML += `

                    <div class="my-order-item">

                        <img
                                src="/static/food/${item.food_image || "images/food.jpg"}"
            alt="${
                item.food_name || "Food"
                            }"
                            onerror="
                                this.onerror=null;
                                this.src='/static/food/images/food.jpg';
                            "
                        >

                        <div>

                            <strong>
                                ${
                                    item.food_name ||
                                    "Food Item"
                                }
                            </strong>

                            <p>
                                Quantity:
                                ${
                                    item.quantity
                                }
                            </p>

                            <p>
                                Price:
                                ₹${
                                    item.price
                                }
                            </p>

                        </div>

                    </div>

                `;

            });

        }


        /* =================================================
           STATUS PROGRESS
        ================================================= */

        const statusSteps = [
            "Pending",
            "Confirmed",
            "Preparing",
            "Out for Delivery",
            "Delivered"
        ];


        let statusProgressHTML = "";


        statusSteps.forEach(function (step, index) {

            const currentIndex =
                statusSteps.indexOf(orderStatus);


            let stepClass = "";


            if (index < currentIndex) {

                stepClass = "completed";

            } else if (index === currentIndex) {

                stepClass = "active";

            }


            statusProgressHTML += `

                <div class="status-step ${stepClass}">

                    <div class="status-circle">
                        ${index + 1}
                    </div>

                    <span>
                        ${step}
                    </span>

                </div>

            `;

        });


        /* =================================================
           ORDER CARD
        ================================================= */

        orderCard.innerHTML = `

            <div class="my-order-top">

                <div>

                    <h3>
                        Order #${order.order_id}
                    </h3>

                    <p>
                        ${createdDate}
                    </p>

                </div>


                <span
                    class="order-status status-${statusClass}"
                >
                    ${orderStatus}
                </span>

            </div>


            <!-- ORDER STATUS TRACKER -->

            <div class="order-tracking">

                <h4>
                    Order Status
                </h4>

                <div class="status-progress">

                    ${statusProgressHTML}

                </div>

            </div>


            <!-- ORDER ITEMS -->

            <div class="my-order-items">

                ${itemsHTML}

            </div>


            <!-- ORDER TOTAL -->

            <div class="my-order-bottom">

                <span>
                    Payment:
                    ${order.payment_method}
                </span>


                <strong>
                    ₹${order.total_amount}
                </strong>

            </div>

        `;


        content.appendChild(orderCard);

    });

}

/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "toast"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (toastMessage) {

        toastMessage.textContent =
            message;

    }


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "toast";


        toast.style.position =
            "fixed";


        toast.style.bottom =
            "30px";


        toast.style.right =
            "30px";


        toast.style.background =
            "#333";


        toast.style.color =
            "#fff";


        toast.style.padding =
            "12px 20px";


        toast.style.borderRadius =
            "10px";


        toast.style.zIndex =
            "1000000";


        toast.style.fontSize =
            "14px";


        document.body.appendChild(
            toast
        );

    }


    if (!toastMessage) {

        toast.textContent =
            message;

    }


    toast.style.display =
        "block";


    clearTimeout(
        window.biteBlissToastTimer
    );


    window.biteBlissToastTimer =
        setTimeout(
            function () {

                toast.style.display =
                    "none";

            },
            2500
        );

}


/* =========================================================
   PAYMENT
========================================================= */

function handlePayment() {

    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        );


    if (!paymentMethod) {

        alert(
            "Payment method section is missing."
        );

        return;
    }


    const selectedMethod =
        paymentMethod.value;


    if (!selectedMethod) {

        alert(
            "Please select a payment method."
        );

        return;
    }


    /*
       Validate checkout details
       before opening payment
    */

    const customerName =
        document.getElementById(
            "customerName"
        )?.value.trim();


    const phone =
        document.getElementById(
            "customerPhone"
        )?.value.trim();


    const address =
        document.getElementById(
            "customerAddress"
        )?.value.trim();


    if (
        !customerName ||
        !phone ||
        !address
    ) {

        alert(
            "Please fill all delivery details."
        );

        return;
    }


    /*
       Cash on Delivery
    */

    if (
        selectedMethod ===
        "Cash on Delivery"
    ) {

        placeOrder();

        return;
    }


    /*
       Calculate payment amount
    */

    const subtotal =
        cart.reduce(
            function (
                total,
                item
            ) {

                return (
                    total +
                    Number(
                        item.price
                    ) *
                    Number(
                        item.quantity
                    )
                );

            },
            0
        );


    const totalAmount =
        subtotal + 40;


    const paymentOverlay =
        document.getElementById(
            "paymentOverlay"
        );


    const paymentAmount =
        document.getElementById(
            "paymentAmount"
        );


    const upiPayment =
        document.getElementById(
            "upiPayment"
        );


    const cardPayment =
        document.getElementById(
            "cardPayment"
        );


    if (!paymentOverlay) {

        alert(
            "Payment section is missing."
        );

        return;
    }


    if (paymentAmount) {

        paymentAmount.textContent =
            `₹${totalAmount.toFixed(2)}`;

    }


    if (upiPayment) {

        upiPayment.style.display =
            "none";

    }


    if (cardPayment) {

        cardPayment.style.display =
            "none";

    }


    if (
        selectedMethod ===
        "UPI"
    ) {

        if (upiPayment) {

            upiPayment.style.display =
                "block";

        }

    }


    if (
        selectedMethod ===
        "Card"
    ) {

        if (cardPayment) {

            cardPayment.style.display =
                "block";

        }

    }


    paymentOverlay.style.display =
        "flex";

}


/* =========================================================
   CLOSE PAYMENT
========================================================= */

function closePayment() {

    const paymentOverlay =
        document.getElementById(
            "paymentOverlay"
        );


    if (paymentOverlay) {

        paymentOverlay.style.display =
            "none";

    }

}


/* =========================================================
   PROCESS PAYMENT
========================================================= */

function processPayment() {

    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        )?.value;


    if (
        paymentMethod ===
        "UPI"
    ) {

        const upiId =
            document.getElementById(
                "upiId"
            )?.value.trim();


        if (!upiId) {

            alert(
                "Please enter your UPI ID."
            );

            return;
        }


        if (
            !upiId.includes("@")
        ) {

            alert(
                "Please enter a valid UPI ID."
            );

            return;
        }

    }


    if (
        paymentMethod ===
        "Card"
    ) {

        const cardNumber =
            document.getElementById(
                "cardNumber"
            )?.value.trim();


        const cardExpiry =
            document.getElementById(
                "cardExpiry"
            )?.value.trim();


        const cardCVV =
            document.getElementById(
                "cardCVV"
            )?.value.trim();


        if (
            !cardNumber ||
            !cardExpiry ||
            !cardCVV
        ) {

            alert(
                "Please fill all card details."
            );

            return;
        }


        if (
            cardNumber.length < 12
        ) {

            alert(
                "Please enter a valid card number."
            );

            return;
        }


        if (
            cardCVV.length !== 3
        ) {

            alert(
                "Please enter a valid CVV."
            );

            return;
        }

    }


    /*
       This is still a DEMO payment.
       No real money is processed.
    */

    alert(
        "Payment successful! 🎉"
    );


    closePayment();


    placeOrder();

}


/* =========================================================
   CLOSE OVERLAYS WHEN CLICKING OUTSIDE
========================================================= */

window.addEventListener(
    "click",
    function (event) {

        const overlays = [

            {
                element:
                    document.getElementById(
                        "profileOverlay"
                    ),

                close:
                    closeProfile

            },

            {
                element:
                    document.getElementById(
                        "myOrdersOverlay"
                    ),

                close:
                    closeMyOrders

            },

            {
                element:
                    document.getElementById(
                        "cartOverlay"
                    ),

                close:
                    closeCart

            },

            {
                element:
                    document.getElementById(
                        "checkoutOverlay"
                    ),

                close:
                    closeCheckout

            },

            {
                element:
                    document.getElementById(
                        "paymentOverlay"
                    ),

                close:
                    closePayment

            }

        ];


        overlays.forEach(
            function (item) {

                if (
                    item.element &&
                    event.target ===
                    item.element
                ) {

                    item.close();

                }

            }
        );

    }
);

/* =========================================================
   FAVORITES
========================================================= */

async function toggleFavorite(
    foodId,
    button
) {

    const authToken =
        localStorage.getItem("authToken");

    if (!authToken) {

        showToast(
            "Please login to use favorites."
        );

        openLogin();

        return;

    }

    const isFavorite =
        favoriteFoodIds.has(
            Number(foodId)
        );

    try {

        const response =
            await fetch(
                `${API_URL}/favorites/`,
                {
                    method:
                        isFavorite
                            ? "DELETE"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Token ${authToken}`
                    },

                    body:
                        JSON.stringify({
                            food_id:
                                foodId
                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            console.error(
                "Favorite error:",
                data
            );

            showToast(
                "Could not update favorite."
            );

            return;

        }


        /* =========================================
           UPDATE LOCAL FAVORITE STATE
        ========================================= */

        if (isFavorite) {

            favoriteFoodIds.delete(
                Number(foodId)
            );

            button.classList.remove(
                "active"
            );

            button.textContent = "♡";

            button.setAttribute(
                "aria-label",
                "Add to favorites"
            );

            showToast(
                "Removed from favorites"
            );

        } else {

            favoriteFoodIds.add(
                Number(foodId)
            );

            button.classList.add(
                "active"
            );

            button.textContent = "♥";

            button.setAttribute(
                "aria-label",
                "Remove from favorites"
            );

            showToast(
                "Added to favorites"
            );

        }

    } catch (error) {

        console.error(
            "Favorite error:",
            error
        );

        showToast(
            "Could not connect to server."
        );

    }
}

/* =========================================================
   LOAD FAVORITE FOOD IDS
========================================================= */

async function loadFavoriteIds() {

    const authToken =
        localStorage.getItem("authToken");

    if (!authToken) {

        favoriteFoodIds.clear();

        return;

    }

    try {

        const response =
            await fetch(
                `${API_URL}/favorites/`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Token ${authToken}`
                    }
                }
            );

        if (!response.ok) {

            console.error(
                "Could not load favorite IDs."
            );

            return;

        }

        const data =
            await response.json();

        favoriteFoodIds =
            new Set(
                data.map(
                    food => Number(food.id)
                )
            );

    } catch (error) {

        console.error(
            "Favorite loading error:",
            error
        );

    }
}

/* =========================================================
   MY FAVORITES
========================================================= */

const favoritesBtn =
    document.getElementById("favoritesBtn");

const favoritesOverlay =
    document.getElementById("favoritesOverlay");

const favoritesClose =
    document.getElementById("favoritesClose");

const favoritesContainer =
    document.getElementById("favoritesContainer");


/* =========================================================
   OPEN FAVORITES
========================================================= */

if (favoritesBtn) {

    favoritesBtn.addEventListener(
        "click",
        function () {

            const authToken =
                localStorage.getItem(
                    "authToken"
                );

            if (!authToken) {

                showToast(
                    "Please login to view favorites."
                );

                openLogin();

                return;
            }

            favoritesOverlay.style.display =
                "flex";

            loadFavorites();

        }
    );

}


/* =========================================================
   CLOSE FAVORITES
========================================================= */

if (favoritesClose) {

    favoritesClose.addEventListener(
        "click",
        function () {

            favoritesOverlay.style.display =
                "none";

        }
    );

}


/* Close when clicking outside */
if (favoritesOverlay) {

    favoritesOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                favoritesOverlay
            ) {

                favoritesOverlay.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   LOAD FAVORITES
========================================================= */
async function loadFavorites() {

    const authToken =
        localStorage.getItem("authToken");

    if (!authToken) {
        console.error("No authentication token found.");
        return;
    }

    const container =
        document.getElementById(
            "favoritesContainer"
        );

    if (!container) {
        console.error(
            "favoritesContainer not found."
        );
        return;
    }

    container.innerHTML = `
        <p class="favorites-loading">
            Loading favorites...
        </p>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/favorites/`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Token ${authToken}`
                    }
                }
            );

        console.log(
            "Favorites API status:",
            response.status
        );

        const data =
            await response.json();

        console.log(
            "Favorites API data:",
            data
        );

        if (!response.ok) {

            console.error(
                "Favorites API error:",
                data
            );

            container.innerHTML = `
                <div class="empty-favorites">

                    <div class="empty-favorites-icon">
                        ⚠️
                    </div>

                    <h3>
                        Could not load favorites
                    </h3>

                    <p>
                        Server returned:
                        ${response.status}
                    </p>

                </div>
            `;

            return;
        }

        /*
           Make sure favorite IDs are updated
           before displaying the cards.
        */

        favoriteFoodIds =
            new Set(
                data.map(
                    food => Number(food.id)
                )
            );

        displayFavorites(data);

    } catch (error) {

        console.error(
            "Favorites connection error:",
            error
        );

        container.innerHTML = `
            <div class="empty-favorites">

                <div class="empty-favorites-icon">
                    ⚠️
                </div>

                <h3>
                    Connection error
                </h3>

                <p>
                    ${error.message}
                </p>

            </div>
        `;
    }
}

/* =========================================================
   DISPLAY FAVORITES
========================================================= */

function displayFavorites(favoriteFoods) {

    if (!favoriteFoods || favoriteFoods.length === 0) {

        favoritesContainer.innerHTML = `
            <div class="empty-favorites">

                <div class="empty-favorites-icon">
                    ❤️
                </div>

                <h3>No favorites yet</h3>

                <p>
                    Save your favorite foods and
                    order them quickly later.
                </p>

            </div>
        `;

        return;
    }

    favoritesContainer.innerHTML = "";

    favoriteFoods.forEach(function (food) {

        const card =
            document.createElement("div");

        card.className = "favorite-card";

        const image =
            getFoodImage(food.image);

        const isDrink =
            String(food.category || "").trim().toLowerCase() === "drinks";

        card.innerHTML = `

            <div class="favorite-card-top">

                <img
                    class="favorite-card-image"
                    src="${image}"
                    alt="${food.name}"
                    onerror="
                        this.onerror=null;
                        this.src='/static/food/images/pizza.jpg';
                    "
                >

                <button
    type="button"
    class="favorite-btn ${
        favoriteFoodIds.has(Number(food.id))
            ? "active"
            : ""
    }"
    data-food-id="${food.id}"
    aria-label="Add to favorites"
>
    ${
        favoriteFoodIds.has(Number(food.id))
            ? "♥"
            : "♡"
    }
</button>
            </div>

            <div class="favorite-card-info">

                <p class="favorite-card-category">
                    ${food.category || ""}
                </p>

                <h3>
                    ${food.name}
                </h3>

                <div class="favorite-card-rating">
                    ⭐ ${food.rating || 0}
                    (${food.reviews || 0})
                </div>

                <p class="favorite-card-description">
                    ${food.description || ""}
                </p>

                <div class="favorite-card-bottom">

    <strong class="favorite-card-price">
        ₹${food.price}
    </strong>

    <button
    type="button"
    class="favorite-add-btn"
>
    Add to Cart
</button>



<button
    type="button"
    class="favorite-remove-btn"
>
    Remove
</button>
        `;


        /* =========================================
           OPEN FOOD DETAILS
        ========================================= */

        card.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest(
                        ".favorite-btn"
                    )
                ) {
                    return;
                }

                if (
                    event.target.closest(
                        ".favorite-add-btn"
                    )
                ) {
                    return;
                }

                openFoodDetails(food);

            }
        );

        /* =========================================================
   REMOVE FAVORITE FROM FAVORITES LIST
========================================================= */

async function removeFavoriteFromList(foodId) {

    const authToken =
        localStorage.getItem("authToken");

    if (!authToken) {
        showToast("Please login to manage favorites.");
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/favorites/`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Token ${authToken}`
                    },

                    body: JSON.stringify({
                        food_id: Number(foodId)
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "Remove favorite response:",
            response.status,
            data
        );

        if (!response.ok) {

            console.error(
                "Remove favorite error:",
                data
            );

            showToast(
                "Could not remove favorite."
            );

            return;
        }

        /* Remove from local favorite list */

        favoriteFoodIds.delete(
            Number(foodId)
        );

        /* Refresh main food cards */

        displayFoods(foods);

        /* Refresh Favorites popup */

        await loadFavorites();

        showToast(
            "Removed from favorites"
        );

    } catch (error) {

        console.error(
            "Remove favorite connection error:",
            error
        );

        showToast(
            "Could not connect to server."
        );
    }
}
        /* =========================================
           ADD TO CART
        ========================================= */

        const addButton =
            card.querySelector(
                ".favorite-add-btn"
            );

        addButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                addToCart(
                    Number(food.id)
                );

                showToast(
                    `${food.name} added to cart`
                );

            }
        );


        /* =========================================
   REMOVE FAVORITE
========================================= */

const heartButton =
    card.querySelector(".favorite-btn");

const removeButton =
    card.querySelector(".favorite-remove-btn");


if (heartButton) {

    heartButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();

            await removeFavoriteFromList(
                Number(food.id)
            );

        }
    );

}


if (removeButton) {

    removeButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "Remove button clicked:",
                food.id
            );

            await removeFavoriteFromList(
                Number(food.id)
            );

        }
    );

}
        favoritesContainer.appendChild(card);

    });
}