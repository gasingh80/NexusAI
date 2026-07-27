const express = require('express');
const Stripe = require('stripe');

const router = express.Router();

// Initialize Stripe with secret key from environment variables
// This will work when deployed to Vercel with the STRIPE_SECRET_KEY env var
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_local_dev');

router.post('/', async (req, res) => {
  try {
    const { plan, interval } = req.body; // plan: 'pro' or 'team', interval: 'monthly' or 'annual'

    let priceAmount = 0;
    let productName = '';

    // Calculate price based on plan and interval (in INR)
    if (plan === 'pro') {
      productName = 'NexusAI Pro';
      priceAmount = interval === 'annual' ? 239 * 12 : 299;
    } else if (plan === 'team') {
      productName = 'NexusAI Team';
      priceAmount = interval === 'annual' ? 479 * 12 : 599;
    } else {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Determine the base URL for the success/cancel redirects
    const baseUrl = req.headers.origin || `http://${req.headers.host}`;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: productName,
              description: `Subscription to ${productName} (${interval})`,
            },
            unit_amount: priceAmount * 100, // Stripe expects amount in paise (cents)
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // using payment mode for simplicity (could be 'subscription' if we had recurring setup)
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing.html?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;
