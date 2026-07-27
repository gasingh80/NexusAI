document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const modelSelectorBtn = document.getElementById('model-selector-btn');
    const modelDropdown = document.getElementById('model-dropdown');
    const dropdownList = document.getElementById('dropdown-list');
    const currentModelIcon = document.getElementById('current-model-icon');
    const currentModelName = document.getElementById('current-model-name');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesArea = document.getElementById('messages-area');

    // State
    let currentModelId = 'auto'; // Default to smart router

    // Initialize Sidebar Toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.classList.contains('collapsed') && 
            !sidebar.contains(e.target) && 
            e.target !== sidebarToggle) {
            sidebar.classList.add('collapsed');
        }
    });

    // Initialize Mobile Sidebar state
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
    }

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = this.value.trim() === '';
    });
    
    // Handle Enter key (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim() !== '') {
                sendMessage();
            }
        }
    });

    // Populate Model Dropdown
    function populateModelDropdown() {
        dropdownList.innerHTML = '';
        
        // Add Auto/Smart Router option first
        const autoOption = document.createElement('div');
        autoOption.className = 'dropdown-item auto-option';
        autoOption.dataset.id = 'auto';
        autoOption.innerHTML = `
            <span class="icon">🧠</span>
            <div class="item-details">
                <span class="item-name">Smart Router</span>
                <span class="item-meta">
                    <span>Kombat AI</span>
                    <span>•</span>
                    <span>Optimized</span>
                </span>
            </div>
        `;
        autoOption.addEventListener('click', () => selectModelOption('auto'));
        dropdownList.appendChild(autoOption);

        // Add other models
        MODELS.forEach(model => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.id = model.id;
            item.innerHTML = `
                <span class="icon">${model.icon}</span>
                <div class="item-details">
                    <span class="item-name">${model.name}</span>
                    <span class="item-meta">
                        <span>${model.provider}</span>
                        <span>•</span>
                        <span>${model.costInput}/1k</span>
                    </span>
                </div>
            `;
            item.addEventListener('click', () => selectModelOption(model.id));
            dropdownList.appendChild(item);
        });
    }

    // Handle Model Selection
    function selectModelOption(modelId) {
        currentModelId = modelId;
        
        if (modelId === 'auto') {
            currentModelIcon.textContent = '🧠';
            currentModelName.textContent = 'Smart Router';
            modelSelectorBtn.classList.add('auto-mode');
        } else {
            const model = MODEL_MAP[modelId];
            currentModelIcon.textContent = model.icon;
            currentModelName.textContent = model.name;
            modelSelectorBtn.classList.remove('auto-mode');
        }
        
        modelDropdown.classList.add('hidden');
    }

    // Toggle Dropdown
    modelSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        modelDropdown.classList.add('hidden');
    });
    
    // Prevent closing when clicking inside dropdown
    modelDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Send Message Logic
    sendBtn.addEventListener('click', () => {
        if (chatInput.value.trim() !== '') {
            sendMessage();
        }
    });

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Reset input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Add user message to UI
        appendUserMessage(text);
        
        // Remove welcome message if exists
        const welcome = document.querySelector('.welcome-msg');
        if (welcome) welcome.remove();

        if (currentModelId === 'auto') {
            handleSmartRouterFlow(text);
        } else {
            handleStandardFlow(text, MODEL_MAP[currentModelId]);
        }
    }

    function appendUserMessage(text) {
        const msgHtml = `
            <div class="message user-msg">
                <div class="msg-avatar">U</div>
                <div class="msg-content">
                    <p>${escapeHtml(text)}</p>
                </div>
            </div>
        `;
        messagesArea.insertAdjacentHTML('beforeend', msgHtml);
        scrollToBottom();
    }

    function handleSmartRouterFlow(text) {
        // 1. Analyze Task
        const taskInfo = classifyTask(text);
        const selectedModel = selectModel(taskInfo, MODELS);
        
        // 2. Create Assistant Message Container with Smart Router Card
        const msgId = 'msg-' + Date.now();
        const html = `
            <div class="message assistant-msg" id="${msgId}">
                <div class="msg-avatar" style="background: linear-gradient(135deg, #6366f1, #a855f7)">🧠</div>
                <div class="msg-content">
                    <div class="smart-router-card" id="sr-card-${msgId}">
                        <div class="sr-header">
                            <span class="sr-icon spinning">🧠</span>
                            <span class="sr-title">Smart Router Analyzing...</span>
                        </div>
                    </div>
                    <div class="msg-text-container hidden" id="text-container-${msgId}"></div>
                </div>
            </div>
        `;
        messagesArea.insertAdjacentHTML('beforeend', html);
        scrollToBottom();

        // 3. Update Card after 800ms
        setTimeout(() => {
            const card = document.getElementById(`sr-card-${msgId}`);
            card.innerHTML = `
                <div class="sr-header">
                    <span class="sr-icon">${selectedModel.icon}</span>
                    <span class="sr-title">Routed to ${selectedModel.name}</span>
                </div>
                <div class="sr-reasoning">Task identified as ${taskInfo.type}. ${selectedModel.name} provides optimal balance for this task.</div>
                <div class="sr-metrics">
                    <div class="sr-metric"><span class="sr-metric-label">Confidence:</span> <span class="sr-metric-val">94%</span></div>
                    <div class="sr-metric"><span class="sr-metric-label">Est. Cost:</span> <span class="sr-metric-val">$0.002</span></div>
                </div>
            `;
            scrollToBottom();

            // 4. Start streaming response after 1.5s
            setTimeout(() => {
                streamResponse(msgId, selectedModel);
            }, 1500);

        }, 800);
    }

    function handleStandardFlow(text, model) {
        const msgId = 'msg-' + Date.now();
        const html = `
            <div class="message assistant-msg" id="${msgId}">
                <div class="msg-avatar">${model.icon}</div>
                <div class="msg-content">
                    <div class="typing-indicator" id="typing-${msgId}">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                    <div class="msg-text-container hidden" id="text-container-${msgId}"></div>
                </div>
            </div>
        `;
        messagesArea.insertAdjacentHTML('beforeend', html);
        scrollToBottom();

        // Start streaming after 500ms
        setTimeout(() => {
            document.getElementById(`typing-${msgId}`).remove();
            streamResponse(msgId, model);
        }, 500);
    }

    function streamResponse(msgId, model) {
        const container = document.getElementById(`text-container-${msgId}`);
        container.classList.remove('hidden');
        
        // Try real backend API first
        tryRealAPI(msgId, model, container).catch(() => {
            // Fallback to simulated streaming
            simulateStream(msgId, model, container);
        });
    }

    async function tryRealAPI(msgId, model, container) {
        // Check if user is logged in
        if (typeof KombatAuth !== 'undefined' && !KombatAuth.isLoggedIn()) {
            throw new Error('Please sign in to chat');
        }

        const userMessages = document.querySelectorAll('.user-msg .msg-content p');
        const lastUserMsg = userMessages[userMessages.length - 1]?.textContent || '';

        const authHeaders = typeof KombatAuth !== 'undefined' ? KombatAuth.getAuthHeaders() : {};
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                message: lastUserMsg,
                model: currentModelId,
            }),
        });

        if (!response.ok) throw new Error('API failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';
        container.appendChild(cursor);

        const textSpan = document.createElement('span');
        container.insertBefore(textSpan, cursor);

        let fullText = '';
        let finalMeta = {};

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).split('\n');
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'token') {
                        fullText += data.content;
                        textSpan.innerHTML = escapeHtml(fullText);
                        if (fullText.length % 40 === 0) scrollToBottom();
                    } else if (data.type === 'router') {
                        // Update router card if present
                        const card = document.getElementById(`sr-card-${msgId}`);
                        if (card) {
                            const routerModel = MODEL_MAP[data.model] || model;
                            card.innerHTML = `
                                <div class="sr-header">
                                    <span class="sr-icon">${routerModel.icon}</span>
                                    <span class="sr-title">Routed to ${routerModel.name}</span>
                                </div>
                                <div class="sr-reasoning">Category: ${data.category}. Confidence: ${data.confidence}%</div>
                            `;
                        }
                    } else if (data.type === 'done') {
                        finalMeta = data;
                    } else if (data.type === 'error') {
                        throw new Error(data.message);
                    }
                } catch (e) { /* skip parse errors */ }
            }
        }

        cursor.remove();
        const cost = finalMeta.cost ? `$${finalMeta.cost.toFixed(5)}` : '$0.00';
        const tokens = (finalMeta.inputTokens || 0) + (finalMeta.outputTokens || 0);
        const footerHtml = `
            <div class="msg-footer">
                <span>Tokens: ${tokens}</span>
                <span>•</span>
                <span>Cost: ${cost}</span>
                <span>•</span>
                <span style="color: var(--success)">✓ Real API</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', footerHtml);
        scrollToBottom();
    }

    function simulateStream(msgId, model, container) {
        const fullResponse = SAMPLE_RESPONSES[model.id] || SAMPLE_RESPONSES['gpt-4o'];
        let currentIndex = 0;
        
        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';
        container.appendChild(cursor);

        const textSpan = document.createElement('span');
        container.insertBefore(textSpan, cursor);

        const interval = setInterval(() => {
            if (currentIndex < fullResponse.length) {
                textSpan.textContent += fullResponse.charAt(currentIndex);
                currentIndex++;
                if (currentIndex % 20 === 0) scrollToBottom();
            } else {
                clearInterval(interval);
                cursor.remove();
                
                const tokens = Math.floor(Math.random() * 200) + 50;
                const cost = (tokens * 0.00001).toFixed(5);
                
                const footerHtml = `
                    <div class="msg-footer">
                        <span>Tokens: ~${tokens}</span>
                        <span>•</span>
                        <span>Cost: ~$${cost}</span>
                        <span>•</span>
                        <span style="color: var(--warning)">⚡ Demo Mode</span>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', footerHtml);
                scrollToBottom();
            }
        }, 15);
    }

    function scrollToBottom() {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;")
             .replace(/\n/g, "<br>");
    }

    // Init
    populateModelDropdown();
});
