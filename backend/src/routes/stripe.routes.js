const router = require('express').Router();
const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const ctrl = require('../controllers/stripe.controller');

// Webhook must use raw body — mounted before express.json() in app.js
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

router.post('/checkout', authenticate, ctrl.createCheckoutSession);
router.post('/portal', authenticate, ctrl.createPortalSession);
router.get('/invoices', authenticate, ctrl.getInvoices);
router.get('/mrr', authenticate, requireAdmin, ctrl.getMRR);
router.get('/transactions', authenticate, requireAdmin, ctrl.getTransactions);

module.exports = router;
