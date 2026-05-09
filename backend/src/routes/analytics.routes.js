const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const ctrl = require('../controllers/analytics.controller');

router.get('/dashboard', authenticate, requireAdmin, ctrl.getDashboard);
router.get('/me', authenticate, ctrl.getMemberStats);

module.exports = router;
