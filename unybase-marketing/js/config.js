/* ============================================================
   UnyBase marketing site — CONFIG
   Single source of truth for pricing and app links.
   Edit values here; index.html reads from window.UNYBASE_CONFIG.
   ============================================================ */

window.UNYBASE_CONFIG = {
  /* Where "Choose Plan" / "Get Started" buttons send visitors.
   * Checkout happens after account creation on the app side —
   * these are signup links, not System.io links. */
  appUrls: {
    signupBasic: "https://unybase.unywebs.com/signup?plan=basic",
    signupPremium: "https://unybase.unywebs.com/signup?plan=premium",
    login: "https://unybase.unywebs.com/login",
  },

  /* Plan pricing shown on the pricing section.
   * Yearly assumes 2 months free vs monthly. */
  plans: {
    basic: {
      name: "Basic",
      for: "Best for: Single web apps and early-stage products.",
      monthly: 29.95,
      yearly: 299.50, // ~$24.96/mo equivalent
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
      yearly: 499.50, // ~$41.63/mo equivalent
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
