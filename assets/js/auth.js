// === Auth0 config (metti i TUOI valori) ===
const AUTH0_DOMAIN = "dev-5k0si7uyk1eqj3k0.us.auth0.com";
const AUTH0_CLIENT_ID = "nNH76YBCpJG8UiFlSxgdcK0yvKfIg1IW";

// === Stato globale ===
let auth0Client;

// === Init ===
async function initAuth() {
  // Lo SDK deve essere già caricato via <script src="https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js">
  auth0Client = await auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      // Torna qui dopo il login
      redirect_uri: window.location.origin + "/account.html",
    },
    cacheLocation: "localstorage",
  });

  // Gestione callback (dopo redirect)
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    try {
      await auth0Client.handleRedirectCallback();
      // pulisci la querystring
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error("Auth callback error", e);
    }
  }

  await renderAuthUI();
}

// === Azioni ===
async function login(goTo = "/account.html", mode = "login") {
  await auth0Client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: window.location.origin + goTo,
      screen_hint: mode === "signup" ? "signup" : undefined,
    },
  });
}

async function logout() {
  await auth0Client.logout({
    logoutParams: { returnTo: window.location.origin + "/" },
  });
}

// === UI binding ===
async function renderAuthUI() {
  const isAuth = await auth0Client.isAuthenticated();
  document.querySelectorAll("[data-auth='signed-in']").forEach((el) => (el.style.display = isAuth ? "" : "none"));
  document.querySelectorAll("[data-auth='signed-out']").forEach((el) => (el.style.display = isAuth ? "none" : ""));

  // Se siamo su account.html e loggati, riempi dati
  if (location.pathname.endsWith("/account.html") && isAuth) {
    const user = await auth0Client.getUser();
    const name = user?.name || user?.email || "User";
    const email = user?.email || "";
    document.getElementById("acc-name")?.replaceChildren(document.createTextNode(name));
    document.getElementById("acc-email")?.replaceChildren(document.createTextNode(email));
  }
}

window.addEventListener("DOMContentLoaded", initAuth);
// Quando l'header è pronto, riallinea i bottoni in base allo stato reale
document.addEventListener("partials:loaded", () => {
  if (typeof renderAuthUI === "function") {
    renderAuthUI(); // forza il toggle di [data-auth]
  }
});

