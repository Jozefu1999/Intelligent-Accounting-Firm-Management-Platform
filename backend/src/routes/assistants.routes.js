const express = require('express');
const router = express.Router();
const { getMyAssistants, assignProject, unassignProject } = require('../controllers/assistants.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/platform', getMyAssistants);
router.post('/assign-project', assignProject);
router.post('/unassign-project', unassignProject);

module.exports = router;
