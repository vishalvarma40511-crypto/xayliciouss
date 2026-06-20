'use strict';

const products = window.XAYLICIOUSS_PRODUCTS || [];
let cart = [];
let currentCategory = 'All';
let currentSearchTerm = '';

const elements = {};

function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function getProductById(productId) {
  return products.find((product) => product.id === Number(productId));
}

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.innerHTML = `
    <div class="product-image-wrap">
      <img src="${product.image}" alt="${product.name}" loading="lazy" />
      <span class="product-badge">${product.badge}</span>
    </div>
    <div class="product-content">
      <h3>${product.name}</h3>
      <div class="product-meta">
        <span class="category-tag">${product.category}</span>
        <span class="price">${formatCurrency(product.price)}</span>
      </div>
      <p>${product.description}</p>
      <button class="btn btn-primary add-to-cart-btn" type="button" data-product-id="${product.id}">
        Add to Cart
      </button>
    </div>
  `;

  return article;
}

function renderProducts(productList = products) {
  if (!elements.productsGrid) return;

  elements.productsGrid.innerHTML = '';
  const visibleProducts = productList.length ? productList : [];

  elements.emptyState.hidden = visibleProducts.length !== 0;

  visibleProducts.forEach((product) => {
    elements.productsGrid.appendChild(createProductCard(product));
  });
}

function renderBestSellers() {
  if (!elements.bestSellersGrid) return;

  elements.bestSellersGrid.innerHTML = '';
  const bestSellers = products.filter((product) => product.featured).slice(0, 4);

  bestSellers.forEach((product) => {
    elements.bestSellersGrid.appendChild(createProductCard(product));
  });
}

function getFilteredProducts() {
  return products.filter((product) => {
    const matchesCategory = currentCategory === 'All' || product.category === currentCategory;
    const searchableText = `${product.name} ${product.category} ${product.description} ${product.badge}`.toLowerCase();
    const matchesSearch = searchableText.includes(currentSearchTerm.toLowerCase().trim());

    return matchesCategory && matchesSearch;
  });
}

function filterProducts(category) {
  currentCategory = category || 'All';
  renderProducts(getFilteredProducts());
}

function searchProducts(searchTerm) {
  currentSearchTerm = searchTerm || '';
  renderProducts(getFilteredProducts());
}

function addToCart(productId) {
  const selectedProduct = getProductById(productId);
  if (!selectedProduct) return;

  const existingCartItem = cart.find((item) => item.id === selectedProduct.id);

  if (existingCartItem) {
    existingCartItem.quantity += 1;
  } else {
    cart.push({ ...selectedProduct, quantity: 1 });
  }

  updateCartUI();
  saveCartToLocalStorage();
  openCart();
}

function increaseQuantity(productId) {
  const item = cart.find((cartItem) => cartItem.id === Number(productId));
  if (!item) return;

  item.quantity += 1;
  updateCartUI();
  saveCartToLocalStorage();
}

function decreaseQuantity(productId) {
  const item = cart.find((cartItem) => cartItem.id === Number(productId));
  if (!item) return;

  if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    removeFromCart(productId);
    return;
  }

  updateCartUI();
  saveCartToLocalStorage();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== Number(productId));
  updateCartUI();
  saveCartToLocalStorage();
}

function updateCartUI() {
  if (!elements.cartItems || !elements.cartTotal) return;

  elements.cartItems.innerHTML = '';

  if (cart.length === 0) {
    elements.cartItems.innerHTML = `
      <div class="empty-cart">
        <h3>Your cart is empty</h3>
        <p>Add brownies, cakes, cupcakes, cookies, or dessert boxes to start your order.</p>
      </div>
    `;
  } else {
    cart.forEach((item) => {
      const cartItem = document.createElement('article');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div>
          <h3>${item.name}</h3>
          <p>${formatCurrency(item.price * item.quantity)}</p>
          <div class="cart-item-actions">
            <div class="qty-controls" aria-label="Quantity controls for ${item.name}">
              <button class="qty-btn decrease-btn" type="button" data-product-id="${item.id}" aria-label="Decrease ${item.name} quantity">−</button>
              <span>${item.quantity}</span>
              <button class="qty-btn increase-btn" type="button" data-product-id="${item.id}" aria-label="Increase ${item.name} quantity">+</button>
            </div>
            <button class="remove-btn" type="button" data-product-id="${item.id}">Remove</button>
          </div>
        </div>
      `;

      elements.cartItems.appendChild(cartItem);
    });
  }

  elements.cartTotal.textContent = formatCurrency(calculateTotal());
  updateCartCount();
}

function calculateTotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function updateCartCount() {
  if (!elements.cartCount) return;

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  elements.cartCount.textContent = totalItems;
}

function saveCartToLocalStorage() {
  localStorage.setItem('xaylicioussCart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
  const savedCart = localStorage.getItem('xaylicioussCart');

  try {
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    cart = [];
    localStorage.removeItem('xaylicioussCart');
  }

  updateCartUI();
}

function getSignedInUser() {
  const savedUser = localStorage.getItem('xaylicioussSignedInUser');

  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    localStorage.removeItem('xaylicioussSignedInUser');
    return null;
  }
}

function isUserSignedIn() {
  const user = getSignedInUser();
  return Boolean(user && user.name && user.contact);
}

function redirectToSignInForOrder() {
  localStorage.setItem('xaylicioussPendingCheckout', 'true');
  localStorage.setItem('xaylicioussReturnAfterSignIn', window.location.pathname || 'index.html');
  window.location.href = 'signin.html';
}

function closeSignInRequiredModal() {
  const modal = document.getElementById('signInRequiredModal');
  if (!modal) return;

  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('signin-modal-open');
}

function createSignInRequiredModal() {
  if (document.getElementById('signInRequiredModal')) return;

  const modal = document.createElement('div');
  modal.className = 'signin-order-modal';
  modal.id = 'signInRequiredModal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="signin-order-backdrop" data-signin-modal-close></div>
    <section class="signin-order-card" role="dialog" aria-modal="true" aria-labelledby="signinRequiredTitle">
      <button class="signin-order-close" type="button" aria-label="Close sign in message" data-signin-modal-close>×</button>
      <div class="signin-order-logo" aria-hidden="true">
        <span>X</span>
        <small>Secure</small>
      </div>
      <p class="eyebrow">Sign in required</p>
      <h2 id="signinRequiredTitle">Please sign in to place your order</h2>
      <p class="signin-order-text">
        This helps us save your order history, tracking details, and bonus points safely in your Xayliciouss dashboard.
      </p>
      <div class="signin-order-benefits" aria-label="Benefits of signing in">
        <span>🎁 Bonus points</span>
        <span>📦 Order tracking</span>
        <span>🧁 Faster checkout</span>
      </div>
      <div class="signin-order-actions">
        <button class="btn btn-primary" type="button" id="signinModalContinueBtn">Sign In & Continue</button>
        <button class="btn btn-outline" type="button" data-signin-modal-close>Keep Browsing</button>
      </div>
    </section>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-signin-modal-close]')) closeSignInRequiredModal();
  });

  const continueButton = modal.querySelector('#signinModalContinueBtn');
  if (continueButton) continueButton.addEventListener('click', redirectToSignInForOrder);
}

function showSignInRequiredModal() {
  createSignInRequiredModal();
  const modal = document.getElementById('signInRequiredModal');
  if (!modal) return;

  localStorage.setItem('xaylicioussPendingCheckout', 'true');
  localStorage.setItem('xaylicioussReturnAfterSignIn', window.location.pathname || 'index.html');

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('signin-modal-open');

  const continueButton = modal.querySelector('#signinModalContinueBtn');
  if (continueButton) continueButton.focus();
}

function requireSignInForOrder() {
  if (isUserSignedIn()) return true;

  showSignInRequiredModal();
  return false;
}


function updateNavAuthState() {
  if (!elements.navSignInBtn) return;

  const signedInUser = getSignedInUser();

  if (signedInUser && signedInUser.name) {
    const firstName = signedInUser.name.trim().split(' ')[0];
    elements.navSignInBtn.textContent = `Hi, ${firstName}`;
    elements.navSignInBtn.setAttribute('href', 'dashboard.html');
    elements.navSignInBtn.setAttribute('aria-label', `Signed in as ${signedInUser.name}. Open dashboard.`);
    elements.navSignInBtn.classList.add('signed');
  } else {
    elements.navSignInBtn.textContent = 'Sign In';
    elements.navSignInBtn.setAttribute('href', 'signin.html');
    elements.navSignInBtn.setAttribute('aria-label', 'Open sign in page');
    elements.navSignInBtn.classList.remove('signed');
  }
}


function openCart() {
  if (!elements.cartSidebar || !elements.cartOverlay) return;

  elements.cartSidebar.classList.add('active');
  elements.cartOverlay.classList.add('active');
  elements.cartSidebar.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
}

function closeCart() {
  if (!elements.cartSidebar || !elements.cartOverlay) return;

  elements.cartSidebar.classList.remove('active');
  elements.cartOverlay.classList.remove('active');
  elements.cartSidebar.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
}

function getApiBaseUrl() {
  const currentPort = window.location.port;
  const currentHostname = window.location.hostname || 'localhost';
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(currentHostname);

  // Production/Render deployment: frontend and backend run on the same domain.
  if (!isLocalHost) return '';

  // Local Node server: frontend and backend both run on port 3000.
  if (currentPort === '3000') return '';

  // VS Code Live Server/local preview: connect to the local Node backend.
  return `http://${currentHostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000`;
}

function buildApiUrl(endpoint) {
  return `${getApiBaseUrl()}${endpoint}`;
}

async function postToDatabase(endpoint, payload) {
  const response = await fetch(buildApiUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Database request failed.');
  }

  return data;
}

function getSavedOrders() {
  const savedOrders = localStorage.getItem('xaylicioussOrders');

  try {
    return savedOrders ? JSON.parse(savedOrders) : [];
  } catch (error) {
    localStorage.removeItem('xaylicioussOrders');
    return [];
  }
}

function saveOrderToLocalStorage(order) {
  const savedOrders = getSavedOrders();
  savedOrders.unshift(order);
  localStorage.setItem('xaylicioussOrders', JSON.stringify(savedOrders.slice(0, 50)));
}

async function saveOrderToDatabase() {
  const signedInUser = getSignedInUser();
  if (!signedInUser || !signedInUser.contact) {
    return false;
  }

  const order = {
    localId: `LOCAL-${Date.now()}`,
    customer: signedInUser,
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      lineTotal: item.price * item.quantity
    })),
    total: calculateTotal(),
    channel: 'WhatsApp Checkout',
    status: 'WhatsApp Started',
    createdAt: new Date().toISOString()
  };

  try {
    const data = await postToDatabase('/api/orders', order);
    saveOrderToLocalStorage(data.order || order);
    return true;
  } catch (error) {
    saveOrderToLocalStorage(order);
    return false;
  }
}

async function checkoutWhatsApp() {
  if (cart.length === 0) {
    openCart();
    return;
  }

  if (!requireSignInForOrder()) return;

  await saveOrderToDatabase();

  // Replace this number with the real Xayliciouss WhatsApp number.
  const whatsappNumber = '919999999999';
  const orderLines = cart.map((item, index) => {
    return `${index + 1}. ${item.name} x ${item.quantity} - ${formatCurrency(item.price * item.quantity)}`;
  });

  const message = `Hello Xayliciouss, I would like to place an order:\n\n${orderLines.join('\n')}\n\nTotal: ${formatCurrency(calculateTotal())}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank', 'noopener');
}

function clearFormErrors() {
  const formGroups = document.querySelectorAll('.form-group');
  formGroups.forEach((group) => group.classList.remove('invalid'));

  ['nameError', 'contactError', 'requestTypeError', 'messageError'].forEach((errorId) => {
    const errorElement = document.getElementById(errorId);
    if (errorElement) errorElement.textContent = '';
  });
}

function showFieldError(inputElement, errorElement, message) {
  if (inputElement && inputElement.parentElement) {
    inputElement.parentElement.classList.add('invalid');
  }

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function generateReportId() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `XY-${datePart}-${randomPart}`;
}

function getExpectedResponseTime(requestType) {
  const quickResponseTypes = ['Complaint or Issue', 'Delivery Support'];
  return quickResponseTypes.includes(requestType) ? 'Within 12 working hours' : 'Within 24 working hours';
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSavedCustomerReports() {
  const savedReports = localStorage.getItem('xaylicioussCustomerReports');

  try {
    return savedReports ? JSON.parse(savedReports) : [];
  } catch (error) {
    localStorage.removeItem('xaylicioussCustomerReports');
    return [];
  }
}

function saveCustomerReportToLocalStorage(report) {
  const savedReports = getSavedCustomerReports();
  savedReports.unshift(report);
  localStorage.setItem('xaylicioussCustomerReports', JSON.stringify(savedReports.slice(0, 50)));
}

async function saveCustomerReport(report) {
  saveCustomerReportToLocalStorage(report);

  try {
    const data = await postToDatabase('/api/reports', report);

    if (data.report && data.report.id) {
      report.id = data.report.id;
    }

    report.databaseStatus = 'Saved';
    return true;
  } catch (error) {
    report.databaseStatus = 'Pending sync';
    report.databaseError = error.message;
    return false;
  }
}

function buildCustomerReportWhatsAppMessage(report) {
  return `Hello Xayliciouss, I submitted a customer service report.

Report ID: ${report.id}
Name: ${report.name}
Contact: ${report.contact}
Request Type: ${report.requestType}
Message: ${report.message}

Please help me with this request.`;
}

function showCustomerResponse(report) {
  if (!elements.clientResponse) return;

  const responseTitle = document.getElementById('responseTitle');
  const responseMessage = document.getElementById('responseMessage');
  const responseReportId = document.getElementById('responseReportId');
  const responseTime = document.getElementById('responseTime');
  const responseWhatsAppBtn = document.getElementById('responseWhatsAppBtn');

  if (responseTitle) responseTitle.textContent = `Thank you, ${report.name}!`;
  if (responseMessage) {
    responseMessage.innerHTML = `Your <strong>${escapeHTML(report.requestType)}</strong> report has been received successfully. Our customer service team will review it and respond through your provided contact details.`;
  }
  if (responseReportId) responseReportId.textContent = report.id;
  if (responseTime) responseTime.textContent = report.expectedResponse;

  if (responseWhatsAppBtn) {
    // Replace this number with the real Xayliciouss WhatsApp number.
    const whatsappNumber = '919999999999';
    responseWhatsAppBtn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildCustomerReportWhatsAppMessage(report))}`;
  }

  elements.clientResponse.hidden = false;
  elements.clientResponse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearCustomerResponse() {
  if (elements.clientResponse) elements.clientResponse.hidden = true;
  const successMessage = document.getElementById('formSuccess');
  if (successMessage) successMessage.textContent = '';
  const nameInput = document.getElementById('customerName');
  if (nameInput) nameInput.focus();
}

async function validateContactForm(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById('customerName');
  const contactInput = document.getElementById('customerContact');
  const requestTypeInput = document.getElementById('requestType');
  const messageInput = document.getElementById('customerMessage');
  const successMessage = document.getElementById('formSuccess');

  clearFormErrors();
  if (successMessage) successMessage.textContent = '';
  if (elements.clientResponse) elements.clientResponse.hidden = true;

  let isValid = true;

  if (!nameInput.value.trim()) {
    showFieldError(nameInput, document.getElementById('nameError'), 'Name is required.');
    isValid = false;
  }

  if (!contactInput.value.trim()) {
    showFieldError(contactInput, document.getElementById('contactError'), 'Email or phone number is required.');
    isValid = false;
  }

  if (!requestTypeInput.value.trim()) {
    showFieldError(requestTypeInput, document.getElementById('requestTypeError'), 'Please choose a request type.');
    isValid = false;
  }

  if (!messageInput.value.trim()) {
    showFieldError(messageInput, document.getElementById('messageError'), 'Message is required.');
    isValid = false;
  }

  if (!isValid) return false;

  const report = {
    id: generateReportId(),
    name: nameInput.value.trim(),
    contact: contactInput.value.trim(),
    requestType: requestTypeInput.value.trim(),
    message: messageInput.value.trim(),
    expectedResponse: getExpectedResponseTime(requestTypeInput.value.trim()),
    createdAt: new Date().toISOString()
  };

  const savedToDatabase = await saveCustomerReport(report);
  showCustomerResponse(report);

  if (successMessage) {
    successMessage.textContent = savedToDatabase
      ? 'Your report has been submitted successfully. Our team will contact you soon.'
      : 'Your report has been received. Our team will contact you soon.';
  }

  elements.contactForm.reset();
  return true;
}

function toggleFAQ(button) {
  const faqItem = button.closest('.faq-item');
  if (!faqItem) return;

  const answer = faqItem.querySelector('.faq-answer');
  const isOpen = faqItem.classList.contains('active');

  document.querySelectorAll('.faq-item').forEach((item) => {
    item.classList.remove('active');
    const itemAnswer = item.querySelector('.faq-answer');
    const itemButton = item.querySelector('.faq-question');
    if (itemAnswer) itemAnswer.style.maxHeight = null;
    if (itemButton) itemButton.setAttribute('aria-expanded', 'false');
  });

  if (!isOpen) {
    faqItem.classList.add('active');
    button.setAttribute('aria-expanded', 'true');
    answer.style.maxHeight = `${answer.scrollHeight}px`;
  }
}

function toggleMobileMenu(forceClose = false) {
  if (!elements.navLinks || !elements.hamburgerBtn) return;

  const shouldClose = forceClose || elements.navLinks.classList.contains('active');

  elements.navLinks.classList.toggle('active', !shouldClose);
  elements.hamburgerBtn.classList.toggle('active', !shouldClose);
  elements.hamburgerBtn.setAttribute('aria-expanded', String(!shouldClose));
  document.body.classList.toggle('menu-open', !shouldClose);
}

function smoothScrollNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');

      if (!targetId || targetId === '#' || link.classList.contains('social-placeholder')) {
        return;
      }

      if (!targetId.startsWith('#')) {
        toggleMobileMenu(true);
        return;
      }

      const targetElement = document.querySelector(targetId);

      if (!targetElement) return;

      event.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toggleMobileMenu(true);
    });
  });
}

function handleBackToTopButton() {
  if (!elements.backToTop) return;

  const toggleButton = () => {
    elements.backToTop.classList.toggle('show', window.scrollY > 450);
  };

  toggleButton();
  window.addEventListener('scroll', toggleButton, { passive: true });

  elements.backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function handleHeaderScrollEffect() {
  if (!elements.siteHeader) return;

  const updateHeader = () => {
    elements.siteHeader.classList.toggle('scrolled', window.scrollY > 20);
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

function revealSectionsOnScroll() {
  const revealSections = document.querySelectorAll('.reveal-section');

  if (!('IntersectionObserver' in window)) {
    revealSections.forEach((section) => section.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealSections.forEach((section) => observer.observe(section));
}

function handleReviewsCarousel() {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;

  document.querySelectorAll('[data-review-control]').forEach((button) => {
    button.addEventListener('click', () => {
      const direction = button.dataset.reviewControl === 'next' ? 1 : -1;
      const distance = Math.min(track.clientWidth * 0.85, 420);
      track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    });
  });
}

function initHomeMotion() {
  // Extra home page motion has been intentionally disabled to keep the website clean and premium.
}

function handleProtectedWhatsAppOrderLinks() {
  document.querySelectorAll('.floating-whatsapp').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!isUserSignedIn()) {
        event.preventDefault();
        requireSignInForOrder();
      }
    });
  });
}

function attachEventListeners() {
  if (elements.productsGrid) {
    elements.productsGrid.addEventListener('click', (event) => {
      const addButton = event.target.closest('.add-to-cart-btn');
      if (addButton) addToCart(addButton.dataset.productId);
    });
  }

  if (elements.bestSellersGrid) {
    elements.bestSellersGrid.addEventListener('click', (event) => {
      const addButton = event.target.closest('.add-to-cart-btn');
      if (addButton) addToCart(addButton.dataset.productId);
    });
  }

  if (elements.categoryFilters) {
    elements.categoryFilters.addEventListener('click', (event) => {
      const filterButton = event.target.closest('.filter-btn');
      if (!filterButton) return;

      document.querySelectorAll('.filter-btn').forEach((button) => button.classList.remove('active'));
      filterButton.classList.add('active');
      filterProducts(filterButton.dataset.category);
    });
  }

  if (elements.productSearch) {
    elements.productSearch.addEventListener('input', (event) => searchProducts(event.target.value));
  }

  if (elements.cartItems) {
    elements.cartItems.addEventListener('click', (event) => {
      const increaseButton = event.target.closest('.increase-btn');
      const decreaseButton = event.target.closest('.decrease-btn');
      const removeButton = event.target.closest('.remove-btn');

      if (increaseButton) increaseQuantity(increaseButton.dataset.productId);
      if (decreaseButton) decreaseQuantity(decreaseButton.dataset.productId);
      if (removeButton) removeFromCart(removeButton.dataset.productId);
    });
  }

  if (elements.cartOpenBtn) elements.cartOpenBtn.addEventListener('click', openCart);
  if (elements.cartCloseBtn) elements.cartCloseBtn.addEventListener('click', closeCart);
  if (elements.cartOverlay) elements.cartOverlay.addEventListener('click', closeCart);
  if (elements.checkoutBtn) elements.checkoutBtn.addEventListener('click', checkoutWhatsApp);
  handleProtectedWhatsAppOrderLinks();
  if (elements.contactForm) elements.contactForm.addEventListener('submit', validateContactForm);
  if (elements.clearResponseBtn) elements.clearResponseBtn.addEventListener('click', clearCustomerResponse);
  if (elements.hamburgerBtn) elements.hamburgerBtn.addEventListener('click', () => toggleMobileMenu());

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCart();
      closeSignInRequiredModal();
      closePremiumInfoModal();
      toggleMobileMenu(true);
    }
  });

  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => toggleFAQ(button));
  });
}

function cacheElements() {
  elements.productsGrid = document.getElementById('productsGrid');
  elements.bestSellersGrid = document.getElementById('bestSellersGrid');
  elements.emptyState = document.getElementById('emptyState');
  elements.productSearch = document.getElementById('productSearch');
  elements.categoryFilters = document.getElementById('categoryFilters');
  elements.cartOpenBtn = document.getElementById('cartOpenBtn');
  elements.navSignInBtn = document.getElementById('navSignInBtn');
  elements.cartCloseBtn = document.getElementById('cartCloseBtn');
  elements.cartSidebar = document.getElementById('cartSidebar');
  elements.cartOverlay = document.getElementById('cartOverlay');
  elements.cartItems = document.getElementById('cartItems');
  elements.cartTotal = document.getElementById('cartTotal');
  elements.cartCount = document.getElementById('cartCount');
  elements.checkoutBtn = document.getElementById('checkoutBtn');
  elements.contactForm = document.getElementById('contactForm');
  elements.clientResponse = document.getElementById('clientResponse');
  elements.clearResponseBtn = document.getElementById('clearResponseBtn');
  elements.hamburgerBtn = document.getElementById('hamburgerBtn');
  elements.navLinks = document.getElementById('navLinks');
  elements.backToTop = document.getElementById('backToTop');
  elements.siteHeader = document.getElementById('siteHeader');
}

function setCurrentYear() {
  const currentYearElement = document.getElementById('currentYear');
  if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();
}

function initApp() {
  cacheElements();
  renderBestSellers();
  renderProducts();
  loadCartFromLocalStorage();
  attachEventListeners();
  smoothScrollNavigation();
  handleBackToTopButton();
  handleHeaderScrollEffect();
  handleReviewsCarousel();
  revealSectionsOnScroll();
  initHomeMotion();
  setCurrentYear();
  updateNavAuthState();
}


window.Xayliciouss = {
  addToCart,
  getCart: () => cart.slice(),
  getSignedInUser,
  isUserSignedIn,
  requireSignInForOrder,
  showSignInRequiredModal,
  closeSignInRequiredModal,
  openCart
};


document.addEventListener('DOMContentLoaded', initApp);

function closePremiumInfoModal() {
  const modal = document.getElementById('premiumInfoModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('signin-modal-open');
}

function showPremiumInfoModal(title, message) {
  let modal = document.getElementById('premiumInfoModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'signin-order-modal premium-info-modal';
    modal.id = 'premiumInfoModal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="signin-order-backdrop" data-premium-modal-close></div>
      <section class="signin-order-card premium-info-card" role="dialog" aria-modal="true" aria-labelledby="premiumInfoTitle">
        <button class="signin-order-close" type="button" aria-label="Close message" data-premium-modal-close>×</button>
        <div class="signin-order-logo" aria-hidden="true"><span>X</span><small>Info</small></div>
        <p class="eyebrow">Xayliciouss Update</p>
        <h2 id="premiumInfoTitle"></h2>
        <p class="signin-order-text" id="premiumInfoText"></p>
        <div class="signin-order-actions single-action">
          <button class="btn btn-primary" type="button" data-premium-modal-close>Okay</button>
        </div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-premium-modal-close]')) closePremiumInfoModal();
    });
  }

  const titleElement = modal.querySelector('#premiumInfoTitle');
  const textElement = modal.querySelector('#premiumInfoText');
  if (titleElement) titleElement.textContent = title;
  if (textElement) textElement.textContent = message;

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('signin-modal-open');

  const okayButton = modal.querySelector('.btn-primary');
  if (okayButton) okayButton.focus();
}

function handleSocialPlaceholders() {
  document.querySelectorAll('.social-placeholder').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showPremiumInfoModal(
        'Instagram Coming Soon',
        'Our official Instagram page will be connected after the confirmed Xayliciouss handle is ready.'
      );
    });
  });
}

document.addEventListener('DOMContentLoaded', handleSocialPlaceholders);
