const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Document } = require('../models');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed.'));
    }
  },
});

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const document = await Document.create({
      client_id: req.body.client_id || null,
      project_id: req.body.project_id || null,
      name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      file_path: req.file.path,
      category: req.body.category || 'other',
      uploaded_by: req.user.id,
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const filePath = path.resolve(document.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk.' });
    }

    res.download(filePath, document.name);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const filePath = path.resolve(document.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.destroy();
    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadDocument, downloadDocument, remove };
