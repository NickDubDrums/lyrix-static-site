// === Auth0 config ===
// Usa qui il TUO custom domain appena creato (es.: "auth.lyrix.app")
const AUTH0_DOMAIN = "dev-5k0si7uyk1eqj3k0.us.auth0.com";
const AUTH0_CLIENT_ID = "nNH76YBCpJG8UiFlSxgdcK0yvKfIg1IW";

// === Stato globale ===
window.auth0Client = null;

// Toggle UI in base allo stato (usato dall'header con [data-auth])
function renderAuthUI(isAuthed) {
  const show = (sel, yes) =>
    document.querySelectorAll(sel).forEach(el => el.style.display = yes ? "" : "none");
  show('[data-auth="signed-in"]', !!isAuthed);
  show('[data-auth="signed-out"]', !isAuthed);
}

async function initAuth() {
  // Crea client con custom domain
  window.auth0Client = await auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin + "/account.html",
      scope: "openid profile email"
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true
  });

  // Gestisci callback al ritorno da Auth0
  if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
    try {
      const { appState } = await auth0Client.handleRedirectCallback();
      const target = appState?.returnTo || "/account.html";
      window.history.replaceState({}, document.title, target);
    } catch (e) {
      console.error("[Auth0] handleRedirectCallback error:", e);
    }
  }

  const isAuthed = await auth0Client.isAuthenticated().catch(() => false);
  renderAuthUI(isAuthed);

  // 🔔 notifica “auth pronta” (account.js si aggancia qui)
  document.dispatchEvent(new CustomEvent("auth:ready", { detail: { isAuthenticated: isAuthed } }));

  // Se i partials arrivano dopo, riallinea
  document.addEventListener("partials:loaded", async () => {
    const authed = await auth0Client.isAuthenticated().catch(() => false);
    renderAuthUI(authed);
  });
}

// funzioni globali usate dall'header (onclick)
async function login(returnTo = "/account.html", prompt) {
  if (!window.auth0Client) return;
  await auth0Client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: window.location.origin + "/account.html",
      prompt: prompt || undefined
    },
    appState: { returnTo }
  });
}

async function logout() {
  if (!window.auth0Client) return;
  await auth0Client.logout({
    logoutParams: { returnTo: window.location.origin }
  });
  renderAuthUI(false);
}

window.login = login;
window.logout = logout;
window.renderAuthUI = renderAuthUI;

window.addEventListener("DOMContentLoaded", initAuth);
