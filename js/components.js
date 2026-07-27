/* ======= SHARED COMPONENTS (Navbar + Footer) ======= */

function renderNavbar() {
  return `
  <nav class="navbar" id="navbar">
    <div class="container">
      <a href="index.html" class="nav-logo">
        <span class="logo-icon">✦</span>
        <span>NexusAI</span>
      </a>
      <div class="nav-links hide-mobile">
        <a href="chat.html">Chat</a>
        <a href="battle.html">Battle Mode</a>
        <a href="dashboard.html">Dashboard</a>
        <a href="pricing.html">Pricing</a>
      </div>
      <div class="nav-actions">
        <a href="settings.html" class="btn btn-outline btn-sm hide-mobile">Settings</a>
        <a href="chat.html" class="btn btn-primary btn-sm">Get Started Free</a>
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
          <a href="index.html" class="footer-logo">
            <span class="logo-icon">✦</span>
            <span>NexusAI</span>
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
        <p>&copy; ${new Date().getFullYear()} NexusAI. All rights reserved.</p>
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

/* Inject Navbar + Footer into page */
function initComponents() {
  const navSlot = document.getElementById('navbar-slot');
  const footerSlot = document.getElementById('footer-slot');
  if (navSlot) navSlot.innerHTML = renderNavbar();
  if (footerSlot) footerSlot.innerHTML = renderFooter();
  initNavbar();
}

document.addEventListener('DOMContentLoaded', initComponents);
