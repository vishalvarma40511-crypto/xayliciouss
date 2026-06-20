'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DB_DIR = path.join(ROOT_DIR, 'database');
const DB_FILE = path.join(DB_DIR, 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()'
};

function ensureDatabaseFile() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], reports: [], orders: [] }, null, 2));
  }
}

function readDatabase() {
  ensureDatabaseFile();
  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf8');
    const parsedData = rawData ? JSON.parse(rawData) : {};
    return {
      users: Array.isArray(parsedData.users) ? parsedData.users : [],
      reports: Array.isArray(parsedData.reports) ? parsedData.reports : [],
      orders: Array.isArray(parsedData.orders) ? parsedData.orders : []
    };
  } catch (error) {
    const backupPath = path.join(DB_DIR, `db-corrupted-${Date.now()}.json`);
    if (fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, backupPath);
    const cleanDatabase = { users: [], reports: [], orders: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanDatabase, null, 2));
    return cleanDatabase;
  }
}

function writeDatabase(database) {
  ensureDatabaseFile();
  const cleanDatabase = {
    users: Array.isArray(database.users) ? database.users : [],
    reports: Array.isArray(database.reports) ? database.reports : [],
    orders: Array.isArray(database.orders) ? database.orders : []
  };
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(cleanDatabase, null, 2));
  fs.renameSync(tempFile, DB_FILE);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

function normalizeContact(contact) {
  return String(contact || '').trim().toLowerCase();
}

function createId(prefix) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return { salt, passwordHash };
}

function removePrivateUserFields(user) {
  return {
    id: user.id,
    name: user.name,
    contact: user.contact,
    provider: user.provider || 'Email/Phone',
    createdAt: user.createdAt
  };
}

function findUserByContact(database, contact) {
  return database.users.find((user) => normalizeContact(user.contact) === normalizeContact(contact));
}

function getDatabaseStats(database = readDatabase()) {
  return {
    users: database.users.length,
    reports: database.reports.length,
    orders: database.orders.length
  };
}

async function handleRegister(request, response) {
  const body = await readRequestBody(request);
  const name = String(body.name || '').trim();
  const contact = normalizeContact(body.contact);
  const password = String(body.password || '').trim();

  if (!name || !contact || !password) {
    sendJson(response, 400, { success: false, message: 'Name, contact, and password are required.' });
    return;
  }

  if (password.length < 6) {
    sendJson(response, 400, { success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  const database = readDatabase();
  if (findUserByContact(database, contact)) {
    sendJson(response, 409, { success: false, message: 'An account already exists with this contact.' });
    return;
  }

  const { salt, passwordHash } = hashPassword(password);
  const user = {
    id: createId('USR'),
    name,
    contact,
    provider: 'Email/Phone',
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  database.users.unshift(user);
  writeDatabase(database);
  sendJson(response, 201, { success: true, message: 'Account created successfully.', user: removePrivateUserFields(user) });
}

async function handleLogin(request, response) {
  const body = await readRequestBody(request);
  const contact = normalizeContact(body.contact);
  const password = String(body.password || '').trim();

  if (!contact || !password) {
    sendJson(response, 400, { success: false, message: 'Contact and password are required.' });
    return;
  }

  const database = readDatabase();
  const user = findUserByContact(database, contact);

  if (!user || !user.passwordHash || !user.salt) {
    sendJson(response, 401, { success: false, message: 'Invalid contact or password.' });
    return;
  }

  const { passwordHash } = hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) {
    sendJson(response, 401, { success: false, message: 'Invalid contact or password.' });
    return;
  }

  sendJson(response, 200, { success: true, message: 'Signed in successfully.', user: removePrivateUserFields(user) });
}

async function handleGooglePrototypeSignIn(request, response) {
  const body = await readRequestBody(request);
  const name = String(body.name || '').trim();
  const contact = normalizeContact(body.contact || body.email);

  if (!name || !contact) {
    sendJson(response, 400, { success: false, message: 'Google account name and email are required.' });
    return;
  }

  const database = readDatabase();
  let user = findUserByContact(database, contact);

  if (user) {
    user.name = user.name || name;
    user.provider = user.provider || 'Google Prototype';
    user.lastLoginAt = new Date().toISOString();
  } else {
    user = {
      id: createId('USR'),
      name,
      contact,
      provider: 'Google Prototype',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    database.users.unshift(user);
  }

  writeDatabase(database);
  sendJson(response, 200, {
    success: true,
    message: 'Prototype Google sign-in completed.',
    user: removePrivateUserFields(user)
  });
}

async function handleSaveReport(request, response) {
  const body = await readRequestBody(request);
  const name = String(body.name || '').trim();
  const contact = String(body.contact || '').trim();
  const requestType = String(body.requestType || '').trim();
  const message = String(body.message || '').trim();

  if (!name || !contact || !requestType || !message) {
    sendJson(response, 400, { success: false, message: 'Name, contact, request type, and message are required.' });
    return;
  }

  const database = readDatabase();
  const report = {
    id: body.id || createId('RPT'),
    name,
    contact,
    requestType,
    message,
    expectedResponse: body.expectedResponse || 'Within 24 working hours',
    status: 'New',
    createdAt: new Date().toISOString()
  };

  database.reports.unshift(report);
  writeDatabase(database);
  sendJson(response, 201, { success: true, message: 'Report saved to database/db.json.', report, databaseStats: getDatabaseStats() });
}

async function handleSaveOrder(request, response) {
  const body = await readRequestBody(request);
  const items = Array.isArray(body.items) ? body.items : [];
  const total = Number(body.total || 0);

  if (items.length === 0 || total <= 0) {
    sendJson(response, 400, { success: false, message: 'Order items and total are required.' });
    return;
  }

  const customer = body.customer || null;
  const customerContact = normalizeContact(customer && customer.contact);
  if (!customer || !customerContact) {
    sendJson(response, 401, { success: false, message: 'Please sign in before placing an order.' });
    return;
  }

  const database = readDatabase();
  const order = {
    id: createId('ORD'),
    localId: body.localId || null,
    customer,
    items,
    total,
    bonusPoints: Math.floor(total / 50),
    channel: body.channel || 'WhatsApp Checkout',
    status: body.status || 'WhatsApp Started',
    estimatedDelivery: body.estimatedDelivery || 'After order confirmation',
    createdAt: new Date().toISOString()
  };

  database.orders.unshift(order);
  writeDatabase(database);
  sendJson(response, 201, { success: true, message: 'Order saved to database/db.json.', order, databaseStats: getDatabaseStats() });
}

function handleUserOrders(request, response, url) {
  const contact = normalizeContact(url.searchParams.get('contact'));
  if (!contact) {
    sendJson(response, 400, { success: false, message: 'User contact is required.' });
    return;
  }

  const database = readDatabase();
  const orders = database.orders.filter((order) => normalizeContact(order.customer && order.customer.contact) === contact);
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const bonusPoints = orders.reduce((sum, order) => sum + Number(order.bonusPoints || Math.floor(Number(order.total || 0) / 50)), 0);

  sendJson(response, 200, {
    success: true,
    orders,
    summary: {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status)).length,
      totalSpent,
      bonusPoints
    }
  });
}


const CHATBOT_PRODUCTS = [
  { name: 'Classic Chocolate Brownie', category: 'Brownies', price: 120, badge: 'Best Seller', description: 'Soft, rich chocolate brownie with a fudgy center and premium cocoa flavor.' },
  { name: 'Fudge Brownie Box', category: 'Brownies', price: 399, badge: 'Gift Box', description: 'Gift-ready box of dense fudge brownies for sharing and celebrations.' },
  { name: 'Mini Bento Cake', category: 'Cakes', price: 499, badge: 'Customizable', description: 'Cute mini cake with elegant frosting and personalized message.' },
  { name: 'Chocolate Truffle Cake', category: 'Cakes', price: 899, badge: 'Premium', description: 'Layered chocolate sponge with smooth truffle cream and rich chocolate glaze.' },
  { name: 'Vanilla Celebration Cake', category: 'Cakes', price: 799, badge: 'Celebration', description: 'Classic vanilla cake with silky cream and celebration-ready design.' },
  { name: 'Red Velvet Cupcake', category: 'Cupcakes', price: 149, badge: 'Elegant', description: 'Moist red velvet cupcake topped with creamy frosting.' },
  { name: 'Chocolate Cupcake', category: 'Cupcakes', price: 139, badge: 'Popular', description: 'Chocolate cupcake with soft crumb, smooth frosting, and rich cocoa taste.' },
  { name: 'Premium Dessert Box', category: 'Dessert Boxes', price: 699, badge: 'Assorted', description: 'Assorted dessert box with brownies, cupcakes, cookies, and mini treats.' },
  { name: 'Custom Gift Dessert Box', category: 'Dessert Boxes', price: 849, badge: 'Personalized', description: 'Personalized dessert box with theme packaging and treats.' },
  { name: 'Butter Cookies', category: 'Cookies', price: 249, badge: 'Homemade', description: 'Crisp, buttery homemade cookies for tea-time and gifting.' },
  { name: 'Choco Chip Cookies', category: 'Cookies', price: 279, badge: 'Fresh Batch', description: 'Golden cookies filled with chocolate chips and a soft center.' },
  { name: 'Seasonal Special Cake', category: 'Cakes', price: 999, badge: 'Seasonal', description: 'Limited-season premium cake with special flavors and elegant decoration.' }
];

function buildChatbotPrompt(message, history = [], cart = {}, user = null) {
  const productLines = CHATBOT_PRODUCTS
    .map((product) => `- ${product.name} (${product.category}) ₹${product.price}: ${product.description} Badge: ${product.badge}`)
    .join('\n');

  const shortHistory = Array.isArray(history)
    ? history.slice(-6).map((item) => `${item.sender === 'user' ? 'Customer' : 'Assistant'}: ${String(item.text || '').slice(0, 220)}`).join('\n')
    : '';

  const customerName = user && user.name ? user.name : 'Guest customer';
  const cartText = cart && Number(cart.totalItems || 0) > 0
    ? `${cart.totalItems} item(s), estimated total ₹${cart.totalPrice || 0}`
    : 'empty cart';

  return `You are the Xayliciouss AI Assistant for a premium homemade bakery website.

Brand personality: premium, warm, elegant, homemade, trustworthy, aesthetic, and customer-friendly.
Website product categories: Brownies, Cakes, Cupcakes, Dessert Boxes, Cookies, Custom Desserts.
Customer: ${customerName}
Current cart: ${cartText}

Available products and prices:
${productLines}

Website features you can guide customers to:
- Menu section for products and prices
- Cart and WhatsApp checkout
- Customer Service page for delivery support, custom cake requests, feedback, complaints, and order enquiries
- Dashboard for signed-in users to view order history, tracking, and bonus points
- Gmail contact: xaylicioussofficial@gmail.com

Conversation context:
${shortHistory || 'No previous context.'}

Customer message:
${message}

Rules:
1. Answer naturally and directly in 2 to 5 short sentences.
2. First focus on Xayliciouss website, products, ordering, delivery, support, dashboard, bonus points, and contact options.
3. For general questions, answer briefly, then politely connect the answer to Xayliciouss desserts or celebrations without sounding forced.
4. Suggest specific products and prices when useful.
5. For low-cost snacks, suggest Classic Chocolate Brownie ₹120, Chocolate Cupcake ₹139, Red Velvet Cupcake ₹149, Butter Cookies ₹249, or Choco Chip Cookies ₹279.
6. Do not mention backend, database, npm, API, Gemini, prototype, code, or technical implementation.
7. Do not claim an order is confirmed. Say final confirmation happens through the Xayliciouss team after WhatsApp/contact follow-up.
8. If asked for unsafe medical/legal/financial advice, give a brief safe response and suggest a qualified professional.
9. Keep the tone premium, friendly, and bakery-focused.`;
}

function getSuggestedChatActions(reply) {
  const lower = String(reply || '').toLowerCase();
  const actions = [];

  if (/menu|product|brownie|cake|cupcake|cookie|dessert|price|snack/.test(lower)) {
    actions.push({ label: 'View Menu', action: 'link', value: 'menu.html' });
  }

  if (/cart|checkout|order/.test(lower)) {
    actions.push({ label: 'Open Cart', action: 'cart', value: '' });
  }

  if (/customer service|support|custom|delivery|feedback|complaint|request/.test(lower)) {
    actions.push({ label: 'Customer Service', action: 'link', value: 'customer-service.html#serviceReportForm' });
  }

  if (/gmail|email|write to us/.test(lower)) {
    actions.push({ label: 'Open Gmail', action: 'gmail', value: 'Xayliciouss Customer Enquiry' });
  }

  if (/whatsapp/.test(lower)) {
    actions.push({ label: 'WhatsApp Support', action: 'whatsapp', value: 'Hello Xayliciouss, I need support.' });
  }

  return actions.slice(0, 3);
}

async function handleChatbot(request, response) {
  const body = await readRequestBody(request);
  const message = String(body.message || '').trim();

  if (!message) {
    sendJson(response, 400, { success: false, message: 'Please type a question.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    sendJson(response, 503, {
      success: false,
      message: 'Assistant is temporarily using local responses.'
    });
    return;
  }

  const prompt = buildChatbotPrompt(message, body.history, body.cart, body.user);
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        maxOutputTokens: 280
      }
    })
  });

  const geminiData = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    sendJson(response, 502, {
      success: false,
      message: 'Assistant could not answer right now.'
    });
    return;
  }

  const reply = (((geminiData.candidates || [])[0] || {}).content || {}).parts || [];
  const replyText = reply.map((part) => part.text || '').join(' ').trim();

  if (!replyText) {
    sendJson(response, 502, { success: false, message: 'Assistant response was empty.' });
    return;
  }

  sendJson(response, 200, {
    success: true,
    reply: replyText,
    actions: getSuggestedChatActions(replyText)
  });
}

function serveStaticFile(request, response, url) {
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/index.html';

  const normalizedPath = path.normalize(filePath).replace(/^([.][.][\/])+/, '');
  const absolutePath = path.join(ROOT_DIR, normalizedPath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.readFile(absolutePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<h1>404 - Page not found</h1>');
      return;
    }

    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType, ...SECURITY_HEADERS });
    response.end(content);
  });
}

async function router(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { success: true });
    return;
  }

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        success: true,
        message: 'Xayliciouss website service is running.',
        stats: getDatabaseStats()
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/register') return await handleRegister(request, response);
    if (request.method === 'POST' && url.pathname === '/api/login') return await handleLogin(request, response);
    if (request.method === 'POST' && url.pathname === '/api/google-signin') return await handleGooglePrototypeSignIn(request, response);
    if (request.method === 'POST' && ['/api/reports', '/api/contact-reports', '/api/contact'].includes(url.pathname)) return await handleSaveReport(request, response);
    if (request.method === 'POST' && url.pathname === '/api/orders') return await handleSaveOrder(request, response);
    if (request.method === 'POST' && url.pathname === '/api/chatbot') return await handleChatbot(request, response);
    if (request.method === 'GET' && url.pathname === '/api/user/orders') return handleUserOrders(request, response, url);

    serveStaticFile(request, response, url);
  } catch (error) {
    sendJson(response, 500, { success: false, message: error.message || 'Server error.' });
  }
}

ensureDatabaseFile();
http.createServer(router).listen(PORT, () => {
  console.log(`Xayliciouss website running at http://localhost:${PORT}`);
  console.log(`User dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`Customer service: http://localhost:${PORT}/customer-service.html`);
});
