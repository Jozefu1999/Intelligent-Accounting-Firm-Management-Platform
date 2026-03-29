const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/clients.controller');
const { authMiddleware, authorize } = require('../middleware/auth.middleware');

const validateCreateClient = [
	body('company_name').trim().notEmpty().withMessage('Company name is required.'),
	body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email format is invalid.'),
	body('risk_level').optional({ checkFalsy: true }).isIn(['low', 'medium', 'high']).withMessage('Risk level is invalid.'),
	body('status').optional({ checkFalsy: true }).isIn(['active', 'inactive', 'prospect']).withMessage('Status is invalid.'),
	body('annual_revenue').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Annual revenue must be a positive number.'),
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
