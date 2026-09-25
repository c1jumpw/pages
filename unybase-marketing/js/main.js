/* ============================================================
   UnyBase marketing site — front-end behavior.
   Reads plan data from window.UNYBASE_CONFIG (see config.js).
   No build step, no dependencies.
   ============================================================ */

(function () {
  var CONFIG = window.UNYBASE_CONFIG;

  function money(n) {
    return "$" + Number(n).toFixed(2).replace(/\.00$/, "");
  }

  function monthlyEquivalent(yearly) {
    return (yearly / 12).toFixed(2);
  }

  /* ---------------- Landing page pricing toggle ---------------- */

  function initPricingSection() {
    var section = document.getElementById("pricing");
    if (!section) return;

    var toggle = section.querySelector(".billing-toggle");
    var buttons = toggle ? toggle.querySelectorAll("button") : [];
    var cards = section.querySelectorAll(".plan-card[data-plan]");
    var signupHrefs = {
      basic: CONFIG.appUrls.signupBasic,
      premium: CONFIG.appUrls.signupPremium,
    };

    function render(cycle) {
      buttons.forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.cycle === cycle);
      });

      cards.forEach(function (card) {
        var planKey = card.dataset.plan;
        var plan = CONFIG.plans[planKey];
        if (!plan) return;

        var amountEl = card.querySelector('[data-role="amount"]');
        var cycleEl = card.querySelector('[data-role="cycle"]');
        var noteEl = card.querySelector('[data-role="yearlynote"]');
        var chooseEl = card.querySelector('[data-role="choose"]');

        if (cycle === "yearly") {
          amountEl.textContent = money(monthlyEquivalent(plan.yearly));
          cycleEl.textContent = "/month";
          noteEl.textContent = money(plan.yearly) + " billed yearly";
        } else {
          amountEl.textContent = money(plan.monthly);
          cycleEl.textContent = "/month";
          noteEl.textContent = "";
        }

        if (chooseEl && signupHrefs[planKey]) {
          // Preserve cycle preference into the app so they land pre-filled.
          chooseEl.href = signupHrefs[planKey] + "&cycle=" + cycle;
        }
      });
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        render(b.dataset.cycle);
      });
    });

    render("monthly");
  }

  /* ---------------- Mobile nav toggle ---------------- */

  function initMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("mobile-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close on link tap inside mobile nav
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------- Scroll-reveal (progressive enhancement) ---------------- */

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPricingSection();
    initMobileNav();
    initReveal();
  });
})();
