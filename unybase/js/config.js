/* ============================================================
   UnyBase — CONFIG
   Single source of truth for plan pricing and checkout links.
   Edit the values in this file only; index.html and checkout.html
   both read from window.UNYBASE_CONFIG.
   ============================================================ */

window.UNYBASE_CONFIG = {
  /* ----------------------------------------------------------
   * CHECKOUT LINKS — System.io
   * Each link's own checkout page lets the customer pick monthly
   * or annual billing, so there's one URL per plan (not per
   * plan+cycle). Our own toggle above is just for previewing the
   * price before they get there.
   * -------------------------------------------------------- */
  checkoutUrls: {
    basic: "https://main-unywebs.systeme.io/d9fae112",
    premium: "https://main-unywebs.systeme.io/d9fae112-d0f105db",
  },

  /* ----------------------------------------------------------
   * PLANS — pricing + feature lists shown on the pricing
   * section and reused on the checkout page.
   * -------------------------------------------------------- */
  plans: {
    basic: {
      name: "Basic",
      for: "Best for: Single web apps and early-stage products.",
      monthly: 29.95,
      yearly: 299.95,
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
      monthly: 49.95,
      yearly: 499.95,
      features: [
        "Everything in Basic",
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
 * The checkout links above go live to System.io, but what happens
 * after a customer pays still needs to be connected:
 *
 *   1. A System.io (or Zapier watching System.io/Stripe) trigger
 *      fires when a purchase completes.
 *   2. That trigger sends a Resend transactional email confirming
 *      the plan and billing cycle purchased.
 *   3. The same trigger tags/adds the customer to the correct
 *      System.io list for their plan (Basic vs Premium).
 *
 * None of this logic lives in the static site — it belongs in
 * System.io's automation rules or a connected Zapier zap.
 * ============================================================ */
