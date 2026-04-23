//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\config\stripe.js
const Stripe = require("stripe");
module.exports = new Stripe(process.env.STRIPE_SECRET_KEY);