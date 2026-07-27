document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('billing-switch');
    const amounts = document.querySelectorAll('.amount[data-monthly]');
    let isAnnual = false;

    toggle.addEventListener('change', (e) => {
        isAnnual = e.target.checked;
        amounts.forEach(amount => {
            const monthlyPrice = amount.getAttribute('data-monthly');
            const annualPrice = amount.getAttribute('data-annual');
            
            // simple animation
            amount.style.opacity = 0;
            setTimeout(() => {
                amount.textContent = isAnnual ? annualPrice : monthlyPrice;
                amount.style.opacity = 1;
            }, 200);
        });
    });

    // Checkout handler
    async function handleCheckout(plan) {
        try {
            const btn = document.getElementById(`btn-${plan}`);
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, interval: isAnnual ? 'annual' : 'monthly' })
            });
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe Checkout
            } else {
                alert('Checkout failed: ' + (data.error || 'Unknown error'));
                btn.textContent = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Could not initiate checkout. Please try again.');
        }
    }

    const btnPro = document.getElementById('btn-pro');
    const btnTeam = document.getElementById('btn-team');

    if (btnPro) btnPro.addEventListener('click', () => handleCheckout('pro'));
    if (btnTeam) btnTeam.addEventListener('click', () => handleCheckout('team'));
});
