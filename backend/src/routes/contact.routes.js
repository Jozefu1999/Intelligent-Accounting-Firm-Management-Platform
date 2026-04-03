const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { submitContactMessage } = require('../controllers/contact.controller');

router.use(authMiddleware);

router.post('/', submitContactMessage);

module.exports = router;
