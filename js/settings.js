document.addEventListener('DOMContentLoaded', async () => {
    // ======= Preferences Section =======
    const defaultModelSelect = document.getElementById('default-model');
    const smartRouterToggle = document.getElementById('smart-router-toggle');
    const budgetInput = document.getElementById('budget-limit');
    const budgetAlertToggle = document.getElementById('budget-alert-toggle');

    // Load preferences from localStorage
    const prefs = JSON.parse(localStorage.getItem('kombat_prefs') || '{}');
    
    if (defaultModelSelect) {
        defaultModelSelect.value = prefs.defaultModel || 'auto';
        defaultModelSelect.addEventListener('change', () => {
            prefs.defaultModel = defaultModelSelect.value;
            localStorage.setItem('kombat_prefs', JSON.stringify(prefs));
        });
    }
    
    if (smartRouterToggle) {
        smartRouterToggle.checked = prefs.smartRouter !== false; // default true
        smartRouterToggle.addEventListener('change', () => {
            prefs.smartRouter = smartRouterToggle.checked;
            localStorage.setItem('kombat_prefs', JSON.stringify(prefs));
        });
    }
    
    if (budgetInput) {
        budgetInput.value = prefs.budget || 20;
        budgetInput.addEventListener('change', () => {
            prefs.budget = parseFloat(budgetInput.value) || 20;
            localStorage.setItem('kombat_prefs', JSON.stringify(prefs));
        });
    }
    
    if (budgetAlertToggle) {
        budgetAlertToggle.checked = prefs.budgetAlert !== false;
        budgetAlertToggle.addEventListener('change', () => {
            prefs.budgetAlert = budgetAlertToggle.checked;
            localStorage.setItem('kombat_prefs', JSON.stringify(prefs));
        });
    }

    // ======= Account Section =======
    const accountSection = document.getElementById('account-section');
    if (accountSection && typeof KombatAuth !== 'undefined') {
        const user = KombatAuth.getUser();
        if (user) {
            accountSection.innerHTML = `
                <div class="account-card">
                    <img src="${user.picture}" alt="${user.name}" class="account-avatar" referrerpolicy="no-referrer" />
                    <div class="account-info">
                        <h3>${user.name}</h3>
                        <p>${user.email}</p>
                        <span class="plan-badge">Free Plan</span>
                    </div>
                </div>
            `;
        } else {
            accountSection.innerHTML = `
                <div class="account-card">
                    <p style="color: var(--text-secondary);">You are not signed in.</p>
                    <div id="google-signin-btn" style="margin-top: 1rem;"></div>
                </div>
            `;
            setTimeout(() => KombatAuth.renderGoogleButton(), 500);
        }
    }

    // ======= Danger Zone =======
    const deleteDataBtn = document.getElementById('delete-all-data');
    const resetSettingsBtn = document.getElementById('reset-settings');

    if (deleteDataBtn) {
        deleteDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete all local data? This cannot be undone.')) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }

    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                localStorage.removeItem('kombat_prefs');
                window.location.reload();
            }
        });
    }
});
