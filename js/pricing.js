document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('billing-switch');
    const amounts = document.querySelectorAll('.amount');
    const currencySymbols = document.querySelectorAll('.currency');
    
    let isAnnual = false;
    let isUSD = false; // default to INR

    // 1. Detect location
    try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geoData = await geoRes.json();
        if (geoData.country_code !== 'IN') {
            isUSD = true;
        }
    } catch (err) {
        console.warn('Geo-location failed, defaulting to INR', err);
    }

    // 2. Update UI based on currency and interval
    function updatePricingUI() {
        const symbol = isUSD ? '$' : '₹';
        currencySymbols.forEach(el => el.textContent = symbol);

        amounts.forEach(amount => {
            let price = '0';
            if (amount.id === 'pro-amount' || amount.id === 'team-amount') {
                const prefix = isUSD ? 'data-usd-' : 'data-inr-';
                const suffix = isAnnual ? 'annual' : 'monthly';
                price = amount.getAttribute(prefix + suffix);
            }
            
            amount.style.opacity = 0;
            setTimeout(() => {
                amount.textContent = price;
                amount.style.opacity = 1;
            }, 200);
        });
    }

    // Initial render
    updatePricingUI();

    toggle.addEventListener('change', (e) => {
        isAnnual = e.target.checked;
        updatePricingUI();
    });

    // Checkout handler for Razorpay
    async function handleCheckout(plan) {
        try {
            const btn = document.getElementById(`btn-${plan}`);
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan, 
                    interval: isAnnual ? 'annual' : 'monthly',
                    currency: isUSD ? 'USD' : 'INR'
                })
            });
            const data = await response.json();
            
            if (data.orderId) {
                var options = {
                    "key": data.keyId,
                    "amount": data.amount,
                    "currency": data.currency,
                    "name": "Kombat AI",
                    "description": `Subscription to ${plan.toUpperCase()}`,
                    "order_id": data.orderId,
                    "handler": function (response){
                        // Redirect to success page
                        window.location.href = `success.html?payment_id=${response.razorpay_payment_id}&plan=${plan}`;
                    },
                    "theme": {
                        "color": "#6366f1"
                    }
                };
                var rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response){
                    alert("Payment Failed: " + response.error.description);
                });
                rzp.open();
            } else {
                alert('Checkout failed: ' + (data.error || 'Unknown error'));
            }
            
            btn.textContent = originalText;
            btn.disabled = false;

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
