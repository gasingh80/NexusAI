document.addEventListener('DOMContentLoaded', async () => {
    const providers = [
        { id: 'openai', name: 'OpenAI', icon: '✦', url: 'https://platform.openai.com' },
        { id: 'anthropic', name: 'Anthropic', icon: '◈', url: 'https://console.anthropic.com' },
        { id: 'google', name: 'Google', icon: '✨', url: 'https://aistudio.google.com' },
        { id: 'meta', name: 'Meta (Llama)', icon: '🦙', url: 'https://ai.meta.com' },
        { id: 'deepseek', name: 'DeepSeek', icon: '🧠', url: 'https://platform.deepseek.com' },
        { id: 'mistral', name: 'Mistral', icon: '🌪️', url: 'https://console.mistral.ai' }
    ];

    const list = document.getElementById('api-keys-list');

    // Load keys from Local Storage
    let savedKeys = {};
    try {
        const stored = localStorage.getItem('nexus_api_keys');
        if (stored) savedKeys = JSON.parse(stored);
    } catch (e) {
        console.error('Failed to parse local keys', e);
    }

    providers.forEach(p => {
        const savedKey = savedKeys[p.id] || '';
        const isConnected = !!savedKey; // We assume it's connected if we have a key locally

        const row = document.createElement('div');
        row.className = 'api-key-row';
        row.innerHTML = `
            <div class="provider-info">
                <span class="status-dot ${isConnected ? 'connected' : ''}" id="dot-${p.id}"></span>
                <span class="icon">${p.icon}</span>
                <span>${p.name}</span>
            </div>
            <div class="key-input-wrapper">
                <input type="password" class="input" id="input-${p.id}" value="${savedKey}" placeholder="sk-..." />
                <button class="toggle-pwd" data-target="input-${p.id}">👁</button>
            </div>
            <button class="btn btn-sm btn-outline verify-btn" data-id="${p.id}">Save & Verify</button>
            <div class="help-text">Get your key at <a href="${p.url}" target="_blank">${p.url}</a></div>
        `;
        list.appendChild(row);
    });

    // Toggle password visibility and save
    list.addEventListener('click', async (e) => {
        if (e.target.classList.contains('toggle-pwd')) {
            const inputId = e.target.getAttribute('data-target');
            const input = document.getElementById(inputId);
            if (input.type === 'password') {
                input.type = 'text';
                e.target.textContent = '🙈';
            } else {
                input.type = 'password';
                e.target.textContent = '👁';
            }
        }
        
        if (e.target.classList.contains('verify-btn')) {
            const id = e.target.getAttribute('data-id');
            const input = document.getElementById(`input-${id}`);
            const val = input.value.trim();
            const dot = document.getElementById(`dot-${id}`);
            
            e.target.textContent = 'Verifying...';
            e.target.disabled = true;

            if (val) {
                try {
                    // Verify key via backend (we pass the key explicitly)
                    const verifyRes = await fetch('/api/settings/verify-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: id, key: val })
                    });
                    
                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.valid) {
                        dot.classList.add('connected');
                        e.target.textContent = 'Verified ✓';
                        e.target.style.borderColor = 'var(--success)';
                        e.target.style.color = 'var(--success)';

                        // Save securely in Local Storage!
                        let keys = JSON.parse(localStorage.getItem('nexus_api_keys') || '{}');
                        keys[id] = val;
                        localStorage.setItem('nexus_api_keys', JSON.stringify(keys));
                    } else {
                        dot.classList.remove('connected');
                        e.target.textContent = 'Invalid Key';
                        e.target.style.borderColor = 'var(--danger)';
                        e.target.style.color = 'var(--danger)';
                        console.error(verifyData.error);
                    }
                    
                    setTimeout(() => {
                        e.target.textContent = 'Save & Verify';
                        e.target.style.borderColor = '';
                        e.target.style.color = '';
                        e.target.disabled = false;
                    }, 3000);

                } catch (err) {
                    console.error('Error verifying key:', err);
                    e.target.textContent = 'Error';
                    setTimeout(() => {
                        e.target.textContent = 'Save & Verify';
                        e.target.disabled = false;
                    }, 2000);
                }
            } else {
                // Delete key from Local Storage
                let keys = JSON.parse(localStorage.getItem('nexus_api_keys') || '{}');
                delete keys[id];
                localStorage.setItem('nexus_api_keys', JSON.stringify(keys));

                dot.classList.remove('connected');
                e.target.textContent = 'Removed';
                e.target.disabled = false;
                setTimeout(() => e.target.textContent = 'Save & Verify', 2000);
            }
        }
    });
});
