/* ======= SHARED COMPONENTS (Navbar + Footer) ======= */

function renderNavbar() {
  // Check if user is logged in
  const savedUser = localStorage.getItem('kombat_user');
  let user = null;
  try { if (savedUser) user = JSON.parse(savedUser); } catch(e) {}

  const authSection = user ? `
    <div class="user-menu">
      <button class="user-menu-btn" id="user-menu-btn" onclick="toggleUserMenu()">
        <img src="${user.picture}" alt="${user.name}" class="user-avatar" referrerpolicy="no-referrer" />
        <span class="user-name hide-mobile">${user.name.split(' ')[0]}</span>
        <span class="dropdown-arrow">▾</span>
      </button>
      <div class="user-dropdown hidden" id="user-dropdown">
        <div class="user-dropdown-header">
          <img src="${user.picture}" alt="${user.name}" class="user-avatar-lg" referrerpolicy="no-referrer" />
          <div>
            <div class="user-dropdown-name">${user.name}</div>
            <div class="user-dropdown-email">${user.email}</div>
          </div>
        </div>
        <div class="user-dropdown-divider"></div>
        <a href="settings.html" class="user-dropdown-item">⚙️ Settings</a>
        <a href="dashboard.html" class="user-dropdown-item">📊 Dashboard</a>
        <div class="user-dropdown-divider"></div>
        <button class="user-dropdown-item user-dropdown-logout" onclick="KombatAuth.logout()">🚪 Sign Out</button>
      </div>
    </div>
  ` : `
    <div id="google-signin-btn" class="google-signin-container"></div>
    <a href="#" class="btn btn-primary btn-sm hide-mobile" onclick="scrollToSignIn(event)">Get Started Free</a>
  `;

  return `
  <nav class="navbar" id="navbar">
    <div class="container">
      <a href="/" class="nav-logo">
        <span class="logo-icon">✦</span>
        <span>Kombat AI</span>
      </a>
      <div class="nav-links hide-mobile">
        <a href="chat.html">Chat</a>
        <a href="battle.html">Battle Mode</a>
        <a href="dashboard.html">Dashboard</a>
        <a href="pricing.html">Pricing</a>
      </div>
      <div class="nav-actions">
        ${authSection}
        <div class="hamburger hide-desktop" id="hamburger" onclick="toggleMobileMenu()">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <a href="chat.html">Chat</a>
      <a href="battle.html">Battle Mode</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="pricing.html">Pricing</a>
      <a href="settings.html">Settings</a>
      ${user ? `<button class="mobile-logout-btn" onclick="KombatAuth.logout()">Sign Out</button>` : ''}
    </div>
  </nav>`;
}

function renderFooter() {
  return `
  <footer class="footer">
    <div class="footer-gradient-line"></div>
    <div class="footer-container">
      <div class="footer-top">
        <div class="footer-brand">
          <a href="/" class="footer-logo">
            <span class="logo-icon">✦</span>
            <span>Kombat AI</span>
          </a>
          <p class="footer-tagline">One Platform. Every AI Model. Streamline your AI workflow with smart routing.</p>
        </div>
        <div class="footer-links-grid">
          <div class="footer-column">
            <h4>Product</h4>
            <a href="chat.html">Chat</a>
            <a href="battle.html">Battle Mode</a>
            <a href="dashboard.html">Dashboard</a>
            <a href="pricing.html">Pricing</a>
          </div>
          <div class="footer-column">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
          </div>
          <div class="footer-column">
            <h4>Legal</h4>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
          <div class="footer-column">
            <h4>Connect</h4>
            <div class="social-links">
              <a href="#" title="Twitter">𝕏</a>
              <a href="#" title="GitHub">⌘</a>
              <a href="#" title="Discord">⊡</a>
              <a href="#" title="LinkedIn">in</a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Kombat AI. All rights reserved.</p>
        <p class="made-in">Made in India 🇮🇳</p>
      </div>
    </div>
  </footer>`;
}

/* Navbar scroll effect */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) menu.classList.toggle('active');
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

// Close user dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('user-dropdown');
  const btn = document.getElementById('user-menu-btn');
  if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

function scrollToSignIn(e) {
  e.preventDefault();
  const btn = document.getElementById('google-signin-btn');
  if (btn) btn.scrollIntoView({ behavior: 'smooth' });
}

/* Inject Navbar + Footer into page */
function initComponents() {
  const navSlot = document.getElementById('navbar-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (navSlot) navSlot.innerHTML = renderNavbar();
  if (footerSlot) footerSlot.innerHTML = renderFooter();
  initNavbar();

  // Re-render Google button after navbar is injected
  setTimeout(() => {
    if (typeof KombatAuth !== 'undefined') {
      KombatAuth.renderGoogleButton();
    }
  }, 500);
}

document.addEventListener('DOMContentLoaded', initComponents);
