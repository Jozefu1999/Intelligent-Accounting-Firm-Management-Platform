const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const { Document, Project } = require('../models');
const { normalizeRole } = require('../utils/roles');
const {
  resolveClientIdsForUser,
  getProjectIdsForClientIds,
  hasProjectAccessByClientIds,
} = require('../utils/client-scope');

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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

const getAll = async (req, res, next) => {
  try {
    const normalizedRole = normalizeRole(req.user.role);
    const requestedProjectId = req.query.project_id;
    let where;

    if (normalizedRole === 'visiteur') {
      const ownedClientIds = await resolveClientIdsForUser(req.user);

      if (!ownedClientIds.length) {
        return res.json([]);
      }

      if (requestedProjectId) {
        const parsedProjectId = parseNumericId(requestedProjectId);
        if (!parsedProjectId) {
          return res.status(400).json({ message: 'Invalid project_id query value.' });
        }

        const hasAccess = await hasProjectAccessByClientIds(parsedProjectId, ownedClientIds);
        if (!hasAccess) {
          return res.status(403).json({ message: 'Forbidden. You can only access your own documents.' });
        }

        where = { project_id: parsedProjectId };
      } else {
        const ownedProjectIds = await getProjectIdsForClientIds(ownedClientIds);

        where = {
          [Op.or]: [
            {
              client_id: {
                [Op.in]: ownedClientIds,
              },
            },
            {
              project_id: {
                [Op.in]: ownedProjectIds.length ? ownedProjectIds : [0],
              },
            },
          ],
        };
      }
    } else if (normalizedRole === 'assistant') {
      where = { uploaded_by: req.user.id };
    } else if (requestedProjectId) {
      const parsedProjectId = parseNumericId(requestedProjectId);
      if (!parsedProjectId) {
        return res.status(400).json({ message: 'Invalid project_id query value.' });
      }

      where = { project_id: parsedProjectId };
    }

    const documents = await Document.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
};

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
    const document = await Document.findByPk(req.params.id, {
      include: [{ model: Project, as: 'project', attributes: ['id', 'client_id'] }],
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const normalizedRole = normalizeRole(req.user.role);

    if (normalizedRole === 'assistant' && document.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. You can only access your own documents.' });
    }

    if (normalizedRole === 'visiteur') {
      const ownedClientIds = await resolveClientIdsForUser(req.user);

      const hasDirectClientAccess = document.client_id && ownedClientIds.includes(document.client_id);
      const hasProjectClientAccess = document.project?.client_id
        && ownedClientIds.includes(document.project.client_id);

      if (!hasDirectClientAccess && !hasProjectClientAccess) {
        return res.status(403).json({ message: 'Forbidden. You can only access your own documents.' });
      }
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

    const normalizedRole = normalizeRole(req.user.role);

    if (normalizedRole === 'visiteur') {
      return res.status(403).json({ message: 'Forbidden. Client role has read-only access to documents.' });
    }

    if (normalizedRole === 'assistant' && document.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden. You can only delete your own documents.' });
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

module.exports = { getAll, upload, uploadDocument, downloadDocument, remove };
