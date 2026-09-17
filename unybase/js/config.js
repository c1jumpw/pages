/* ============================================================
   UnyBase — CONFIG
   Single source of truth for plan pricing and checkout links.
   Edit the values in this file only; index.html and checkout.html
   both read from window.UNYBASE_CONFIG.
   ============================================================ */

window.UNYBASE_CONFIG = {
  /* ----------------------------------------------------------
   * CHECKOUT LINKS — REPLACE BEFORE LAUNCH
   * Drop in the four Stripe Payment Links (or System.io checkout
   * URLs) below, one per plan/billing-cycle combination.
   * Until replaced, the "Complete Setup" button is a disabled
   * placeholder and will not link anywhere.
   * -------------------------------------------------------- */
  checkoutUrls: {
    standardMonthly: null, // e.g. "https://buy.stripe.com/xxxxxxxxxxxx" -> CHECKOUT_URL_STANDARD_MONTHLY
    standardYearly: null, //   -> CHECKOUT_URL_STANDARD_YEARLY
    premiumMonthly: null, //   -> CHECKOUT_URL_PREMIUM_MONTHLY
    premiumYearly: null, //   -> CHECKOUT_URL_PREMIUM_YEARLY
  },

  /* ----------------------------------------------------------
   * PLANS — pricing + feature lists shown on the pricing
   * section and reused on the checkout page.
   * Yearly prices below assume a 2-months-free annual discount;
   * adjust to whatever the final pricing model is.
   * -------------------------------------------------------- */
  plans: {
    standard: {
      name: "Standard",
      for: "Best for: Single web apps and early-stage products.",
      monthly: 29,
      yearly: 290, // billed once per year ($24.17/mo equivalent)
      features: [
        "Managed database & authentication",
        "File storage",
        "Realtime updates & server-side functions",
        "Community and email support",
        "Monthly usage monitoring",
      ],
    },
    premium: {
      name: "Premium",
      for: "Best for: Growing products and teams running multiple apps.",
      monthly: 59,
      yearly: 590, // billed once per year ($49.17/mo equivalent)
      features: [
        "Everything in Standard",
        "Expanded resource limits",
        "Priority infrastructure support",
        "Proactive diagnostics on app performance",
        "Faster response times",
        "Priority access to new UnyBase features",
      ],
    },
  },
};

/* ============================================================
 * POST-PAYMENT AUTOMATION — NOT YET WIRED UP
 * Once a checkout link above is completed by a customer, the
 * following steps still need to be connected (out of scope for
 * this build pass):
 *
 *   1. Stripe webhook (or a Zapier trigger watching Stripe) fires
 *      on `checkout.session.completed`.
 *   2. That trigger sends a Resend transactional email
 *      confirming the plan and billing cycle purchased.
 *   3. The same trigger adds/updates the customer in the
 *      correct System.io list/tag for their plan.
 *
 * None of this logic lives in the static site — it belongs in a
 * webhook handler or a Zapier zap connected to the Stripe account.
 * ============================================================ */
