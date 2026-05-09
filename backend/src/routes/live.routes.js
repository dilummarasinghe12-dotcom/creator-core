const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const ctrl = require('../controllers/live.controller');

router.get('/', authenticate, ctrl.list);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.patch('/:id', authenticate, requireAdmin, ctrl.update);
router.post('/:id/start', authenticate, requireAdmin, ctrl.startSession);
router.post('/:id/end', authenticate, requireAdmin, ctrl.endSession);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
