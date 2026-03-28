const express = require('express');
const router = express.Router();
const { generateBusinessPlan, getRecommendations, predictRisk } = require('../controllers/ai.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/generate-business-plan', generateBusinessPlan);
router.post('/recommendations', getRecommendations);
router.post('/predict-risk', predictRisk);

module.exports = router;
