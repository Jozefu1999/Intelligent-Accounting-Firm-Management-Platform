const express = require('express');
const router = express.Router();
const { getAll, getById, update, remove } = require('../controllers/users.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', authorize('administrateur'), getAll);
router.get('/:id', getById);
router.put('/:id', authorize('administrateur'), update);
router.delete('/:id', authorize('administrateur'), remove);

module.exports = router;
