'use strict';

const dashboardElements = {};

function formatCurrencyDashboard(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function getDashboardApiBaseUrl() {
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

function getDashboardUser() {
  try {
    return JSON.parse(localStorage.getItem('xaylicioussSignedInUser')) || null;
  } catch (error) {
    localStorage.removeItem('xaylicioussSignedInUser');
    return null;
  }
}

function getLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem('xaylicioussOrders')) || [];
  } catch (error) {
    localStorage.removeItem('xaylicioussOrders');
    return [];
  }
}

async function fetchUserOrders(user) {
  const apiBase = getDashboardApiBaseUrl();
  const url = `${apiBase}/api/user/orders?contact=${encodeURIComponent(user.contact)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Unable to load your orders right now.');
  }

  return data;
}

function getFallbackDashboardData(user) {
  const orders = getLocalOrders().filter((order) => {
    const customer = order.customer || {};
    return String(customer.contact || '').toLowerCase() === String(user.contact || '').toLowerCase();
  });

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const bonusPoints = orders.reduce((sum, order) => sum + Number(order.bonusPoints || Math.floor(Number(order.total || 0) / 50)), 0);

  return {
    success: true,
    orders,
    summary: {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status)).length,
      totalSpent,
      bonusPoints
    }
  };
}

function renderLatestOrder(order) {
  if (!dashboardElements.latestOrderBox) return;

  if (!order) {
    dashboardElements.latestOrderBox.innerHTML = '<p>No orders found yet. Add products to cart and checkout through WhatsApp to create order history.</p>';
    return;
  }

  const status = order.status || 'WhatsApp Started';
  const statusSteps = ['WhatsApp Started', 'Order Confirmed', 'Preparing', 'Ready / Delivery', 'Delivered'];
  const activeIndex = Math.max(0, statusSteps.indexOf(status));
  const itemSummary = (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join(', ');

  dashboardElements.latestOrderBox.innerHTML = `
    <div class="latest-order-head">
      <div>
        <span>Order ID</span>
        <strong>${order.id || order.localId || 'LOCAL ORDER'}</strong>
      </div>
      <div>
        <span>Total</span>
        <strong>${formatCurrencyDashboard(order.total)}</strong>
      </div>
    </div>
    <p>${itemSummary || 'Order items not available.'}</p>
    <p><strong>Status:</strong> ${status}</p>
    <div class="order-timeline" aria-label="Order status timeline">
      ${statusSteps.map((step, index) => `<div class="timeline-step ${index <= activeIndex ? 'active' : ''}"><span></span><p>${step}</p></div>`).join('')}
    </div>
  `;
}

function renderOrderHistory(orders) {
  if (!dashboardElements.orderHistoryList) return;

  if (!orders.length) {
    dashboardElements.orderHistoryList.innerHTML = `
      <article class="empty-dashboard-card">
        <h3>No order history yet</h3>
        <p>Your completed WhatsApp checkout orders will appear here.</p>
        <a class="btn btn-primary" href="index.html#menu">Start Ordering</a>
      </article>
    `;
    return;
  }

  dashboardElements.orderHistoryList.innerHTML = orders.map((order) => {
    const items = (order.items || []).map((item) => `<li>${item.name} x ${item.quantity} <span>${formatCurrencyDashboard(item.lineTotal || item.price * item.quantity)}</span></li>`).join('');
    const date = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'Date not available';

    return `
      <article class="order-history-card">
        <div class="order-history-top">
          <div><span>Order ID</span><strong>${order.id || order.localId || 'LOCAL ORDER'}</strong></div>
          <div><span>Status</span><strong>${order.status || 'WhatsApp Started'}</strong></div>
          <div><span>Bonus</span><strong>${order.bonusPoints || Math.floor(Number(order.total || 0) / 50)} pts</strong></div>
        </div>
        <ul>${items}</ul>
        <div class="order-history-bottom"><span>${date}</span><strong>${formatCurrencyDashboard(order.total)}</strong></div>
      </article>
    `;
  }).join('');
}

function renderDashboard(user, data) {
  const summary = data.summary || {};
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const latestOrder = orders[0] || null;

  if (dashboardElements.dashboardGreeting) {
    dashboardElements.dashboardGreeting.textContent = `Welcome ${user.name}. Manage your Xayliciouss orders, support requests, and reward points here.`;
  }

  dashboardElements.totalOrdersCount.textContent = summary.totalOrders || 0;
  dashboardElements.activeOrdersCount.textContent = summary.activeOrders || 0;
  dashboardElements.totalSpentAmount.textContent = formatCurrencyDashboard(summary.totalSpent || 0);
  dashboardElements.bonusPointsCount.textContent = summary.bonusPoints || 0;
  dashboardElements.dashboardPointsBig.textContent = summary.bonusPoints || 0;

  renderLatestOrder(latestOrder);
  renderOrderHistory(orders);
}

function renderSignedOutDashboard() {
  if (dashboardElements.dashboardGreeting) {
    dashboardElements.dashboardGreeting.textContent = 'You are not signed in. Please sign in to view order tracking, order history, and bonus points.';
  }

  dashboardElements.latestOrderBox.innerHTML = '<p>Please sign in first to track your orders.</p><a class="btn btn-primary" href="signin.html">Sign In</a>';
  dashboardElements.orderHistoryList.innerHTML = '<article class="empty-dashboard-card"><h3>Dashboard locked</h3><p>Sign in to view your private order history.</p><a class="btn btn-primary" href="signin.html">Sign In</a></article>';
}

function handleDashboardLogout() {
  localStorage.removeItem('xaylicioussSignedInUser');
  window.location.href = 'signin.html';
}

async function loadDashboard() {
  const user = getDashboardUser();
  if (!user) {
    renderSignedOutDashboard();
    return;
  }

  try {
    const data = await fetchUserOrders(user);
    renderDashboard(user, data);
  } catch (error) {
    renderDashboard(user, getFallbackDashboardData(user));
  }
}

function cacheDashboardElements() {
  dashboardElements.dashboardGreeting = document.getElementById('dashboardGreeting');
  dashboardElements.dashboardPointsBig = document.getElementById('dashboardPointsBig');
  dashboardElements.totalOrdersCount = document.getElementById('totalOrdersCount');
  dashboardElements.activeOrdersCount = document.getElementById('activeOrdersCount');
  dashboardElements.totalSpentAmount = document.getElementById('totalSpentAmount');
  dashboardElements.bonusPointsCount = document.getElementById('bonusPointsCount');
  dashboardElements.latestOrderBox = document.getElementById('latestOrderBox');
  dashboardElements.orderHistoryList = document.getElementById('orderHistoryList');
  dashboardElements.dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');
}

function initDashboard() {
  cacheDashboardElements();
  if (dashboardElements.dashboardLogoutBtn) dashboardElements.dashboardLogoutBtn.addEventListener('click', handleDashboardLogout);
  loadDashboard();
}

document.addEventListener('DOMContentLoaded', initDashboard);
