This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend setup

The API uses MongoDB at `mongodb://127.0.0.1:27017/forever_store` by default. Start the local MongoDB server, copy `.env.example` to `.env.local`, and set a long random `JWT_SECRET` before running the app.

Install dependencies with `npm install`, then load the starter catalog with `npm run seed`. The seed command can be run more than once without replacing existing product data.

Available endpoints:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/products` with optional `q`, `category`, `page`, and `limit`; product creation, updates, and soft deletion require an admin session
- `GET /api/cart`, `PUT /api/cart`, and `DELETE /api/cart` require a signed-in customer
- `GET /api/orders` and `POST /api/orders` require a signed-in customer; order creation validates and reserves inventory
- `POST /api/payments/razorpay/order` creates a Razorpay order, and `POST /api/payments/razorpay/verify` verifies its signature and captured status
- `POST /api/contact` stores a contact message

New accounts are customers. To grant an account product-management access, update its `role` to `admin` in the `users` collection. Orders remain pending until a captured Razorpay payment is verified.

For Razorpay testing, add your Test Mode `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local`; keep the secret server-side. The checkout currency defaults to `USD` and can be changed with `RAZORPAY_CURRENCY`. Configure automatic payment capture in Razorpay so verified payments reach the captured state. Use Razorpay's test instruments in the checkout; no real payment is taken in Test Mode.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
