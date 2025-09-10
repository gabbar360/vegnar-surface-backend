/**
 * order controller
 */

import { factories } from '@strapi/strapi';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  // Create Razorpay Order
  async createOrder(ctx) {
    try {
      console.log('Request body:', ctx.request.body);
      console.log('Razorpay keys:', {
        key_id: process.env.RAZORPAY_KEY_ID ? 'Present' : 'Missing',
        key_secret: process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing'
      });

      const { amount, currency = 'INR', full_name, email, phone_number, company, shipping_address, additional_message, number_of_samples, products } = ctx.request.body;

      // For now, make phone_number and number_of_samples optional to match frontend
      if (!amount || !email || !full_name || !shipping_address) {
        return ctx.throw(400, 'Amount, email, full_name, and shipping_address are required');
      }

      // Debug: Check actual keys
      console.log('Actual Razorpay Keys:', {
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET?.substring(0, 5) + '...'
      });

      // Create Razorpay order
      console.log('Creating Razorpay order with:', { amount: amount * 100, currency });
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency,
        receipt: `order_${Date.now()}`,
      });

      console.log('Razorpay order created:', razorpayOrder.id);

      // Save order in Strapi
      const order = await strapi.entityService.create('api::order.order', {
        data: {
          amount,
          currency,
          razorpay_order_id: razorpayOrder.id,
          currentStatus: 'created',
          full_name,
          email,
          phone_number: phone_number || null,
          company: company || null,
          shipping_address,
          additional_message,
          number_of_samples: number_of_samples || 1,
          notes: products ? JSON.stringify(products) : null,
        },
      });

      ctx.body = {
        success: true,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        order: order,
      };
    } catch (error) {
      console.error('Razorpay Error Details:', {
        statusCode: error.statusCode,
        error: error.error,
        description: error.error?.description
      });
      
      ctx.body = {
        success: false,
        error: 'Razorpay API Error',
        details: error.error?.description || error.message,
        your_keys: {
          key_id: process.env.RAZORPAY_KEY_ID,
          key_format_valid: process.env.RAZORPAY_KEY_ID?.length > 10
        }
      };
    }
  },

  // Verify Payment
  async verifyPayment(ctx) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = ctx.request.body;

      console.log('Verify Payment Request:', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      console.log('Generated signature:', generated_signature);
      console.log('Received signature:', razorpay_signature);

      if (generated_signature === razorpay_signature) {
        // Update order status
        const orders = await strapi.entityService.findMany('api::order.order', {
          filters: { razorpay_order_id },
        });

        if (orders.length > 0) {
          await strapi.entityService.update('api::order.order', orders[0].id, {
            data: {
              razorpay_payment_id,
              razorpay_signature,
              currentStatus: ' paid',
            },
          });
        }

        ctx.body = { success: true, message: 'Payment verified successfully' };
      } else {
        ctx.body = {
          success: false,
          message: 'Invalid signature',
          debug: {
            generated: generated_signature,
            received: razorpay_signature,
            match: generated_signature === razorpay_signature,
            test_hint: 'Use generated signature for testing'
          }
        };
      }
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
        debug: 'Verify payment error'
      };
    }
  },
}));
