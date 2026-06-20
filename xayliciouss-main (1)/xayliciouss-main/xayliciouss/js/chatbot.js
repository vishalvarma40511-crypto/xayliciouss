'use strict';

/**
 * Xayliciouss Premium AI Chatbot Assistant
 * Bakery-specific knowledge engine with full UI widget
 */
(function () {
  const STORAGE_KEY = 'xaylicioussChatHistory';
  const THEME_KEY = 'xaylicioussChatTheme';
  const BADGE_KEY = 'xaylicioussChatBadge';
  const WHATSAPP_NUMBER = '919999999999';

  const FAQ_DATA = [
    { q: 'How do I place an order?', a: 'Add products to your cart and checkout through WhatsApp. You can also ask me to add items directly!' },
    { q: 'How much notice for custom cakes?', a: 'Custom cakes usually need 2–3 days advance notice so we can confirm design, flavor, size, and availability.' },
    { q: 'Do you offer customized desserts?', a: 'Yes! We offer customized cakes, cupcakes, dessert boxes, messages, colors, and gifting styles.' },
    { q: 'Do you provide delivery?', a: 'Delivery availability depends on your location and order type. Please confirm through WhatsApp before placing the final order.' },
    { q: 'How can I contact Xayliciouss?', a: 'Reach us via WhatsApp, Instagram Coming Soon, or email at xaylicioussofficial@gmail.com.' }
  ];

  const INGREDIENT_INFO = {
    brownie: 'Our brownies use premium cocoa, real butter, farm-fresh eggs, and dark chocolate chunks for a rich, fudgy center.',
    cake: 'Our cakes feature soft sponge layers with Belgian chocolate, fresh cream, vanilla bean extract, and premium fondant decorations.',
    cupcake: 'Cupcakes are made with moist sponge, cream cheese or buttercream frosting, and natural food coloring for elegant decoration.',
    cookie: 'Cookies are baked with pure butter, fine flour, brown sugar, and premium chocolate chips for a soft-center crunch.',
    'dessert box': 'Dessert boxes combine assorted treats — brownies, cupcakes, cookies, and mini cakes — beautifully packaged for gifting.'
  };

  const EVENT_RECOMMENDATIONS = {
    birthday: ['Mini Bento Cake', 'Chocolate Truffle Cake', 'Premium Dessert Box', 'Red Velvet Cupcake'],
    wedding: ['Chocolate Truffle Cake', 'Vanilla Celebration Cake', 'Custom Gift Dessert Box', 'Seasonal Special Cake'],
    anniversary: ['Mini Bento Cake', 'Chocolate Truffle Cake', 'Fudge Brownie Box', 'Premium Dessert Box'],
    party: ['Premium Dessert Box', 'Fudge Brownie Box', 'Chocolate Cupcake', 'Choco Chip Cookies'],
    gift: ['Fudge Brownie Box', 'Custom Gift Dessert Box', 'Butter Cookies', 'Mini Bento Cake'],
    celebration: ['Vanilla Celebration Cake', 'Chocolate Truffle Cake', 'Premium Dessert Box', 'Seasonal Special Cake']
  };

  const QUICK_REPLIES = [
    '🎂 Best sellers',
    '💰 Budget picks',
    '🎁 Gift ideas',
    '📦 How to order',
    '🚚 Delivery info',
    '⭐ rating'

  ];

  let state = {
    isOpen: false,
    isTyping: false,
    messages: [],
    theme: 'light',
    searchActive: false,
    faqActive: false,
    speechEnabled: false,
    isListening: false,
    unreadCount: 0,
    welcomeShown: false
  };

  let elements = {};
  let recognition = null;
  let synth = window.speechSynthesis;

  /* ── Utilities ── */

  function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  }

  function getProducts() {
    return window.XAYLICIOUSS_PRODUCTS || [];
  }

  function getSignedInUser() {
    try {
      const saved = localStorage.getItem('xaylicioussSignedInUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }


  function isUserSignedIn() {
    if (window.Xayliciouss?.isUserSignedIn) return window.Xayliciouss.isUserSignedIn();
    const user = getSignedInUser();
    return Boolean(user && user.name && user.contact);
  }

  function openSignInPageForOrder() {
    localStorage.setItem('xaylicioussPendingCheckout', 'true');
    localStorage.setItem('xaylicioussReturnAfterSignIn', window.location.pathname || 'index.html');

    if (window.Xayliciouss?.showSignInRequiredModal) {
      window.Xayliciouss.showSignInRequiredModal();
      return;
    }

    window.location.href = 'signin.html';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomDelay(min = 600, max = 1400) {
    return delay(min + Math.random() * (max - min));
  }

  /* ── Storage ── */

  function saveHistory() {
    try {
      const toSave = state.messages.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      showToast('Could not save chat history.');
    }
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      state.messages = saved ? JSON.parse(saved) : [];
    } catch {
      state.messages = [];
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearHistory() {
    state.messages = [];
    localStorage.removeItem(STORAGE_KEY);
    renderMessages();
    showWelcomeMessage();
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      state.theme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      state.theme = 'dark';
    }
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-chatbot-theme', state.theme);
    localStorage.setItem(THEME_KEY, state.theme);
    updateThemeIcon();
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
  }

  /* ── AI Knowledge Engine ── */

  function findProductsByBudget(budget) {
    return getProducts()
      .filter((p) => p.price <= budget)
      .sort((a, b) => b.price - a.price)
      .slice(0, 4);
  }

  function findProductsByCategory(category) {
    const cat = category.toLowerCase();
    return getProducts().filter((p) => p.category.toLowerCase().includes(cat));
  }

  function findProductsByName(query) {
    const q = query.toLowerCase();
    return getProducts().filter((p) =>
      `${p.name} ${p.category} ${p.description} ${p.badge}`.toLowerCase().includes(q)
    );
  }

  function getBestSellers() {
    return getProducts().filter((p) => p.featured);
  }

  function getEventProducts(event) {
    const names = EVENT_RECOMMENDATIONS[event] || [];
    const products = getProducts();
    return names.map((name) => products.find((p) => p.name === name)).filter(Boolean);
  }

  function buildProductCardsHTML(products) {
    if (!products.length) return '';
    return products
      .map(
        (p) => `
      <div class="chatbot-product-card">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.background='var(--cb-rose)'" />
        <div class="chatbot-product-card-info">
          <h4>${escapeHtml(p.name)}</h4>
          <p>${escapeHtml(p.description)}</p>
          <div class="cb-price">${formatCurrency(p.price)} · ${escapeHtml(p.badge)}</div>
          <button class="chatbot-add-cart-btn" data-product-id="${p.id}" type="button">Add to Cart 🛒</button>
        </div>
      </div>`
      )
      .join('');
  }

  function extractBudget(text) {
    const match = text.match(/(?:under|below|budget|₹|rs\.?\s*|inr\s*)(\d+)/i) || text.match(/(\d+)\s*(?:rupees|rs|₹|budget)/i);
    if (match) return parseInt(match[1], 10);
    const plainNum = text.match(/\b(\d{2,4})\b/);
    if (plainNum && parseInt(plainNum[1], 10) >= 50) return parseInt(plainNum[1], 10);
    return null;
  }

  function detectEvent(text) {
    const events = Object.keys(EVENT_RECOMMENDATIONS);
    return events.find((e) => text.includes(e)) || null;
  }

  function detectCategory(text) {
    const map = {
      brownie: 'Brownies',
      cake: 'Cakes',
      cupcake: 'Cupcakes',
      cookie: 'Cookies',
      'dessert box': 'Dessert Boxes'
    };
    for (const [key, category] of Object.entries(map)) {
      if (text.includes(key)) return category;
    }
    return null;
  }

  function getApiBaseUrl() {
    const currentPort = window.location.port;
    const currentHostname = window.location.hostname || 'localhost';
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(currentHostname);

    if (!isLocalHost) return '';
    if (currentPort === '3000') return '';
    return `http://${currentHostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000`;
  }

  function getCartSummaryForAI() {
    const cartItems = getCartItems();
    return {
      totalItems: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      totalPrice: cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
    };
  }

  async function generateServerAIResponse(userMessage) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: state.messages.slice(-8).map((message) => ({
            sender: message.role === 'user' ? 'user' : 'bot',
            text: message.text
          })),
          cart: getCartSummaryForAI(),
          user: getSignedInUser()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.reply) return null;

      return {
        text: data.reply,
        quickReplies: ['🎂 Best sellers', '📦 How to order', 'Customer service']
      };
    } catch {
      return null;
    }
  }

  async function generateResponse(userMessage) {
    const text = userMessage.toLowerCase().trim();
    const products = getProducts();
    const user = getSignedInUser();

    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste)/.test(text)) {
      const greeting = user?.name
        ? `Hello ${user.name.split(' ')[0]}! 👋 Welcome back to Xayliciouss.`
        : 'Hello! 👋 Welcome to Xayliciouss — your premium homemade bakery assistant.';
      return {
        text: `${greeting}\n\nI'm here to help you discover our delicious treats, recommend products, and guide you through ordering. What can I help you with today?`,
        quickReplies: QUICK_REPLIES
      };
    }

    if (/best\s*sell|popular|top|favorite|favourite|trending/.test(text)) {
      const bestsellers = getBestSellers();
      return {
        text: `🌟 Here are our **best-selling treats** loved by customers:\n\n${bestsellers.map((p) => `• **${p.name}** — ${formatCurrency(p.price)} (${p.badge})`).join('\n')}`,
        products: bestsellers,
        quickReplies: ['Add to cart', '🎁 Gift ideas', '💰 Budget picks']
      };
    }

    const budget = extractBudget(text);
    if (budget || /budget|affordable|cheap|economical|under\s*\d|low\s*cost/.test(text)) {
      const amount = budget || 500;
      const picks = findProductsByBudget(amount);
      if (!picks.length) {
        return {
          text: `I couldn't find products under ${formatCurrency(amount)}. Our most affordable item is the **Classic Chocolate Brownie** at ${formatCurrency(120)}. Would you like to see all options?`,
          quickReplies: ['Show all products', '🎂 Best sellers']
        };
      }
      return {
        text: `💰 Great choices under **${formatCurrency(amount)}**:`,
        products: picks,
        quickReplies: ['Show more options', '🎁 Gift ideas', '📦 How to order']
      };
    }

    const event = detectEvent(text);
    if (event || /birthday|wedding|anniversary|party|celebration|event|occasion|gift/.test(text)) {
      const evt = event || (text.includes('gift') ? 'gift' : text.includes('party') ? 'party' : 'birthday');
      const recs = getEventProducts(evt);
      const labels = { birthday: '🎂 Birthday', wedding: '💒 Wedding', anniversary: '💕 Anniversary', party: '🎉 Party', gift: '🎁 Gifting', celebration: '🥳 Celebration' };
      return {
        text: `${labels[evt] || '🎉 Event'} picks from Xayliciouss:`,
        products: recs,
        quickReplies: ['💰 Budget picks', '📦 How to order', '🎂 Best sellers']
      };
    }

    const category = detectCategory(text);
    if (category) {
      const filtered = getProducts().filter((p) => p.category === category);
      if (filtered.length) {
        return {
          text: `Here's our **${category}** selection:`,
          products: filtered,
          quickReplies: ['🎂 Best sellers', '💰 Budget picks', '🎁 Gift ideas']
        };
      }
    }

    if (/ingredient|flavor|flavour|made\s*of|contain|allerg|vegan|eggless|gluten/.test(text)) {
      for (const [key, info] of Object.entries(INGREDIENT_INFO)) {
        if (text.includes(key)) {
          return {
            text: `🍫 **${key.charAt(0).toUpperCase() + key.slice(1)} ingredients & flavors:**\n\n${info}\n\nFor specific allergen info or custom requests (eggless, sugar-free), please mention it when ordering on WhatsApp.`,
            quickReplies: ['Show menu', '📦 How to order', '🚚 Delivery info']
          };
        }
      }
      return {
        text: `🧁 **Our ingredients philosophy:**\n\nWe use premium ingredients — real butter, farm-fresh eggs, Belgian chocolate, vanilla bean extract, and natural flavors. Every item is freshly baked with no preservatives.\n\n${Object.entries(INGREDIENT_INFO).map(([k, v]) => `**${k.charAt(0).toUpperCase() + k.slice(1)}:** ${v}`).join('\n\n')}`,
        quickReplies: ['🎂 Best sellers', '📦 How to order']
      };
    }

    if (/deliver|shipping|ship|area|location|pickup|pick\s*up/.test(text)) {
      return {
        text: '🚚 **Delivery Information:**\n\nDelivery availability depends on your location and order type. We recommend confirming delivery details through WhatsApp before placing your final order.\n\nFor large celebration cakes and custom orders, advance booking is recommended.',
        quickReplies: ['📦 How to order', 'Contact WhatsApp', '🎂 Best sellers']
      };
    }

    if (/order|checkout|cart|buy|purchase|how\s*to\s*order|place\s*an?\s*order/.test(text)) {
      const cartItems = getCartItems();
      const cartInfo = cartItems.length
        ? `\n\n🛒 You currently have **${cartItems.reduce((s, i) => s + i.quantity, 0)} item(s)** in your cart.`
        : '';
      return {
        text: `📦 **How to Order at Xayliciouss:**\n\n1. Browse our menu or ask me for recommendations\n2. Click "Add to Cart" on any product\n3. Open your cart (🛒 icon in the header)\n4. Click "Checkout on WhatsApp" to confirm your order\n\nOur team will confirm price, customization, and delivery on WhatsApp.${cartInfo}`,
        quickReplies: ['🎂 Best sellers', '💰 Budget picks', 'View my cart']
      };
    }

    if (/cart|my\s*order|what.*in.*cart/.test(text)) {
      const cartItems = getCartItems();
      if (!cartItems.length) {
        return {
          text: '🛒 Your cart is empty! Would you like me to recommend something delicious?',
          quickReplies: ['🎂 Best sellers', '💰 Budget picks', '🎁 Gift ideas']
        };
      }
      const lines = cartItems.map((i) => `• ${i.name} × ${i.quantity} — ${formatCurrency(i.price * i.quantity)}`);
      const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
      return {
        text: `🛒 **Your Cart:**\n\n${lines.join('\n')}\n\n**Total: ${formatCurrency(total)}**\n\nReady to checkout? Click the cart icon or I can help you checkout on WhatsApp!`,
        quickReplies: ['Checkout WhatsApp', '🎂 Add more items']
      };
    }

    if (/checkout|whatsapp|confirm\s*order/.test(text)) {
      return handleWhatsAppCheckout();
    }

    if (/custom|personaliz|personalise|design|theme|message\s*on/.test(text)) {
      return {
        text: '✨ **Customization Options:**\n\n• Custom cakes with themes, colors & messages\n• Personalized bento cakes (Mini Bento Cake — ₹499)\n• Custom Gift Dessert Boxes with theme packaging\n• Flavor, size, and decoration preferences\n\nCustom orders need 2–3 days advance notice. Share your idea on WhatsApp!',
        products: products.filter((p) => p.badge === 'Customizable' || p.badge === 'Personalized' || p.name.includes('Custom')),
        quickReplies: ['📦 How to order', '🎂 Best sellers']
      };
    }

    if (/contact|email|phone|instagram|reach|call/.test(text)) {
      return {
        text: '📞 **Contact Xayliciouss:**\n\n• WhatsApp: +91 99999 99999\n• Instagram: Coming Soon\n• Email: xaylicioussofficial@gmail.com\n\nOr use the contact form on our website!',
        quickReplies: ['📦 How to order', '🚚 Delivery info']
      };
    }

    if (/thank|thanks|ty|appreciate/.test(text)) {
      return {
        text: "You're welcome! 😊 Is there anything else I can help you with?",
        quickReplies: QUICK_REPLIES
      };
    }

    if (/bye|goodbye|see you|exit|close/.test(text)) {
      return {
        text: 'Goodbye! 👋 Come back anytime for sweet recommendations. Have a delicious day! 🍰',
        quickReplies: []
      };
    }

    if (/clear|reset|delete.*chat|start\s*over/.test(text)) {
      clearHistory();
      return {
        text: 'Chat history cleared! 🔄 How can I help you today?',
        quickReplies: QUICK_REPLIES
      };
    }

    if (/menu|all\s*product|show\s*all|what\s*do\s*you\s*(have|sell|offer)/.test(text)) {
      return {
        text: '📋 **Full Xayliciouss Menu:**',
        products: products,
        quickReplies: ['🎂 Best sellers', '💰 Budget picks']
      };
    }

    if (/add.*cart|add.*to.*cart/.test(text)) {
      const found = findProductsByName(text);
      if (found.length === 1) {
        addProductToCart(found[0].id);
        return {
          text: `✅ Added **${found[0].name}** to your cart! (${formatCurrency(found[0].price)})\n\nWould you like to add anything else?`,
          quickReplies: ['View my cart', 'Checkout WhatsApp', '🎂 Best sellers']
        };
      }
    }

    const productMatches = findProductsByName(text);
    if (productMatches.length === 1) {
      const p = productMatches[0];
      return {
        text: `Here's what I found about **${p.name}**:`,
        products: [p],
        quickReplies: ['Add to cart', '💰 Budget picks', '🎁 Gift ideas']
      };
    }
    if (productMatches.length > 1) {
      return {
        text: `I found ${productMatches.length} products matching your query:`,
        products: productMatches.slice(0, 4),
        quickReplies: ['Show all products', '🎂 Best sellers']
      };
    }

    for (const faq of FAQ_DATA) {
      if (text.includes(faq.q.toLowerCase().slice(0, 15)) || faq.q.toLowerCase().includes(text.slice(0, 20))) {
        return { text: faq.a, quickReplies: QUICK_REPLIES };
      }
    }

    const aiReply = await generateServerAIResponse(userMessage);
    if (aiReply) return aiReply;

    return {
      text: `I'd love to help! 🍰 Here are some things I can assist with:

• Recommend products for events & budgets
• Explain ingredients & flavors
• Guide you through ordering
• Show best sellers & menu

Try asking something like "Recommend a birthday cake under ₹800" or tap a quick reply below!`,
      quickReplies: QUICK_REPLIES
    };
  }

  function handleWhatsAppCheckout() {
    const cartItems = getCartItems();
    if (!cartItems.length) {
      return {
        text: '🛒 Your cart is empty! Let me recommend some treats first.',
        quickReplies: ['🎂 Best sellers', '💰 Budget picks']
      };
    }

    if (!isUserSignedIn()) {
      openSignInPageForOrder();
      return {
        text: 'Please sign in before placing your order. This keeps your order history, tracking details, and bonus points safe in your dashboard.',
        quickReplies: ['Sign In', 'View my cart', '🎂 Best sellers']
      };
    }

    const lines = cartItems.map((item, i) => `${i + 1}. ${item.name} x ${item.quantity} - ${formatCurrency(item.price * item.quantity)}`);
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const message = `Hello Xayliciouss, I would like to place an order:\n\n${lines.join('\n')}\n\nTotal: ${formatCurrency(total)}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    return {
      text: '✅ Opening WhatsApp with your order details! Our team will confirm everything with you shortly.',
      quickReplies: ['🎂 Best sellers', '🎁 Gift ideas']
    };
  }

  function getCartItems() {
    if (window.Xayliciouss?.getCart) return window.Xayliciouss.getCart();
    try {
      return JSON.parse(localStorage.getItem('xaylicioussCart') || '[]');
    } catch {
      return [];
    }
  }

  function addProductToCart(productId) {
    if (window.Xayliciouss?.addToCart) {
      window.Xayliciouss.addToCart(productId);
      return;
    }
    try {
      const cart = getCartItems();
      const products = getProducts();
      const product = products.find((p) => p.id === Number(productId));
      if (!product) return;
      const existing = cart.find((i) => i.id === product.id);
      if (existing) existing.quantity += 1;
      else cart.push({ ...product, quantity: 1 });
      localStorage.setItem('xaylicioussCart', JSON.stringify(cart));
    } catch {
      showToast('Could not add to cart.');
    }
  }

  /* ── Markdown-lite rendering ── */

  function renderMarkdown(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /* ── UI Rendering ── */

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'chatbot-root';
    container.innerHTML = `
      <button class="chatbot-launcher" id="chatbotLauncher" type="button" aria-label="Open Xayliciouss AI Assistant">
        <span class="chatbot-badge hidden" id="chatbotBadge">1</span>
        <span class="chatbot-launcher-logo cb-icon-chat" aria-hidden="true">
          <span class="chatbot-launcher-x">X</span>
          <span class="chatbot-launcher-ai">AI</span>
        </span>
        <svg class="cb-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="chatbot-window" id="chatbotWindow" role="dialog" aria-label="Xayliciouss AI Assistant" aria-hidden="true">
        <div class="chatbot-loading" id="chatbotLoading">
          <div class="chatbot-loading-spinner"></div>
          <p>Initializing assistant…</p>
        </div>

        <header class="chatbot-header">
          <div class="chatbot-avatar" aria-hidden="true"><span class="chatbot-avatar-x">X</span><span class="chatbot-avatar-ai">AI</span></div>
          <div class="chatbot-header-info">
            <h3>Xayliciouss AI Assistant</h3>
            <p><span class="chatbot-status-dot"></span> Online · Bakery Support</p>
          </div>
          <div class="chatbot-header-actions">
            <button class="chatbot-header-btn" id="chatbotSearchToggle" type="button" aria-label="Search conversations" title="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button class="chatbot-header-btn" id="chatbotFaqToggle" type="button" aria-label="FAQ suggestions" title="FAQ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </button>
            <button class="chatbot-header-btn" id="chatbotThemeToggle" type="button" aria-label="Toggle dark mode" title="Theme">
              <svg id="chatbotThemeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button class="chatbot-header-btn" id="chatbotClearBtn" type="button" aria-label="Clear chat history" title="Clear chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <button class="chatbot-mobile-close-btn" id="chatbotMobileCloseBtn" type="button" aria-label="Close chatbot" title="Close chatbot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <div class="chatbot-search" id="chatbotSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="chatbotSearchInput" placeholder="Search previous messages…" autocomplete="off" />
        </div>

        <div class="chatbot-faq-panel" id="chatbotFaqPanel">
          <h4>Frequently Asked</h4>
          <div class="chatbot-faq-list" id="chatbotFaqList"></div>
        </div>

        <div class="chatbot-messages" id="chatbotMessages" role="log" aria-live="polite" aria-relevant="additions"></div>

        <div class="chatbot-typing hidden" id="chatbotTyping" aria-label="Assistant is typing">
          <div class="chatbot-msg-avatar">🧁</div>
          <div class="chatbot-typing-dots"><span></span><span></span><span></span></div>
        </div>

        <div class="chatbot-quick-replies" id="chatbotQuickReplies"></div>

        <div class="chatbot-input-area">
          <div class="chatbot-input-row">
            <div class="chatbot-input-actions">
              <button class="chatbot-action-btn" id="chatbotVoiceBtn" type="button" aria-label="Voice input" title="Voice input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button class="chatbot-action-btn" id="chatbotSpeechBtn" type="button" aria-label="Toggle speech output" title="Read aloud">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              </button>
              <button class="chatbot-action-btn" id="chatbotUploadBtn" type="button" aria-label="Upload image" title="Upload image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
            </div>
            <div class="chatbot-input-wrap">
              <textarea id="chatbotInput" rows="1" placeholder="Ask about cakes, orders.." aria-label="Message input"></textarea>
            </div>
            <button class="chatbot-send-btn" id="chatbotSendBtn" type="button" aria-label="Send message" disabled>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p class="chatbot-input-hint">Press Enter to send · Shift+Enter for new line · Supports emoji 😊</p>
        </div>

        <input type="file" class="chatbot-file-input" id="chatbotFileInput" accept="image/*" />
        <div class="chatbot-toast" id="chatbotToast" role="alert"></div>
      </div>
    `;
    document.body.appendChild(container);
    cacheElements();
    renderFaqList();
  }

  function cacheElements() {
    elements = {
      launcher: document.getElementById('chatbotLauncher'),
      window: document.getElementById('chatbotWindow'),
      loading: document.getElementById('chatbotLoading'),
      messages: document.getElementById('chatbotMessages'),
      typing: document.getElementById('chatbotTyping'),
      input: document.getElementById('chatbotInput'),
      sendBtn: document.getElementById('chatbotSendBtn'),
      quickReplies: document.getElementById('chatbotQuickReplies'),
      badge: document.getElementById('chatbotBadge'),
      search: document.getElementById('chatbotSearch'),
      searchInput: document.getElementById('chatbotSearchInput'),
      faqPanel: document.getElementById('chatbotFaqPanel'),
      faqList: document.getElementById('chatbotFaqList'),
      toast: document.getElementById('chatbotToast'),
      fileInput: document.getElementById('chatbotFileInput'),
      themeIcon: document.getElementById('chatbotThemeIcon'),
      voiceBtn: document.getElementById('chatbotVoiceBtn'),
      speechBtn: document.getElementById('chatbotSpeechBtn')
    };
  }

  function renderFaqList() {
    if (!elements.faqList) return;
    elements.faqList.innerHTML = FAQ_DATA.map(
      (faq) => `<button class="chatbot-faq-item" type="button" data-faq="${escapeHtml(faq.q)}">${escapeHtml(faq.q)}</button>`
    ).join('');
  }

  function renderMessages(searchTerm = '') {
    if (!elements.messages) return;

    const term = searchTerm.toLowerCase().trim();
    const filtered = term
      ? state.messages.filter((m) => m.text.toLowerCase().includes(term))
      : state.messages;

    elements.messages.innerHTML = '';

    filtered.forEach((msg) => {
      const el = createMessageElement(msg, term);
      elements.messages.appendChild(el);
    });

    scrollToBottom();
  }

  function createMessageElement(msg, highlightTerm = '') {
    const wrapper = document.createElement('div');
    wrapper.className = `chatbot-message ${msg.role}`;
    wrapper.dataset.id = msg.id;

    let textContent = renderMarkdown(msg.text);
    if (highlightTerm) {
      const regex = new RegExp(`(${highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      textContent = textContent.replace(regex, '<span class="chatbot-highlight">$1</span>');
    }

    let extraHTML = '';
    if (msg.products?.length) {
      extraHTML = buildProductCardsHTML(msg.products);
    }
    if (msg.image) {
      extraHTML += `<img class="chatbot-msg-image" src="${msg.image}" alt="Uploaded image" />`;
    }

    const avatar = msg.role === 'bot' ? '🧁' : '👤';

    wrapper.innerHTML = `
      <div class="chatbot-msg-avatar" aria-hidden="true">${avatar}</div>
      <div class="chatbot-msg-body">
        <div class="chatbot-msg-bubble">${textContent}${extraHTML}</div>
        <span class="chatbot-msg-time">${formatTime(new Date(msg.timestamp))}</span>
      </div>
    `;

    return wrapper;
  }

  function renderQuickReplies(replies) {
    if (!elements.quickReplies) return;
    const items = replies || QUICK_REPLIES;
    elements.quickReplies.innerHTML = items
      .map((r) => `<button class="chatbot-quick-btn" type="button">${escapeHtml(r)}</button>`)
      .join('');
  }

  function scrollToBottom() {
    if (!elements.messages) return;
    requestAnimationFrame(() => {
      elements.messages.scrollTop = elements.messages.scrollHeight;
    });
  }

  function showWelcomeMessage() {
    if (state.welcomeShown && state.messages.length) return;

    const user = getSignedInUser();
    const greeting = user?.name
      ? `Welcome back, ${user.name.split(' ')[0]}! 🎂`
      : 'Welcome to Xayliciouss! 🧁';

    const welcomeMsg = {
      id: generateId(),
      role: 'bot',
      text: `${greeting}\n\nI'm your personal bakery assistant. I can help you find the perfect treats, recommend gifts, explain flavors, and guide you through ordering.\n\nWhat would you like to explore today?`,
      timestamp: Date.now(),
      products: null
    };

    if (!state.messages.length) {
      state.messages.push(welcomeMsg);
      saveHistory();
    }
    state.welcomeShown = true;
    renderMessages();
    renderQuickReplies(QUICK_REPLIES);
  }

  function updateThemeIcon() {
    if (!elements.themeIcon) return;
    if (state.theme === 'dark') {
      elements.themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
      elements.themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  function updateBadge() {
    if (!elements.badge) return;
    if (state.unreadCount > 0 && !state.isOpen) {
      elements.badge.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
      elements.badge.classList.remove('hidden');
    } else {
      elements.badge.classList.add('hidden');
      state.unreadCount = 0;
    }
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
  }

  /* ── Chat Logic ── */

  async function sendMessage(text, options = {}) {
    const trimmed = text?.trim();
    if (!trimmed || state.isTyping) return;

    const userMsg = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
      image: options.image || null
    };

    state.messages.push(userMsg);
    saveHistory();
    renderMessages(state.searchActive ? elements.searchInput?.value : '');
    elements.input.value = '';
    autoResizeInput();
    updateSendButton();

    state.isTyping = true;
    elements.typing.classList.remove('hidden');
    scrollToBottom();

    try {
      await randomDelay();

      let response;
      if (options.image) {
        response = {
          text: "Thanks for sharing the image! 📸 While I can't analyze images in detail yet, I'd love to help you find something similar. Could you describe what you're looking for — a cake design, flavor, or occasion?",
          quickReplies: ['🎂 Best sellers', 'Custom cake options', '🎁 Gift ideas']
        };
      } else {
        response = await generateResponse(trimmed);
      }

      elements.typing.classList.add('hidden');

      const botMsg = {
        id: generateId(),
        role: 'bot',
        text: response.text,
        timestamp: Date.now(),
        products: response.products || null
      };

      state.messages.push(botMsg);
      saveHistory();
      renderMessages(state.searchActive ? elements.searchInput?.value : '');
      renderQuickReplies(response.quickReplies || QUICK_REPLIES);

      if (!state.isOpen) {
        state.unreadCount += 1;
        updateBadge();
      }

      if (state.speechEnabled) {
        speakText(response.text.replace(/\*\*/g, '').replace(/[🎂💰🎁📦🚚🧁🍰🍫✨📞🛒✅📸🔄👋😊🌟💒💕🎉🥳📋🧁]/g, ''));
      }
    } catch {
      elements.typing.classList.add('hidden');
      const errorMsg = {
        id: generateId(),
        role: 'bot',
        text: "Oops! Something went wrong on my end. 😔 Please try again, or reach us directly on WhatsApp for immediate help.",
        timestamp: Date.now()
      };
      state.messages.push(errorMsg);
      saveHistory();
      renderMessages();
      showToast('Failed to get a response. Please try again.');
    } finally {
      state.isTyping = false;
    }
  }

  /* ── Voice ── */

  function isLocalHost() {
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  }

  function isVoiceSecureContext() {
    return window.isSecureContext || isLocalHost();
  }

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function updateVoiceButtonState() {
    if (!elements.voiceBtn) return;

    const SpeechRecognition = getSpeechRecognitionConstructor();
    const supported = Boolean(SpeechRecognition);
    const secure = isVoiceSecureContext();

    elements.voiceBtn.disabled = !supported || !secure;
    elements.voiceBtn.classList.toggle('unsupported', !supported || !secure);

    if (!supported) {
      elements.voiceBtn.title = 'Voice input works best in Google Chrome or Microsoft Edge.';
      elements.voiceBtn.setAttribute('aria-label', 'Voice input not supported in this browser');
    } else if (!secure) {
      elements.voiceBtn.title = 'Voice input needs localhost or HTTPS.';
      elements.voiceBtn.setAttribute('aria-label', 'Voice input needs localhost or HTTPS');
    } else {
      elements.voiceBtn.title = 'Click and speak';
      elements.voiceBtn.setAttribute('aria-label', 'Start voice input');
    }
  }

  function initSpeechRecognition() {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition || !isVoiceSecureContext()) {
      recognition = null;
      updateVoiceButtonState();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.isListening = true;
      elements.voiceBtn?.classList.add('active', 'listening');
      elements.voiceBtn?.setAttribute('aria-label', 'Listening. Click again to stop.');
      if (elements.input) {
        elements.input.placeholder = 'Listening... speak now';
      }
      showToast('Listening... speak now');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      const spokenText = (finalTranscript || interimTranscript).trim();
      if (spokenText && elements.input) {
        elements.input.value = spokenText;
        autoResizeInput();
        updateSendButton();
      }
    };

    recognition.onerror = (event) => {
      const errorMessages = {
        'not-allowed': 'Microphone permission was blocked. Please allow microphone access and try again.',
        'service-not-allowed': 'Speech service is blocked. Please allow microphone access in browser settings.',
        'no-speech': 'I could not hear anything. Please try again and speak clearly.',
        'audio-capture': 'No microphone was found. Please connect or enable your microphone.',
        network: 'Voice recognition needs internet access. Please check your connection.',
        aborted: 'Voice input stopped.'
      };

      showToast(errorMessages[event.error] || 'Voice input failed. Please type your message.');
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };

    updateVoiceButtonState();
  }

  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      showToast('Please allow microphone permission to use voice input.');
      return false;
    }
  }

  async function startListening() {
    if (!recognition) {
      updateVoiceButtonState();
      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (!SpeechRecognition) {
        showToast('Voice input works best in Google Chrome or Microsoft Edge.');
      } else if (!isVoiceSecureContext()) {
        showToast('Voice input works only on localhost or HTTPS. Use npm start and open localhost.');
      } else {
        showToast('Voice input is not ready. Please refresh and try again.');
      }
      return;
    }

    if (state.isTyping) {
      showToast('Please wait for the assistant response before using voice.');
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      stopListening();
      return;
    }

    try {
      recognition.abort?.();
    } catch {
      // Ignore abort errors before starting a fresh session.
    }

    try {
      recognition.start();
    } catch (error) {
      if (String(error?.message || '').toLowerCase().includes('already')) {
        showToast('Already listening. Speak now or click the mic again to stop.');
      } else {
        showToast('Could not start microphone. Please try again.');
        stopListening();
      }
    }
  }

  function stopListening() {
    state.isListening = false;
    elements.voiceBtn?.classList.remove('active', 'listening');
    if (elements.input) {
      elements.input.placeholder = 'Ask about cakes, orders...';
    }
    updateVoiceButtonState();
  }

  function toggleVoice() {
    if (state.isListening) {
      try {
        recognition?.stop();
      } catch {
        stopListening();
      }
    } else {
      startListening();
    }
  }

  function speakText(text) {
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voices = synth.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Female')) || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    synth.speak(utterance);
  }

  function toggleSpeech() {
    state.speechEnabled = !state.speechEnabled;
    elements.speechBtn.classList.toggle('active', state.speechEnabled);
    if (!state.speechEnabled) synth?.cancel();
    showToast(state.speechEnabled ? 'Speech output enabled' : 'Speech output disabled');
  }

  /* ── File Upload ── */

  function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      sendMessage('I shared an image for reference', { image: e.target.result });
    };
    reader.onerror = () => showToast('Failed to read image.');
    reader.readAsDataURL(file);
  }

  /* ── Open/Close ── */

  function openChat() {
    state.isOpen = true;
    elements.window.classList.add('open');
    elements.launcher.classList.add('open');
    elements.window.setAttribute('aria-hidden', 'false');
    document.body.classList.add('chatbot-open');
    state.unreadCount = 0;
    updateBadge();
    elements.input.focus();

    if (!state.welcomeShown || !state.messages.length) {
      showWelcomeMessage();
    }
  }

  function closeChat() {
    state.isOpen = false;
    elements.window.classList.remove('open');
    elements.launcher.classList.remove('open');
    elements.window.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('chatbot-open');
    synth?.cancel();
    if (state.isListening) recognition?.stop();
  }

  function toggleChat() {
    if (state.isOpen) closeChat();
    else openChat();
  }

  /* ── Input Helpers ── */

  function autoResizeInput() {
    if (!elements.input) return;
    elements.input.style.height = 'auto';
    elements.input.style.height = Math.min(elements.input.scrollHeight, 100) + 'px';
  }

  function updateSendButton() {
    if (!elements.sendBtn || !elements.input) return;
    elements.sendBtn.disabled = !elements.input.value.trim() || state.isTyping;
  }

  /* ── Event Listeners ── */

  function attachEvents() {
    elements.launcher?.addEventListener('click', toggleChat);
    document.getElementById('chatbotMobileCloseBtn')?.addEventListener('click', closeChat);

    elements.sendBtn?.addEventListener('click', () => sendMessage(elements.input.value));

    elements.input?.addEventListener('input', () => {
      autoResizeInput();
      updateSendButton();
    });

    elements.input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (elements.input.value.trim() && !state.isTyping) sendMessage(elements.input.value);
      }
    });

    elements.quickReplies?.addEventListener('click', (e) => {
      const btn = e.target.closest('.chatbot-quick-btn');
      if (!btn) return;
      const text = btn.textContent.trim();
      if (text === 'Sign In') {
        openSignInPageForOrder();
      } else if (text === 'Add to cart') {
        sendMessage('Show me best sellers to add');
      } else if (text === 'View my cart') {
        sendMessage('What is in my cart?');
      } else if (text === 'Checkout WhatsApp') {
        sendMessage('Checkout on WhatsApp');
      } else if (text === 'Contact WhatsApp') {
        sendMessage('Checkout on WhatsApp');
      } else if (text === 'Sign In') {
        openSignInPageForOrder();
      } else if (text === 'Show all products') {
        sendMessage('Show me the full menu');
      } else if (text === 'Custom cake options') {
        sendMessage('Tell me about custom cakes');
      } else if (text === 'Show more options') {
        sendMessage('Show me the full menu');
      } else if (text === 'Show menu') {
        sendMessage('Show me the full menu');
      } else if (text === 'Customer service') {
        window.location.href = 'customer-service.html';
      } else {
        sendMessage(text);
      }
    });

    elements.messages?.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('.chatbot-add-cart-btn');
      if (cartBtn) {
        addProductToCart(cartBtn.dataset.productId);
        showToast('Added to cart! 🛒');
      }
    });

    document.getElementById('chatbotThemeToggle')?.addEventListener('click', toggleTheme);

    document.getElementById('chatbotClearBtn')?.addEventListener('click', () => {
      if (confirm('Clear all chat history?')) clearHistory();
    });

    document.getElementById('chatbotSearchToggle')?.addEventListener('click', () => {
      state.searchActive = !state.searchActive;
      elements.search.classList.toggle('active', state.searchActive);
      if (state.searchActive) elements.searchInput?.focus();
      else {
        elements.searchInput.value = '';
        renderMessages();
      }
    });

    elements.searchInput?.addEventListener('input', (e) => renderMessages(e.target.value));

    document.getElementById('chatbotFaqToggle')?.addEventListener('click', () => {
      state.faqActive = !state.faqActive;
      elements.faqPanel.classList.toggle('active', state.faqActive);
    });

    elements.faqList?.addEventListener('click', (e) => {
      const item = e.target.closest('.chatbot-faq-item');
      if (!item) return;
      state.faqActive = false;
      elements.faqPanel.classList.remove('active');
      sendMessage(item.dataset.faq);
    });

    elements.voiceBtn?.addEventListener('click', toggleVoice);
    elements.speechBtn?.addEventListener('click', toggleSpeech);

    document.getElementById('chatbotUploadBtn')?.addEventListener('click', () => elements.fileInput?.click());
    elements.fileInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFileUpload(e.target.files[0]);
      e.target.value = '';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) closeChat();
    });
  }

  /* ── Init ── */

  async function init() {
    createWidget();
    loadHistory();
    loadTheme();
    initSpeechRecognition();
    attachEvents();
    renderMessages();
    renderQuickReplies(QUICK_REPLIES);
    updateSendButton();

    await delay(800);
    elements.loading?.classList.add('hidden');

    if (!state.isOpen && state.messages.length === 0) {
      state.unreadCount = 1;
      updateBadge();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
