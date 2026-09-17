/* ============================================================
   UnyBase — shared front-end behavior
   Reads plan data from window.UNYBASE_CONFIG (see config.js).
   No build step, no dependencies.
   ============================================================ */

(function () {
  var CONFIG = window.UNYBASE_CONFIG;

  function money(n) {
    return "$" + Number(n).toLocaleString("en-US");
  }

  function monthlyEquivalent(yearly) {
    return (yearly / 12).toFixed(2).replace(/\.00$/, "");
  }

  /* ---------------- Landing page pricing toggle ---------------- */

  function initPricingSection() {
    var section = document.getElementById("pricing");
    if (!section) return;

    var toggle = section.querySelector(".billing-toggle");
    var buttons = toggle ? toggle.querySelectorAll("button") : [];
    var cards = section.querySelectorAll(".plan-card[data-plan]");

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

        if (chooseEl) {
          chooseEl.href = "checkout.html?plan=" + planKey + "&cycle=" + cycle;
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

  /* ---------------- Checkout page ---------------- */

  function initCheckoutPage() {
    var root = document.querySelector("[data-checkout-root]");
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    var planKey = params.get("plan") in CONFIG.plans ? params.get("plan") : "standard";
    var cycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";

    var toggle = root.querySelector(".billing-toggle");
    var buttons = toggle ? toggle.querySelectorAll("button") : [];
    var nameEl = root.querySelector('[data-role="plan-name"]');
    var descEl = root.querySelector('[data-role="plan-desc"]');
    var amountEl = root.querySelector('[data-role="amount"]');
    var cycleEl = root.querySelector('[data-role="cycle"]');
    var completeBtn = root.querySelector('[data-role="complete-setup"]');
    var placeholderNote = root.querySelector('[data-role="placeholder-note"]');

    var urlKeyMap = {
      standard_monthly: "standardMonthly",
      standard_yearly: "standardYearly",
      premium_monthly: "premiumMonthly",
      premium_yearly: "premiumYearly",
    };

    function render() {
      var plan = CONFIG.plans[planKey];

      buttons.forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.cycle === cycle);
      });

      nameEl.textContent = plan.name;
      descEl.textContent = plan.for.replace(/^Best for:\s*/, "");

      if (cycle === "yearly") {
        amountEl.textContent = money(plan.yearly);
        cycleEl.textContent = "/year";
      } else {
        amountEl.textContent = money(plan.monthly);
        cycleEl.textContent = "/month";
      }

      var configKey = urlKeyMap[planKey + "_" + cycle];
      var checkoutUrl = CONFIG.checkoutUrls[configKey];

      if (checkoutUrl) {
        completeBtn.href = checkoutUrl;
        completeBtn.removeAttribute("aria-disabled");
        if (placeholderNote) placeholderNote.style.display = "none";
      } else {
        completeBtn.href = "#";
        completeBtn.setAttribute("aria-disabled", "true");
        if (placeholderNote) placeholderNote.style.display = "block";
      }

      var newParams = new URLSearchParams(window.location.search);
      newParams.set("plan", planKey);
      newParams.set("cycle", cycle);
      history.replaceState(null, "", "?" + newParams.toString());
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        cycle = b.dataset.cycle;
        render();
      });
    });

    completeBtn.addEventListener("click", function (e) {
      if (completeBtn.getAttribute("aria-disabled") === "true") {
        e.preventDefault();
      }
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPricingSection();
    initCheckoutPage();
  });
})();
