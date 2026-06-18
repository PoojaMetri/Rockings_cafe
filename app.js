// RocKings Cafe Website Interactions (Full-stack version with MySQL Backend Integration & Checkout Portal)

// --- BACKEND API BASE URL (relative path in cloud, absolute on port 3000 during local port 8080 testing) ---
const API_URL = window.location.origin.includes('localhost:') || window.location.origin.includes('127.0.0.1:')
  ? (window.location.origin.includes(':8080') ? 'http://localhost:3000/api' : `${window.location.origin}/api`)
  : `${window.location.origin}/api`;

// --- FALLBACK REVIEWS DATA (Used if server is offline) ---
const DEFAULT_REVIEWS = [
  {
    name: "Rahul Sharma",
    stars: 5,
    review_date: "14 Jun 2026",
    comment: "The ambiance is incredible, especially the warm lighting! The hookah and signature pasta are absolute must-tries. Best spot in Yelahanka."
  },
  {
    name: "Priyanshi M.",
    stars: 5,
    review_date: "28 May 2026",
    comment: "Highly recommended cafe behind Essar fuel station. Extremely cozy, peaceful, and perfect for catching up with friends. Friendly staff!"
  },
  {
    name: "Vikram K.",
    stars: 4,
    review_date: "10 May 2026",
    comment: "Awesome mocktails, love the smoking presentation. Food taste is superb and pocket-friendly (around ₹300 per head). Clean and fast service."
  }
];

// --- APP STATE ---
let menuItems = [];
let cart = [];
let reviews = [];
let currentReviewRating = 5;
let upiCountdownInterval = null;

// --- DOM ELEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCart();
  initBooking();
  setupScrollEffects();
  initCheckoutPortal();
  
  // Fetch dynamic components from MySQL backend
  fetchMenu();
  fetchReviews();
});

// --- NAVBAR SCROLL & MOBILE TOGGLE ---
function initNavbar() {
  const header = document.querySelector('.header');
  const navLinks = document.querySelector('.nav-links');
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  
  // Sticky Navbar on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
  
  // Mobile Menu Toggle
  toggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const icon = toggleBtn.querySelector('i');
    if (navLinks.classList.contains('open')) {
      icon.className = 'fas fa-times';
    } else {
      icon.className = 'fas fa-bars';
    }
  });

  // Close Mobile Menu on Link Click
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggleBtn.querySelector('i').className = 'fas fa-bars';
    });
  });
}

// --- ACTIVE NAVIGATION HIGHLIGHT ---
function setupScrollEffects() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.pageYOffset + 150;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

// --- FETCH MENU FROM DATABASE ---
async function fetchMenu() {
  const menuGrid = document.querySelector('.menu-grid');
  try {
    menuGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-primary);">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 12px;"></i>
        <p>Loading chef specialties from database...</p>
      </div>
    `;
    const response = await fetch(`${API_URL}/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    menuItems = await response.json();
    initMenu();
  } catch (error) {
    console.error('Error fetching menu from backend:', error);
    menuGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-secondary);">
        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 12px;"></i>
        <p>Unable to connect to the database server. Please verify your backend server is running.</p>
      </div>
    `;
  }
}

// --- DYNAMIC MENU RENDER & FILTERING ---
function initMenu() {
  const menuGrid = document.querySelector('.menu-grid');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Load Menu Items
  function renderMenu(categoryFilter = 'all') {
    menuGrid.innerHTML = '';
    
    const filteredItems = categoryFilter === 'all' 
      ? menuItems 
      : menuItems.filter(item => item.category === categoryFilter || (categoryFilter === 'signatures' && item.is_signature));
      
    if (filteredItems.length === 0) {
      menuGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted);">
          <p>No items found in this category.</p>
        </div>
      `;
      return;
    }

    filteredItems.forEach(item => {
      const card = document.createElement('div');
      card.className = `menu-card glass-card`;
      card.innerHTML = `
        <div class="menu-img-wrapper">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          ${item.is_signature ? '<span class="menu-badge"><i class="fas fa-crown"></i> Chef Special</span>' : ''}
        </div>
        <div class="menu-info">
          <div class="menu-title-row">
            <h4 class="menu-item-title">${item.name}</h4>
            <span class="menu-item-price">₹${item.price}</span>
          </div>
          <p class="menu-item-desc">${item.description}</p>
          <div class="menu-action-row">
            <div class="diet-indicator ${item.diet}">
              <span class="diet-dot"></span>
              <span>${item.diet === 'veg' ? 'VEG' : 'NON-VEG'}</span>
            </div>
            <button class="add-to-cart-btn" data-id="${item.id}">
              <i class="fas fa-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      `;
      menuGrid.appendChild(card);
    });

    // Add To Cart Event Listeners
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.currentTarget.getAttribute('data-id');
        addToCart(itemId);
      });
    });
  }

  // Set Filter Event
  filterButtons.forEach(btn => {
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    
    clone.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.getAttribute('data-filter');
      renderMenu(category);
    });
  });

  renderMenu('all');
}

// --- VIRTUAL CART SYSTEM ---
function initCart() {
  const cartToggle = document.querySelector('.cart-icon-btn');
  const cartDrawer = document.querySelector('.cart-drawer');
  const cartOverlay = document.querySelector('.cart-overlay');
  const closeCart = document.querySelector('.close-cart-btn');
  const checkoutBtn = document.querySelector('.checkout-btn');

  // Toggle Cart
  cartToggle.addEventListener('click', () => {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
  });

  const closeCartFn = () => {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
  };

  closeCart.addEventListener('click', closeCartFn);
  cartOverlay.addEventListener('click', closeCartFn);

  // Load cart from LocalStorage
  if (localStorage.getItem('rockings_cart')) {
    cart = JSON.parse(localStorage.getItem('rockings_cart'));
    updateCartUI();
  }

  // Proceed to secure checkout portal
  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    
    // Close cart drawer
    closeCartFn();
    
    // Open payment modal
    openPaymentModal();
  });
}

function addToCart(id) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;

  const existingItemIndex = cart.findIndex(c => c.id === id);
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += 1;
  } else {
    cart.push({
      ...item,
      quantity: 1
    });
  }

  // Save to LocalStorage
  localStorage.setItem('rockings_cart', JSON.stringify(cart));
  
  updateCartUI();
  
  // Micro-feedback
  const cartBtn = document.querySelector('.cart-icon-btn');
  cartBtn.classList.add('shake');
  setTimeout(() => cartBtn.classList.remove('shake'), 400);

  // Auto open cart drawer
  document.querySelector('.cart-drawer').classList.add('open');
  document.querySelector('.cart-overlay').classList.add('open');
}

function updateCartUI() {
  const cartBadge = document.querySelector('.cart-badge');
  const cartContainer = document.querySelector('.cart-items-container');
  const cartTotalPrice = document.querySelector('.cart-total-price');

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalCount;
  cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty-message">
        <div class="cart-empty-icon"><i class="fas fa-shopping-bag"></i></div>
        <p>Your cart is empty.</p>
        <p style="font-size: 0.8rem; margin-top: 8px;">Explore our menu and add items to taste premium goodness!</p>
      </div>
    `;
    cartTotalPrice.textContent = '₹0';
    return;
  }

  cartContainer.innerHTML = '';
  let totalPrice = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <p class="cart-item-price">₹${item.price}</p>
      </div>
      <div class="cart-item-qty-control">
        <button class="qty-btn dec-btn" data-id="${item.id}"><i class="fas fa-minus"></i></button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn inc-btn" data-id="${item.id}"><i class="fas fa-plus"></i></button>
      </div>
    `;
    cartContainer.appendChild(row);
  });

  cartTotalPrice.textContent = `₹${totalPrice}`;

  document.querySelectorAll('.dec-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      updateQuantity(e.currentTarget.getAttribute('data-id'), -1);
    });
  });

  document.querySelectorAll('.inc-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      updateQuantity(e.currentTarget.getAttribute('data-id'), 1);
    });
  });
}

function updateQuantity(id, delta) {
  const itemIndex = cart.findIndex(c => c.id === id);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;
  
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  localStorage.setItem('rockings_cart', JSON.stringify(cart));
  updateCartUI();
}

// --- PREMIUM CHECKOUT PORTAL & PAYMENT SIMULATION ---
let selectedPaymentMethod = 'card';

function initCheckoutPortal() {
  const payModal = document.getElementById('payment-modal');
  const closePayBtn = document.getElementById('close-payment-btn');
  const payTabs = document.querySelectorAll('.pay-tab');
  
  // Close Payment Modal
  closePayBtn.addEventListener('click', () => {
    payModal.classList.remove('open');
    document.body.style.overflow = '';
    stopUPITimer();
  });

  // Tab switching logic
  payTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      payTabs.forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const method = e.currentTarget.getAttribute('data-method');
      selectedPaymentMethod = method;
      
      // Toggle form displays
      document.querySelectorAll('.pay-form').forEach(f => f.classList.remove('active'));
      
      if (method === 'card') {
        document.getElementById('card-payment-form').classList.add('active');
        stopUPITimer();
      } else if (method === 'upi') {
        document.getElementById('upi-payment-screen').classList.add('active');
        startUPITimer();
      } else {
        document.getElementById('counter-payment-screen').classList.add('active');
        stopUPITimer();
      }
    });
  });

  // Card Input Masks and Formatting
  const cardNumberInput = document.getElementById('card-number');
  const cardExpiryInput = document.getElementById('card-expiry');
  const cardBrandIcon = document.getElementById('card-brand-icon');

  cardNumberInput.addEventListener('input', (e) => {
    // Digit mask: group into blocks of 4
    let val = e.target.value.replace(/\D/g, '');
    let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
    e.target.value = formatted;

    // Card brand detection mock logo
    if (val.startsWith('4')) {
      cardBrandIcon.innerHTML = '<i class="fab fa-cc-visa" style="color: #1a1f71;"></i>';
    } else if (val.startsWith('5')) {
      cardBrandIcon.innerHTML = '<i class="fab fa-cc-mastercard" style="color: #eb001b;"></i>';
    } else if (val.startsWith('3')) {
      cardBrandIcon.innerHTML = '<i class="fab fa-cc-amex" style="color: #007bc1;"></i>';
    } else {
      cardBrandIcon.innerHTML = '<i class="far fa-credit-card"></i>';
    }
  });

  cardExpiryInput.addEventListener('input', (e) => {
    // Expiry mask: MM/YY
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
    } else {
      e.target.value = val;
    }
  });

  // Form Submissions
  document.getElementById('card-payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    executePaymentSimulation('card');
  });

  document.getElementById('upi-pay-btn').addEventListener('click', () => {
    executePaymentSimulation('upi');
  });

  document.getElementById('counter-pay-btn').addEventListener('click', () => {
    executePaymentSimulation('cash');
  });

  // Close Receipt Modal
  document.getElementById('close-receipt-btn').addEventListener('click', () => {
    document.getElementById('receipt-modal').classList.remove('open');
    document.body.style.overflow = '';
  });
}

function openPaymentModal() {
  const payModal = document.getElementById('payment-modal');
  payModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Calculate pricing details
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.05);
  const grandtotal = subtotal + tax;

  // Set cost fields
  document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
  document.getElementById('summary-tax').textContent = `₹${tax}`;
  document.getElementById('summary-grandtotal').textContent = `₹${grandtotal}`;
  document.getElementById('card-pay-btn').textContent = `Pay ₹${grandtotal}`;
  document.getElementById('upi-pay-btn').textContent = `Simulate Payment of ₹${grandtotal}`;

  // Populate checkout items summary
  const summaryList = document.getElementById('summary-items-list');
  summaryList.innerHTML = '';
  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'summary-item-row';
    row.innerHTML = `
      <span class="summary-item-name">${item.name} <strong style="color: var(--color-primary);">x${item.quantity}</strong></span>
      <span>₹${item.price * item.quantity}</span>
    `;
    summaryList.appendChild(row);
  });

  // Reset tab active
  selectedPaymentMethod = 'card';
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.pay-tab[data-method="card"]').classList.add('active');
  document.querySelectorAll('.pay-form').forEach(f => f.classList.remove('active'));
  document.getElementById('card-payment-form').classList.add('active');
  document.getElementById('card-payment-form').reset();
  document.getElementById('card-brand-icon').innerHTML = '<i class="far fa-credit-card"></i>';
}

// UPI Countdown Clock (5 minutes)
function startUPITimer() {
  stopUPITimer();
  let timeRemaining = 300; // 5 mins in seconds
  const timerSpan = document.getElementById('upi-timer');
  
  upiCountdownInterval = setInterval(() => {
    timeRemaining--;
    const minutes = Math.floor(timeRemaining / 60);
    let seconds = timeRemaining % 60;
    if (seconds < 10) seconds = '0' + seconds;
    timerSpan.textContent = `0${minutes}:${seconds}`;

    if (timeRemaining <= 0) {
      stopUPITimer();
      timerSpan.textContent = 'Expired';
      alert('UPI QR Code has expired. Please re-open the checkout payment portal.');
      document.getElementById('payment-modal').classList.remove('open');
      document.body.style.overflow = '';
    }
  }, 1000);
}

function stopUPITimer() {
  if (upiCountdownInterval) {
    clearInterval(upiCountdownInterval);
    upiCountdownInterval = null;
  }
}

// Payment loader flow
function executePaymentSimulation(method) {
  // Close Payment Modal
  document.getElementById('payment-modal').classList.remove('open');
  stopUPITimer();

  // Open Processing Overlay Screen
  const overlay = document.getElementById('processing-overlay');
  const statusContainer = document.getElementById('processing-status-list');
  overlay.classList.add('open');
  statusContainer.innerHTML = '';

  const stages = [
    { text: 'Connecting to bank secure gateway...', time: 1000 },
    { text: 'Authenticating cafe merchant profile...', time: 2000 },
    { 
      text: method === 'card' ? 'Validating credentials and verifying secure CVV signature...' :
            method === 'upi' ? 'Awaiting remote device UPI confirmation PIN...' : 
            'Initializing counter invoice bill register...', 
      time: 3200 
    },
    { text: 'Authorizing payment transaction payload...', time: 4200 },
    { text: 'Finalizing database transaction records...', time: 5000 }
  ];

  stages.forEach(stage => {
    setTimeout(() => {
      // De-active previous logs
      document.querySelectorAll('.status-log-entry').forEach(entry => entry.classList.remove('active'));
      
      const log = document.createElement('div');
      log.className = 'status-log-entry active';
      log.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${stage.text}</span>`;
      statusContainer.appendChild(log);
      statusContainer.scrollTop = statusContainer.scrollHeight;
    }, stage.time);
  });

  // Finish processing: Submit to Database & Show Receipt
  setTimeout(async () => {
    // Generate Random Transaction ID
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let transactionId = 'TXN_';
    for (let i = 0; i < 10; i++) {
      transactionId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    if (method === 'cash') transactionId = 'COUNTER_CASH';

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.05);
    const grandtotal = subtotal + tax;
    const paymentStatus = method === 'cash' ? 'pending' : 'paid';

    try {
      // 1. Submit cart order details to MySQL API
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_price: grandtotal,
          items: cart,
          payment_method: method,
          payment_status: paymentStatus,
          transaction_id: transactionId
        })
      });

      if (!response.ok) throw new Error('Order backend submission failed');
      const orderResult = await response.json();

      // Close loader
      overlay.classList.remove('open');

      // 2. Open Receipt Modal & Render dynamic values
      openReceiptModal(orderResult.orderId, transactionId, method, paymentStatus, subtotal, tax, grandtotal);

      // 3. Reset Cart
      cart = [];
      localStorage.removeItem('rockings_cart');
      updateCartUI();
    } catch (error) {
      console.error('Checkout error:', error);
      overlay.classList.remove('open');
      alert('Server integration error. Your payment succeeded but we failed to write records to the database. Please call us at +91 98765 43210.');
    }
  }, 6200);
}

function openReceiptModal(orderId, txnId, method, status, subtotal, tax, grandtotal) {
  const receipt = document.getElementById('receipt-modal');
  receipt.classList.add('open');

  // Set date
  const today = new Date();
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  document.getElementById('invoice-date').textContent = today.toLocaleDateString('en-US', options);

  // Set Meta values
  document.getElementById('invoice-order-id').textContent = `#${orderId}`;
  document.getElementById('invoice-trans-id').textContent = txnId;
  
  let methodLabel = method === 'card' ? 'Credit/Debit Card' : method === 'upi' ? 'UPI QR Scan' : 'Pay at Counter';
  document.getElementById('invoice-pay-method').textContent = methodLabel;
  
  const statusBadge = document.getElementById('invoice-status');
  statusBadge.className = `status-badge ${status}`;
  statusBadge.textContent = status.toUpperCase();

  // Set pricing values
  document.getElementById('invoice-subtotal').textContent = `₹${subtotal}`;
  document.getElementById('invoice-tax').textContent = `₹${tax}`;
  document.getElementById('invoice-grandtotal').textContent = `₹${grandtotal}`;

  // Populate receipt items list
  const invoiceItems = document.getElementById('invoice-items');
  invoiceItems.innerHTML = '';
  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.innerHTML = `
      <span>${item.name} (x${item.quantity})</span>
      <span>₹${item.price * item.quantity}</span>
    `;
    invoiceItems.appendChild(row);
  });
}

// --- TABLE BOOKING FORM API HANDLER ---
function initBooking() {
  const bookingForm = document.getElementById('table-booking-form');
  const bookingPanel = document.querySelector('.booking-form-panel');
  
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('booking-name').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    const guests = document.getElementById('booking-guests').value;
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;

    if (!name || !phone || !date || !time) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing reservation...';

      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: phone,
          guests: parseInt(guests),
          booking_date: date,
          booking_time: time
        })
      });

      if (!response.ok) throw new Error('Booking failed');
      const result = await response.json();

      const successOverlay = document.createElement('div');
      successOverlay.className = 'form-success-overlay active';
      successOverlay.innerHTML = `
        <div class="success-icon-box">
          <i class="fas fa-check"></i>
        </div>
        <h3 class="success-title">Table Reserved!</h3>
        <p class="success-desc">Hi <strong>${name}</strong>, we have reserved a premium spot for <strong>${guests} guest(s)</strong> on <strong>${formatDate(date)}</strong> at <strong>${formatTime(time)}</strong>.</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 12px;">Saved in database (Booking ID: #${result.bookingId}). SMS confirmation sent to ${phone}.</p>
        <button class="btn btn-outline" style="margin-top: 24px;" onclick="resetBookingForm()">Book Another Table</button>
      `;

      bookingPanel.appendChild(successOverlay);
    } catch (error) {
      console.error('Error saving reservation to database:', error);
      alert('Failed to connect to backend server. Table booking was not saved. Please verify that the node server is running.');
    } finally {
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
    }
  });
}

// Global reset helper for success panel close
window.resetBookingForm = function() {
  const overlay = document.querySelector('.form-success-overlay');
  if (overlay) {
    overlay.remove();
  }
  const form = document.getElementById('table-booking-form');
  if (form) {
    form.reset();
    const dateInput = document.getElementById('booking-date');
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }
};

// --- FETCH REVIEWS FROM DATABASE ---
async function fetchReviews() {
  try {
    const response = await fetch(`${API_URL}/reviews`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    reviews = await response.json();
  } catch (error) {
    console.error('Error fetching reviews from backend:', error);
    reviews = [...DEFAULT_REVIEWS];
  }
  initReviews();
}

// --- REVIEWS SYSTEM (CAROUSEL & SAVE TO DATABASE) ---
function initReviews() {
  const reviewsSlider = document.querySelector('.reviews-slider');
  const prevBtn = document.querySelector('.prev-review');
  const nextBtn = document.querySelector('.next-review');
  const starsContainer = document.querySelector('.star-rating-select');
  const reviewForm = document.getElementById('add-review-form');

  let currentSlide = 0;

  function renderReviews() {
    reviewsSlider.innerHTML = '';
    reviews.forEach(r => {
      const slide = document.createElement('div');
      slide.className = 'review-card glass-card';
      
      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="${i <= r.stars ? 'fas' : 'far'} fa-star"></i>`;
      }

      slide.innerHTML = `
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">${r.name.charAt(0).toUpperCase()}</div>
            <div class="reviewer-name">
              <h4>${r.name}</h4>
              <span>${r.review_date}</span>
            </div>
          </div>
          <div class="review-stars">
            ${starsHtml}
          </div>
        </div>
        <p class="review-text">"${r.comment}"</p>
      `;
      reviewsSlider.appendChild(slide);
    });
    
    updateSlidePosition();
  }

  function updateSlidePosition() {
    reviewsSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  const newPrevBtn = prevBtn.cloneNode(true);
  const newNextBtn = nextBtn.cloneNode(true);
  prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

  newNextBtn.addEventListener('click', () => {
    if (currentSlide < reviews.length - 1) {
      currentSlide++;
    } else {
      currentSlide = 0; // wrap around
    }
    updateSlidePosition();
  });

  newPrevBtn.addEventListener('click', () => {
    if (currentSlide > 0) {
      currentSlide--;
    } else {
      currentSlide = reviews.length - 1; // wrap around
    }
    updateSlidePosition();
  });

  const starsList = starsContainer.querySelectorAll('span');
  starsList.forEach((star, index) => {
    star.addEventListener('mouseover', () => {
      starsList.forEach((s, idx) => {
        if (idx <= index) s.classList.add('hovered');
        else s.classList.remove('hovered');
      });
    });

    star.addEventListener('mouseout', () => {
      starsList.forEach(s => s.classList.remove('hovered'));
    });

    star.addEventListener('click', () => {
      currentReviewRating = index + 1;
      starsList.forEach((s, idx) => {
        if (idx <= index) {
          s.classList.add('selected');
          s.querySelector('i').className = 'fas fa-star';
        } else {
          s.classList.remove('selected');
          s.querySelector('i').className = 'far fa-star';
        }
      });
    });
  });

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reviewerName = document.getElementById('reviewer-name').value.trim();
    const reviewerComment = document.getElementById('reviewer-text').value.trim();

    if (!reviewerName || !reviewerComment) {
      alert('Please provide your name and review details.');
      return;
    }

    const today = new Date();
    const day = today.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const dateStr = `${day} ${month} ${year}`;

    const newReview = {
      name: reviewerName,
      stars: currentReviewRating,
      review_date: dateStr,
      comment: reviewerComment
    };

    try {
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving review...';

      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      });

      if (!response.ok) throw new Error('Failed to submit review');

      reviewForm.reset();
      currentReviewRating = 5;
      starsList.forEach(s => {
        s.classList.add('selected');
        s.querySelector('i').className = 'fas fa-star';
      });

      currentSlide = 0;
      await fetchReviews();

      alert('⭐ Thank you for your feedback!\n\nYour review has been saved in our MySQL database and is displayed in our live customer testimonial gallery.');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to connect to backend server. Review was not saved. Please verify your backend server is running.');
    } finally {
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  });

  renderReviews();
}

// --- UTILITY DATE/TIME FORMATTERS ---
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(timeStr) {
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Dynamically inject styling for shake animation and print styling
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes shake {
    0% { transform: scale(1); }
    25% { transform: scale(1.15) rotate(-6deg); }
    50% { transform: scale(1.15) rotate(6deg); }
    75% { transform: scale(1.15) rotate(-3deg); }
    100% { transform: scale(1) rotate(0); }
  }
  .cart-icon-btn.shake {
    animation: shake 0.4s ease;
    border-color: var(--color-primary);
  }
  @media print {
    body * {
      visibility: hidden;
    }
    #receipt-modal, #receipt-modal * {
      visibility: visible;
    }
    #receipt-modal {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      color: black !important;
      backdrop-filter: none;
    }
    .receipt-modal-content {
      border: none;
      box-shadow: none;
      background: white !important;
      color: black !important;
      width: 100%;
      max-width: 100%;
      padding: 0;
    }
    .receipt-checkmark, .receipt-actions, .close-receipt-btn {
      display: none !important;
    }
    .invoice-box {
      border: 1px solid #000;
      background: white !important;
      color: black !important;
      box-shadow: none;
    }
  }
`;
document.head.appendChild(styleSheet);
