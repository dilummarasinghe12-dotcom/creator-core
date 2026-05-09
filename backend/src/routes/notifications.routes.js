const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/notifications.controller');

router.get('/', authenticate, ctrl.list);
router.get('/unread-count', authenticate, ctrl.unreadCount);
router.patch('/:id/read', authenticate, ctrl.markRead);
router.post('/mark-all-read', authenticate, ctrl.markAllRead);

module.exports = router;
