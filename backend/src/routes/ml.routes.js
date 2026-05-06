const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth.middleware');
const { getModelStatus, retrainModel } = require('../controllers/ml.controller');

router.use(authMiddleware);
router.use(authorize('administrateur'));

router.get('/status', getModelStatus);
router.post('/retrain', retrainModel);

module.exports = router;
