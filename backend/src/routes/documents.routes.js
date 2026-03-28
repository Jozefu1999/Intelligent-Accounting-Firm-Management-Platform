const express = require('express');
const router = express.Router();
const { upload, uploadDocument, downloadDocument, remove } = require('../controllers/documents.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', remove);

module.exports = router;
