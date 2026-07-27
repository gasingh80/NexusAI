document.addEventListener('DOMContentLoaded', async () => {
    // Fetch real usage data
    try {
        const res = await fetch('/api/usage');
        if (res.ok) {
            const data = await res.json();
            updateDashboard(data);
        }
    } catch (e) {
        console.error('Failed to load usage data:', e);
    }
    
    // Fallback animation if needed
    setTimeout(() => {
        const bars = document.querySelectorAll('.bar');
        bars.forEach(bar => {
            const target = bar.getAttribute('data-target');
            if (target) {
                bar.style.width = `${target}%`;
            }
        });
    }, 100);
});

function updateDashboard(data) {
    if (!data.total) return;

    // 1. Stats Row
    const totalSpentEl = document.querySelector('.stat-card:nth-child(1) .stat-val');
    const queriesEl = document.querySelector('.stat-card:nth-child(2) .stat-val');
    const avgCostEl = document.querySelector('.stat-card:nth-child(3) .stat-val');
    const mostUsedEl = document.querySelector('.stat-card:nth-child(4) .stat-val');

    totalSpentEl.textContent = `$${data.total.total_cost.toFixed(4)}`;
    queriesEl.textContent = data.total.total_queries;
    
    if (data.total.total_queries > 0) {
        avgCostEl.textContent = `$${(data.total.total_cost / data.total.total_queries).toFixed(4)}`;
    } else {
        avgCostEl.textContent = '$0.0000';
    }

    if (data.byModel && data.byModel.length > 0) {
        const topModel = data.byModel[0];
        const modelData = MODEL_MAP[topModel.model] || { name: topModel.model, icon: '🤖' };
        mostUsedEl.innerHTML = `${modelData.icon} ${modelData.name}`;
    } else {
        mostUsedEl.textContent = 'None';
    }

    // Update Progress bar (hardcoded budget of $20 for now)
    const budget = 20;
    const progressEl = document.querySelector('.stat-progress-fill');
    const progressTextEl = document.querySelector('.stat-subtext');
    if (progressEl) {
        const pct = Math.min(100, (data.total.total_cost / budget) * 100);
        progressEl.style.width = `${pct}%`;
        if (progressTextEl) {
            progressTextEl.textContent = `${pct.toFixed(1)}% of $${budget} budget`;
        }
    }

    // 2. Spending by Model
    const breakdownList = document.querySelector('.breakdown-list');
    if (breakdownList && data.byModel.length > 0) {
        breakdownList.innerHTML = '';
        const maxCost = Math.max(...data.byModel.map(m => m.cost));
        
        data.byModel.forEach(m => {
            const modelData = MODEL_MAP[m.model] || { name: m.model, icon: '🤖', color: '#6366f1' };
            const pct = data.total.total_cost > 0 ? ((m.cost / data.total.total_cost) * 100).toFixed(1) : 0;
            const barWidth = maxCost > 0 ? (m.cost / maxCost) * 100 : 0;
            
            breakdownList.innerHTML += `
                <div class="breakdown-item">
                    <div class="bd-info">
                        <span class="bd-icon">${modelData.icon}</span>
                        <span class="bd-name">${modelData.name}</span>
                    </div>
                    <div class="bd-bar-container">
                        <div class="bar" style="background: ${modelData.color}; width: 0" data-target="${barWidth}"></div>
                    </div>
                    <div class="bd-stats">
                        <span class="bd-cost">$${m.cost.toFixed(4)}</span>
                        <span class="bd-pct">${pct}%</span>
                    </div>
                </div>
            `;
        });
        
        // Trigger animations for new bars
        setTimeout(() => {
            document.querySelectorAll('.breakdown-list .bar').forEach(bar => {
                bar.style.width = `${bar.getAttribute('data-target')}%`;
            });
        }, 50);
    }
}
