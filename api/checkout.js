const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// Initialize Razorpay
// Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

router.post('/', async (req, res) => {
  try {
    const { plan, interval, currency } = req.body; // currency: 'INR' or 'USD'
    
    let priceAmount = 0;
    const isUSD = currency === 'USD';

    // Calculate price based on plan, interval, and currency
    if (plan === 'pro') {
      if (isUSD) {
        priceAmount = interval === 'annual' ? 7 * 12 : 9;
      } else {
        priceAmount = interval === 'annual' ? 159 * 12 : 199;
      }
    } else if (plan === 'team') {
      if (isUSD) {
        priceAmount = interval === 'annual' ? 15 * 12 : 19;
      } else {
        priceAmount = interval === 'annual' ? 399 * 12 : 499;
      }
    } else {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Razorpay expects amount in smallest currency unit (paise/cents)
    const amountInSubunits = priceAmount * 100;

    const options = {
      amount: amountInSubunits,
      currency: isUSD ? 'USD' : 'INR',
      receipt: `receipt_${crypto.randomBytes(10).toString('hex')}`,
      payment_capture: 1 // Auto capture
    };

    // Create Razorpay Order
    const order = await razorpay.orders.create(options);
    
    res.json({ 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key'
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create checkout order' });
  }
});

module.exports = router;
