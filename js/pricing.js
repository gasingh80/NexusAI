document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('billing-switch');
    const amounts = document.querySelectorAll('.amount[data-monthly]');

    toggle.addEventListener('change', (e) => {
        const isAnnual = e.target.checked;
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
});
