const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const { getUsers, updateUserRole, deleteUser } = require('../controllers/admin.controller');

router.use(authMiddleware);
router.use(authorize('administrateur'));

router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
