const Stripe = require('stripe');
let stripe;
function getStripe(){if(!stripe){if(!process.env.STRIPE_SECRET_KEY)throw new Error('STRIPE_SECRET_KEY is not configured');stripe=new Stripe(process.env.STRIPE_SECRET_KEY);}return stripe;}
async function createCheckoutSession({orderId,amountMinor,currency,successUrl,cancelUrl,customerEmail}){if(!Number.isInteger(amountMinor)||amountMinor<=0)throw new Error('Invalid payment amount');return getStripe().checkout.sessions.create({mode:'payment',customer_email:customerEmail||undefined,line_items:[{price_data:{currency:currency.toLowerCase(),product_data:{name:`TeslaMarketplace Order ${orderId}`},unit_amount:amountMinor},quantity:1}],metadata:{order_id:String(orderId)},success_url:successUrl,cancel_url:cancelUrl});}
function constructWebhookEvent(rawBody,signature){return getStripe().webhooks.constructEvent(rawBody,signature,process.env.STRIPE_WEBHOOK_SECRET);}
module.exports={createCheckoutSession,constructWebhookEvent};
