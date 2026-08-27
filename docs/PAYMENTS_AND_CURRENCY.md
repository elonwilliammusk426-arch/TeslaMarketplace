# Payments & Currency Policy

## Storefront currency
USD is the canonical storefront/accounting currency.

## Customer checkout
The checkout architecture supports:
- Credit/debit cards through Stripe
- Apple Pay and Google Pay where Stripe and the customer's country/device support them
- Other Stripe-supported local payment methods by destination/currency, subject to Stripe availability, merchant eligibility, and local rules

The platform should not promise "all banks" universally. Bank-transfer and local bank methods are enabled country-by-country based on Stripe's supported payment methods and the merchant's eligibility.

## Currency conversion
A customer may browse and, where supported, pay in a local currency. The order stores:
- Canonical USD amount
- Customer-presented currency
- Customer-presented amount
- Applied exchange-rate snapshot
- Payment-provider currency/amount
- Fees where applicable

Conversion is locked to the transaction/payment quote rather than recalculated after payment. FX movements after payment do not change the order amount.

## Destination handling
For international checkout, determine the destination/country first, then present eligible payment methods and currencies. Stripe remains responsible for payment-method availability, wallet eligibility, and payment processing rules.

## Escrow clarification
The application should not describe Stripe payments as "escrow" unless a separately contracted, legally compliant escrow service is implemented. A normal Stripe payment is payment processing, not a neutral escrow arrangement.

## Security
Never store raw card numbers, CVV, or wallet credentials. Use Stripe-hosted/Stripe.js payment surfaces and signed webhooks. Store provider IDs and payment status for reconciliation.
