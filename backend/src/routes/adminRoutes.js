const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const {
	getStats,
	getActivity,
	getUsers,
	getUserDetails,
	updateUserRole,
	deleteUser,
} = require('../controllers/admin.controller');

router.use(authMiddleware);
router.use(authorize('administrateur'));

router.get('/stats', getStats);
router.get('/activity', getActivity);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
