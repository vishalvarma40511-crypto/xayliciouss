# Xayliciouss JSON File Database

This folder contains the prototype database file:

```text
db.json
```

The website writes data into this file only when the project is running through Node.js:

```bash
npm start
```

Open the website at:

```text
http://localhost:3000
```

## Stored Data

`db.json` stores:

- `users` — customers who create an account or use prototype Google sign-in
- `reports` — customer service messages, feedback, complaints, and support requests
- `orders` — WhatsApp checkout order records

## Important

Live Server cannot write data into `db.json`. For database testing, always use `npm start`.

## Customer Dashboard

Signed-in users can see their own orders at:

```text
http://localhost:3000/dashboard.html
```

Dashboard includes:

- Order tracking
- Order history
- Bonus points
- Total spent

## Prototype Only

This JSON database is useful for project demonstration. For production, replace it with a real backend database and secure authentication system.
