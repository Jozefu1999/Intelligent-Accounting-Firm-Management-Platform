const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/stats', getStats);

module.exports = router;
