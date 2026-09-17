/* ============================================================
   UnyBase — shared front-end behavior
   Reads plan data from window.UNYBASE_CONFIG (see config.js).
   No build step, no dependencies.
   ============================================================ */

(function () {
  var CONFIG = window.UNYBASE_CONFIG;

  function money(n) {
    var num = Number(n);
    var hasCents = Math.round(num * 100) % 100 !== 0;
    return "$" + num.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  function monthlyEquivalent(yearly) {
    return yearly / 12;
  }

  function savingsPercent(plan) {
    var fullYear = plan.monthly * 12;
    var saved = fullYear - plan.yearly;
    return Math.round((saved / fullYear) * 100);
  }

  function yearlyNoteHTML(plan) {
    var pct = savingsPercent(plan);
    return (
      '<span class="was">' + money(plan.monthly) + "/mo</span>" +
      money(plan.yearly) + " billed yearly" +
      '<span class="save-badge">Save ' + pct + "%</span>"
    );
  }

  function yearlyNoteCompactHTML(plan) {
    var pct = savingsPercent(plan);
    return (
      '<span class="was">' + money(plan.monthly) + "/mo</span>" +
      '<span class="save-badge">Save ' + pct + "%</span>"
    );
  }

  /* ---------------- Scroll reveal ---------------- */

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Mobile nav toggle ---------------- */

  function initMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var panel = document.getElementById("mobile-nav");
    if (!toggle || !panel) return;

    function close() {
      toggle.setAttribute("aria-expanded", "false");
      panel.classList.remove("is-open");
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      panel.classList.toggle("is-open", !open);
    });

    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) close();
    });
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
          noteEl.innerHTML = yearlyNoteHTML(plan);
        } else {
          amountEl.textContent = money(plan.monthly);
          cycleEl.textContent = "/month";
          noteEl.innerHTML = "";
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
    var planKey = params.get("plan") in CONFIG.plans ? params.get("plan") : "basic";
    var cycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";

    var toggle = root.querySelector(".billing-toggle");
    var buttons = toggle ? toggle.querySelectorAll("button") : [];
    var nameEl = root.querySelector('[data-role="plan-name"]');
    var descEl = root.querySelector('[data-role="plan-desc"]');
    var amountEl = root.querySelector('[data-role="amount"]');
    var cycleEl = root.querySelector('[data-role="cycle"]');
    var noteEl = root.querySelector('[data-role="yearlynote"]');
    var completeBtn = root.querySelector('[data-role="complete-setup"]');
    var placeholderNote = root.querySelector('[data-role="placeholder-note"]');

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
        if (noteEl) noteEl.innerHTML = yearlyNoteCompactHTML(plan);
      } else {
        amountEl.textContent = money(plan.monthly);
        cycleEl.textContent = "/month";
        if (noteEl) noteEl.innerHTML = "";
      }

      var checkoutUrl = CONFIG.checkoutUrls[planKey];

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
    initReveal();
    initMobileNav();
    initPricingSection();
    initCheckoutPage();
  });
})();
