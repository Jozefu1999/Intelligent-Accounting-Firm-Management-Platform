const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/clients.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

const validateCreateClient = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('contact_person').trim().notEmpty().withMessage('Name is required.'),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('company_name').trim().notEmpty().withMessage('Company name is required.'),
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Email format is invalid.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('assigned_expert_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Assigned user id must be a positive integer.'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: errors.array(),
    });
  }

  next();
};

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin', 'expert', 'assistant'), validateCreateClient, handleValidationErrors, create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
