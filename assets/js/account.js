// account.js — tabs, profile form, newsletter, security, plan, dev bar
(function () {
  const PLAN_KEY = "lyrix_plan"; // "free" | "monthly" | "semiannual" | "annual" | "pro"
  const DEVBAR_KEY = "lyrix_devbar"; // "1" to force show dev bar in prod

  // ---------- Tabs ----------
  function setupTabs() {
    const buttons = Array.from(document.querySelectorAll(".account-tab-btn"));
    const tabs = Array.from(document.querySelectorAll(".tab"));
    function activate(tabId) {
      buttons.forEach(b => b.classList.toggle("is-active", b.dataset.tab === tabId));
      tabs.forEach(t => t.classList.toggle("is-active", t.id === `tab-${tabId}`));
      localStorage.setItem("account_active_tab", tabId);
    }
    buttons.forEach(b => b.addEventListener("click", () => activate(b.dataset.tab)));
    const saved = localStorage.getItem("account_active_tab");
    if (saved && document.getElementById(`tab-${saved}`)) activate(saved);
  }

  // ---------- Auth helpers ----------
  async function requireAuth() {
    if (!window.auth0Client) return null;
    const isAuth = await auth0Client.isAuthenticated();
    if (!isAuth) {
      login("/account.html", "login"); // from assets/js/auth.js
      return null;
    }
    return auth0Client.getUser();
  }

  // ---------- Hero greeting ----------
  function renderGreeting(user) {
    const el = document.getElementById("acc-hello-name");
    if (!el) return;
    const name = user?.name || user?.given_name || (user?.email ? user.email.split("@")[0] : "friend");
    el.textContent = name;
  }

// ===== Profile (serverless via Auth0 Action) =====
let initialProfile = {};

function setSaveEnabled(enabled) {
  const btnSave = document.getElementById("btn-profile-save");
  const btnReset = document.getElementById("btn-profile-reset");
  if (btnSave) btnSave.disabled = !enabled;
  if (btnReset) btnReset.disabled = !enabled;
}

function showToast(ok, msg) {
  const t = document.getElementById("profile-toast");
  if (!t) return;
  t.className = "toast " + (ok ? "is-ok" : "is-err");
  t.textContent = msg;
}

function readForm() {
  return {
    email: document.getElementById("pf-email")?.value?.trim() || "",
    nickname: document.getElementById("pf-username")?.value?.trim() || "",
    given_name: document.getElementById("pf-given")?.value?.trim() || "",
    family_name: document.getElementById("pf-family")?.value?.trim() || ""
  };
}

function fillForm(p) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  set("pf-email", p.email);
  set("pf-username", p.nickname);
  set("pf-given", p.given_name);
  set("pf-family", p.family_name);
}

function userToProfile(u) {
  const NS = "https://lyrix.app/claims";
  const email  = u?.[`${NS}/email`] || u?.email || "";
  const given  = u?.[`${NS}/given_name`] || u?.given_name || "";
  const family = u?.[`${NS}/family_name`] || u?.family_name || "";
  const nick   = u?.[`${NS}/nickname`] || u?.nickname || (email ? email.split("@")[0] : "user");
  return { sub: u?.sub || "", email, given_name: given, family_name: family, nickname: nick };
}

function diffProfile(a, b) {
  const diff = {};
  ["nickname","given_name","family_name"].forEach(k => {
    if ((a[k] || "") !== (b[k] || "")) diff[k] = b[k] || "";
  });
  return diff;
}

async function setupProfile() {
  if (!window.auth0Client) return;
  const isAuth = await auth0Client.isAuthenticated();
  if (!isAuth) { login("/account.html", "login"); return; }

  // Toast post-salvataggio (se torni con ?pf=ok)
  if (new URL(location.href).searchParams.get("pf") === "ok") {
    showToast(true, "Profile updated.");
    // pulisci il param
    const url = new URL(location.href); url.searchParams.delete("pf");
    window.history.replaceState({}, document.title, url.toString());
  }

  const user = await auth0Client.getUser();
  console.log("[auth] raw user:", user);
  console.log("[auth] mapped claims:", userToProfile(user));

  const claims = userToProfile(user);

  // Greeting
  const hello = document.getElementById("acc-hello-name");
  if (hello) hello.textContent = claims.nickname || claims.given_name || (claims.email?.split("@")[0] ?? "friend");

  // Prefill
  initialProfile = { ...claims };
  fillForm(initialProfile);
  setSaveEnabled(false);

  // Abilita Save solo se ci sono differenze
  document.getElementById("profile-form")?.addEventListener("input", () => {
    const changed = Object.keys(diffProfile(initialProfile, readForm())).length > 0;
    setSaveEnabled(changed);
  });

  // Reset
  document.getElementById("btn-profile-reset")?.addEventListener("click", (e) => {
    e.preventDefault();
    fillForm(initialProfile);
    setSaveEnabled(false);
  });

  // Save → re-login con query per l'Action (nessun server!)
  document.getElementById("btn-profile-save")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const current = readForm();
    const changes = diffProfile(initialProfile, current);
    if (!Object.keys(changes).length) return;

    // Mandiamo i nuovi valori come query all'authorize; l'Action li salva in user_metadata
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        // reindirizza qui dopo, col segnale pf=ok
        redirect_uri: window.location.origin + "/account.html",
        // parametri per la nostra Action
        pf_update: "1",
        pf_given:  changes.given_name  ?? "",
        pf_family: changes.family_name ?? "",
        pf_nick:   changes.nickname    ?? ""
      },
      appState: { returnTo: "/account.html?pf=ok" }
    });
  });
}

  // ---------- Plan area ----------
  function renderPlan() {
    const plan = (localStorage.getItem(PLAN_KEY) || "free").toLowerCase();
    const planNameMap = {
      free: "Free",
      monthly: "Pro — Monthly",
      semiannual: "Pro — 6 months",
      annual: "Pro — 12 months",
      pro: "Pro — Unlimited",
    };
    const metaMap = {
      free: "No active subscription",
      monthly: "Active subscription (monthly)",
      semiannual: "Active subscription (6 months)",
      annual: "Active subscription (12 months)",
      pro: "Active license (unlimited)",
    };
    const nameEl = document.getElementById("plan-name");
    const metaEl = document.getElementById("plan-meta");
    if (nameEl) nameEl.textContent = planNameMap[plan] || "Free";
    if (metaEl) metaEl.textContent = metaMap[plan] || metaMap.free;

    // Support box
    const supportBox = document.getElementById("support-box");
    if (supportBox) {
      if (plan === "free") {
        supportBox.innerHTML = `
          <div class="card subtle">
            <p><strong>Self-help & docs</strong></p>
            <p class="muted">Browse FAQ and guides. Priority support is reserved for active subscribers.</p>
            <div class="buttons">
              <a class="btn-secondary" href="faq.html">Open FAQ</a>
              <a class="btn" href="plans.html">Upgrade for priority support</a>
            </div>
          </div>
        `;
      } else {
        supportBox.innerHTML = `
          <div class="card subtle">
            <p><strong>Priority support</strong></p>
            <p class="muted">You're eligible for priority support. Include your Order/License email.</p>
            <div class="buttons">
              <a class="btn" href="mailto:support@lyrix.app?subject=Lyrix%20Support">Contact support</a>
              <a class="btn-secondary" href="faq.html">Open FAQ</a>
            </div>
          </div>
        `;
      }
    }
  }

  // ---------- Newsletter ----------
  function setupNewsletter() {
    const key = "lyrix_newsletter_optin";
    const el = document.getElementById("nl-optin");
    if (!el) return;
    const saved = localStorage.getItem(key);
    el.checked = saved ? saved === "1" : false;
    el.addEventListener("change", () => {
      localStorage.setItem(key, el.checked ? "1" : "0");
    });
  }

  // ---------- Security ----------
  function setupSecurity() {
    const btnReset = document.getElementById("btn-reset-password");
    if (btnReset) {
      btnReset.addEventListener("click", (e) => {
        e.preventDefault();
        login("/account.html", "login"); // reindirizzo a Universal Login -> "Forgot password?"
      });
    }
  }

  // ---------- Logout ----------
  function setupLogout() {
    const btn = document.getElementById("btn-logout");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout(); // from assets/js/auth.js
    });
  }

  // ---------- Dev test bar ----------
function setupDevBar() {
  const bar = document.getElementById("dev-testbar");
  if (!bar) return;

  const DEVBAR_KEY = "lyrix_devbar";
  const url = new URL(location.href);
  const qp = url.searchParams.get("dev"); // ?dev=1 per forzare ON

  if (qp === "1") localStorage.setItem(DEVBAR_KEY, "1");
  if (qp === "0") localStorage.setItem(DEVBAR_KEY, "0");

  const shouldShow =
    location.hostname === "localhost" ||
    localStorage.getItem(DEVBAR_KEY) === "1";

  bar.hidden = !shouldShow;

  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "d" || e.key === "D")) {
      bar.hidden = !bar.hidden;
      localStorage.setItem(DEVBAR_KEY, bar.hidden ? "0" : "1");
    }
  });

  bar.querySelectorAll("[data-plan]").forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan");
      localStorage.setItem("lyrix_plan", plan);
      renderPlan();
    });
  });

  document.getElementById("devbar-hide")?.addEventListener("click", () => {
    bar.hidden = true;
    localStorage.setItem(DEVBAR_KEY, "0");
  });
}

  document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    setupNewsletter();
    setupSecurity();
    setupLogout();
    renderPlan();
    setupDevBar();
    await setupProfile();
  });
})();

// Se Auth0 finisce di inizializzarsi dopo il DOM, riproviamo qui
document.addEventListener("auth:ready", async () => {
  try { await setupProfile(); } catch (e) { console.warn(e); }
});
