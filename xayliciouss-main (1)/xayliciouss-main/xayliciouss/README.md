# Xayliciouss Premium Bakery Website

A premium homemade bakery website prototype for **Xayliciouss** with product browsing, cart, WhatsApp ordering, sign-in dashboard, customer service, AI chatbot, SEO setup, social gallery display, and responsive luxury UI.

## Objective

To create a warm, premium, customer-friendly bakery website where customers can browse desserts, add products to cart, contact the brand, submit support requests, and start orders through WhatsApp.

## Features Included

- Luxury bakery homepage design
- Best sellers showcase
- Full menu page with search and category filters
- Easy product update structure through `js/products.js`
- Add to cart, quantity update, remove item, and total calculation
- WhatsApp checkout integration
- Floating WhatsApp button visible throughout the website
- Customer sign in and dashboard
- Order tracking, order history, and bonus points section
- Customer service page with functional support form
- Contact and inquiry form with client response and Report ID
- AI-style chatbot popup with Gemini-ready backend route
- Instagram-style gallery feed display with official account placeholder
- Customer reviews carousel
- FAQ accordion
- Google Maps section for location preview
- SEO meta tags, structured data, robots.txt, and sitemap.xml
- Responsive design for mobile, tablet, and desktop
- Security header configuration for safer hosting setup

## Technologies Used

- HTML
- CSS
- Vanilla JavaScript
- Node.js server for prototype storage and chatbot routing
- JSON file storage for demo data

## Folder Structure

```text
xayliciouss-bakery-website/
├── index.html
├── menu.html
├── about.html
├── reviews.html
├── faq.html
├── contact.html
├── customer-service.html
├── dashboard.html
├── signin.html
├── server.js
├── package.json
├── robots.txt
├── sitemap.xml
├── vercel.json
├── css/
│   └── style.css
├── js/
│   ├── products.js
│   ├── app.js
│   ├── auth.js
│   ├── dashboard.js
│   └── chatbot.js
├── assets/
│   └── images/
├── database/
│   └── db.json
└── docs/
    ├── project-report.md
    └── final-requirements-status.md
```

## How to Run

Open the project in VS Code, then run:

```bash
npm start
```

Open this in the browser:

```text
http://localhost:3000
```

## How to Update Products

Open:

```text
js/products.js
```

Update product name, category, price, image, description, badge, and featured status.

## How to Replace WhatsApp Number

Search for:

```text
919999999999
```

Replace it with the real Xayliciouss WhatsApp number.

## How to Connect Instagram Later

Currently, the Instagram option is kept as a safe placeholder because the official account is not confirmed. After the official account is ready, replace the placeholder links and feed content with the verified official Instagram source.

## How to Replace Images

Replace files inside:

```text
assets/images/
```

Keep the same file names or update the image paths in `index.html` and `js/products.js`.

## Functional Requirement Status

| Requirement | Status |
|---|---|
| Mobile Responsive Design | Included |
| Product Management | Included |
| WhatsApp Ordering Integration | Included |
| Instagram Integration | Included as feed display placeholder |
| Contact Forms | Included |
| SEO Optimization | Included |
| Fast Loading Speed | Included with lazy images and optimized structure |
| Secure Hosting Setup | Included through security headers/configuration |
| Google Maps Integration | Included with location preview |

## Future Scope

- Real online payment gateway
- Real customer login authentication
- Admin dashboard
- Order tracking automation
- Official Instagram API/feed connection
- Production database
- Delivery partner integration
### Chatbot Update

The website includes an upgraded premium glass AI chatbot widget with quick replies, FAQ suggestions, product cards, add-to-cart support, chat history, voice input support where browser-compatible, and Gemini-ready server fallback through `/api/chatbot`.



## Signed-in Checkout Protection

Customers must sign in before placing an order through WhatsApp checkout. This keeps order history, tracking details, and bonus points connected to the customer dashboard.


## Browser Tab Icon / Favicon

The website uses the Xayliciouss logo as the browser tab icon. Favicon files are stored in `assets/icons/` and linked in all HTML pages.


## Latest Fixes

- Account sign-in now uses same-origin backend URLs on deployed hosting and local backend URLs during VS Code Live Server testing.
- Created accounts are mirrored in browser storage for prototype fallback, so users can log out and sign in again during demos.
- Mobile chatbot includes a visible Back button inside the chat window.
