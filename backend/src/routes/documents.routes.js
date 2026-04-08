const express = require('express');
const router = express.Router();
const { getAll, upload, uploadDocument, downloadDocument, remove } = require('../controllers/documents.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', getAll);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/download/:id', downloadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', remove);

module.exports = router;
