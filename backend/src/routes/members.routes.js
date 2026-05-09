const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const ctrl = require('../controllers/members.controller');

router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, requireAdmin, ctrl.getOne);
router.post('/invite', authenticate, requireAdmin, ctrl.invite);
router.patch('/:id', authenticate, requireAdmin, ctrl.updateMember);
router.delete('/:id', authenticate, requireAdmin, ctrl.removeMember);
router.post('/:id/email', authenticate, requireAdmin, ctrl.emailMember);

module.exports = router;
