// ========== Kombat AI — Google Auth Module ==========
// Handles Google Sign-In, token storage, and auth state

const KombatAuth = (() => {
  let googleClientId = null;
  let currentUser = null;
  let onAuthChangeCallbacks = [];

  // Initialize: fetch client ID and restore session
  async function init() {
    try {
      const res = await fetch('/api/auth/config');
      const config = await res.json();
      googleClientId = config.googleClientId;
    } catch (e) {
      console.warn('Could not fetch auth config:', e);
    }

    // Restore session from localStorage
    const saved = localStorage.getItem('kombat_user');
    const token = localStorage.getItem('kombat_token');
    if (saved && token) {
      try {
        currentUser = JSON.parse(saved);
        // Verify the token is still valid
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: token }),
        });
        if (!res.ok) {
          // Token expired, clear session
          logout();
          return;
        }
      } catch {
        logout();
        return;
      }
    }

    notifyListeners();
    initGoogleButton();
  }

  // Load Google Identity Services and render button
  function initGoogleButton() {
    if (!googleClientId) return;

    // Load the Google script if not loaded
    if (!window.google?.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => renderGoogleButton();
      document.head.appendChild(script);
    } else {
      renderGoogleButton();
    }
  }

  function renderGoogleButton() {
    if (!window.google?.accounts || !googleClientId) return;

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleResponse,
      auto_select: false,
    });

    // Render into any element with id="google-signin-btn"
    const btnContainer = document.getElementById('google-signin-btn');
    if (btnContainer) {
      google.accounts.id.renderButton(btnContainer, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 250,
      });
    }
  }

  // Handle Google Sign-In response
  async function handleGoogleResponse(response) {
    const credential = response.credential;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!res.ok) {
        console.error('Auth verification failed');
        return;
      }

      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('kombat_user', JSON.stringify(currentUser));
      localStorage.setItem('kombat_token', credential);

      notifyListeners();

      // Reload the page to update UI
      window.location.reload();
    } catch (err) {
      console.error('Login error:', err);
    }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem('kombat_user');
    localStorage.removeItem('kombat_token');
    notifyListeners();
    window.location.reload();
  }

  function getUser() {
    return currentUser;
  }

  function getToken() {
    return localStorage.getItem('kombat_token');
  }

  function isLoggedIn() {
    return !!currentUser && !!getToken();
  }

  // Get auth headers for API calls
  function getAuthHeaders() {
    const token = getToken();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  }

  // Subscribe to auth state changes
  function onAuthChange(callback) {
    onAuthChangeCallbacks.push(callback);
  }

  function notifyListeners() {
    onAuthChangeCallbacks.forEach(cb => cb(currentUser));
  }

  return {
    init,
    getUser,
    getToken,
    isLoggedIn,
    getAuthHeaders,
    logout,
    onAuthChange,
    renderGoogleButton,
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  KombatAuth.init();
});
