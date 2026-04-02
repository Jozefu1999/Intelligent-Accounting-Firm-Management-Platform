const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getAll, getById, create, update, remove } = require('../controllers/clients.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const normalizeEmailValue = (value) => {
	if (typeof value !== 'string') {
		return value;
	}

	const normalizedValue = value.trim().toLowerCase();
	const [localPart, ...domainParts] = normalizedValue.split('@');

	if (!localPart || domainParts.length === 0) {
		return normalizedValue;
	}

	const normalizedDomain = domainParts.join('@')
		.replace(/\.+/g, '.')
		.replace(/^\./, '')
		.replace(/\.$/, '');

	return `${localPart}@${normalizedDomain}`;
};

const createClientValidation = [
	body('company_name')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ min: 2, max: 255 })
		.withMessage('company_name must be between 2 and 255 characters.'),
	body('name')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ min: 2, max: 255 })
		.withMessage('name must be between 2 and 255 characters.'),
	body('contact_person')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ min: 2, max: 200 })
		.withMessage('contact_person must be between 2 and 200 characters.'),
	body('username')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ min: 2, max: 200 })
		.withMessage('username must be between 2 and 200 characters.'),
	body('phone')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ min: 8, max: 20 })
		.withMessage('phone must be between 8 and 20 characters.'),
	body('email')
		.optional({ values: 'falsy' })
		.customSanitizer(normalizeEmailValue)
		.isEmail()
		.withMessage('email must be a valid email address.'),
	body('mail')
		.optional({ values: 'falsy' })
		.customSanitizer(normalizeEmailValue)
		.isEmail()
		.withMessage('mail must be a valid email address.'),
	body('address')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('address must be at most 500 characters.'),
	body('adresse')
		.optional({ values: 'falsy' })
		.isString()
		.trim()
		.isLength({ max: 500 })
		.withMessage('adresse must be at most 500 characters.'),
	(req, res, next) => {
		const errors = validationResult(req);
		const normalizedName = req.body.company_name ?? req.body.name;
		const normalizedUsername = req.body.contact_person ?? req.body.username;

		if (!normalizedName || !String(normalizedName).trim()) {
			return res.status(400).json({ message: 'name is required.' });
		}

		if (!normalizedUsername || !String(normalizedUsername).trim()) {
			return res.status(400).json({ message: 'username is required.' });
		}

		if (!errors.isEmpty()) {
			return res.status(400).json({
				message: 'Validation failed.',
				errors: errors.array(),
			});
		}

		next();
	},
];

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', createClientValidation, create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
