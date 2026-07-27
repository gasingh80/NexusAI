document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('battle-prompt');
    const modelChipsContainer = document.getElementById('model-chips');
    const battleBtn = document.getElementById('battle-btn');
    const resultsSection = document.getElementById('results-section');
    const battleGrid = document.getElementById('battle-grid');
    const votingArea = document.getElementById('voting-area');
    const voteButtonsContainer = document.getElementById('vote-buttons');
    const voteThanks = document.getElementById('vote-thanks');

    // Default selected models
    let selectedModels = ['gpt-4o', 'claude-sonnet', 'gemini-pro'];

    // Render Model Chips
    function renderModelChips() {
        modelChipsContainer.innerHTML = '';
        MODELS.forEach(model => {
            const chip = document.createElement('div');
            chip.className = `model-chip ${selectedModels.includes(model.id) ? 'selected' : ''}`;
            chip.dataset.id = model.id;
            chip.innerHTML = `
                <span class="icon">${model.icon}</span>
                <span>${model.name}</span>
            `;
            
            chip.addEventListener('click', () => toggleModelSelection(model.id, chip));
            modelChipsContainer.appendChild(chip);
        });
    }

    function toggleModelSelection(modelId, chipElement) {
        if (selectedModels.includes(modelId)) {
            // Remove if not the last one
            if (selectedModels.length > 1) {
                selectedModels = selectedModels.filter(id => id !== modelId);
                chipElement.classList.remove('selected');
            }
        } else {
            // Add if less than 3
            if (selectedModels.length < 3) {
                selectedModels.push(modelId);
                chipElement.classList.add('selected');
            }
        }
    }

    // Input handling
    promptInput.addEventListener('input', () => {
        battleBtn.disabled = promptInput.value.trim() === '';
    });

    // Start Battle
    battleBtn.addEventListener('click', () => {
        const prompt = promptInput.value.trim();
        if (!prompt || selectedModels.length === 0) return;

        // Reset UI
        resultsSection.classList.remove('hidden');
        votingArea.classList.add('hidden');
        voteThanks.classList.add('hidden');
        voteButtonsContainer.innerHTML = '';
        battleGrid.innerHTML = '';
        
        // Disable inputs during battle
        promptInput.disabled = true;
        battleBtn.disabled = true;
        battleBtn.textContent = 'Battling...';

        startStreaming();
    });

    function startStreaming() {
        const prompt = promptInput.value.trim();
        let completedCount = 0;
        
        // Setup UI for all selected models
        selectedModels.forEach(modelId => {
            const model = MODEL_MAP[modelId];
            const colId = `col-${modelId}`;
            const colHtml = `
                <div class="battle-column" id="${colId}">
                    <div class="col-header">
                        <span class="col-icon">${model.icon}</span>
                        <span class="col-title">${model.name}</span>
                        <span class="col-provider">${model.provider}</span>
                    </div>
                    <div class="col-content" id="content-${modelId}">
                        <span class="streaming-cursor" id="cursor-${modelId}"></span>
                    </div>
                    <div class="col-footer">
                        <div class="metric-item">
                            <span>Speed</span>
                            <span class="metric-val" id="speed-${modelId}">--</span>
                        </div>
                        <div class="metric-item">
                            <span>Cost</span>
                            <span class="metric-val" id="cost-${modelId}">--</span>
                        </div>
                        <div class="metric-item">
                            <span>Tokens</span>
                            <span class="metric-val" id="tokens-${modelId}">--</span>
                        </div>
                    </div>
                </div>
            `;
            battleGrid.insertAdjacentHTML('beforeend', colHtml);
            
            const contentDiv = document.getElementById(`content-${modelId}`);
            const cursor = document.getElementById(`cursor-${modelId}`);
            const textSpan = document.createElement('span');
            textSpan.id = `text-${modelId}`;
            contentDiv.insertBefore(textSpan, cursor);
        });

        const startTime = Date.now();

        // Try API first
        const apiKeys = localStorage.getItem('nexus_api_keys') || '{}';
        fetch('/api/battle', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-keys': apiKeys
            },
            body: JSON.stringify({ prompt, models: selectedModels })
        }).then(async res => {
            if (!res.ok) throw new Error('API failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            
            const textContent = {};
            selectedModels.forEach(m => textContent[m] = '');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'token') {
                            const modelId = data.model;
                            textContent[modelId] += data.content;
                            document.getElementById(`text-${modelId}`).innerHTML = escapeHtml(textContent[modelId]).replace(/\\n/g, '<br>');
                            const contentDiv = document.getElementById(`content-${modelId}`);
                            contentDiv.scrollTop = contentDiv.scrollHeight;
                        } 
                        else if (data.type === 'model_done' || data.type === 'error') {
                            const modelId = data.model;
                            const cursor = document.getElementById(`cursor-${modelId}`);
                            if (cursor) cursor.remove();
                            
                            const endTime = Date.now();
                            const durationStr = ((endTime - startTime) / 1000).toFixed(1) + 's';
                            
                            document.getElementById(`speed-${modelId}`).textContent = durationStr;
                            if (data.type === 'model_done') {
                                document.getElementById(`tokens-${modelId}`).textContent = (data.inputTokens || 0) + (data.outputTokens || 0);
                                document.getElementById(`cost-${modelId}`).textContent = '$' + (data.cost || 0).toFixed(5);
                            } else {
                                document.getElementById(`text-${modelId}`).innerHTML += `<br><span style="color:var(--danger)">${data.message}</span>`;
                            }
                            
                            completedCount++;
                            if (completedCount === selectedModels.length) {
                                finishBattle();
                            }
                        }
                    } catch (e) { /* skip */ }
                }
            }
        }).catch(err => {
            console.warn('Falling back to simulation', err);
            // Fallback simulation
            selectedModels.forEach((modelId, index) => {
                const model = MODEL_MAP[modelId];
                const contentDiv = document.getElementById(`content-${modelId}`);
                const textSpan = document.getElementById(`text-${modelId}`);
                const cursor = document.getElementById(`cursor-${modelId}`);
                
                const speed = 25 + (index * 10) + (Math.random() * 5); 
                const responseText = SAMPLE_RESPONSES[modelId] || SAMPLE_RESPONSES['gpt-4o'];
                let charIndex = 0;
                
                const interval = setInterval(() => {
                    if (charIndex < responseText.length) {
                        textSpan.textContent += responseText.charAt(charIndex);
                        charIndex++;
                        contentDiv.scrollTop = contentDiv.scrollHeight;
                    } else {
                        clearInterval(interval);
                        if (cursor) cursor.remove();
                        
                        const endTime = Date.now();
                        const durationStr = ((endTime - startTime) / 1000).toFixed(1) + 's';
                        const tokens = Math.floor(responseText.length / 4);
                        const costStr = '$' + ((tokens / 1000) * parseFloat(model.costOutput.replace('$',''))).toFixed(4);
                        
                        document.getElementById(`speed-${modelId}`).textContent = durationStr;
                        document.getElementById(`tokens-${modelId}`).textContent = tokens;
                        document.getElementById(`cost-${modelId}`).textContent = costStr;
                        
                        completedCount++;
                        if (completedCount === selectedModels.length) finishBattle();
                    }
                }, speed);
            });
        });
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function finishBattle() {
        battleBtn.textContent = 'Battle Again';
        battleBtn.disabled = false;
        promptInput.disabled = false;
        
        // Setup voting
        setupVoting();
        votingArea.classList.remove('hidden');
        
        // Scroll to voting
        setTimeout(() => {
            votingArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 500);
    }

    function setupVoting() {
        voteButtonsContainer.innerHTML = '';
        
        selectedModels.forEach(modelId => {
            const model = MODEL_MAP[modelId];
            const btn = document.createElement('button');
            btn.className = 'vote-btn';
            btn.innerHTML = `<span class="icon">${model.icon}</span> ${model.name}`;
            btn.addEventListener('click', () => handleVote());
            voteButtonsContainer.appendChild(btn);
        });
        
        const tieBtn = document.createElement('button');
        tieBtn.className = 'vote-btn vote-btn-tie';
        tieBtn.innerHTML = `🤝 Tie`;
        tieBtn.addEventListener('click', () => handleVote());
        voteButtonsContainer.appendChild(tieBtn);
    }

    function handleVote() {
        voteButtonsContainer.style.opacity = '0.5';
        voteButtonsContainer.style.pointerEvents = 'none';
        voteThanks.classList.remove('hidden');
    }

    // Init
    renderModelChips();
});
