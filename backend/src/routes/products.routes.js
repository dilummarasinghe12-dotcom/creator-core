const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { upload } = require('../middleware/upload.middleware');
const ctrl = require('../controllers/products.controller');

const multiUpload = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]);

const handleUpload = (req, res, next) => {
  multiUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.get('/', authenticate, ctrl.list);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, requireAdmin, handleUpload, ctrl.create);
router.patch('/:id', authenticate, requireAdmin, handleUpload, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);
router.post('/:id/download', authenticate, ctrl.trackDownload);

module.exports = router;
