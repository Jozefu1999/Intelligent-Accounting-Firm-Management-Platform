const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { submitContactMessage, getContactMessages } = require('../controllers/contact.controller');

router.use(authMiddleware);

router.get('/', getContactMessages);
router.post('/', submitContactMessage);

module.exports = router;
