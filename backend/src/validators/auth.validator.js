const { body, validationResult } = require('express-validator');

exports.loginRules = [
  body('username').isString().notEmpty().withMessage('username es requerido'),
  body('password').isString().notEmpty().withMessage('password es requerido'),
];

exports.registerRules = [
  body('username')
    .isString().notEmpty().isLength({ min: 3, max: 50 })
    .withMessage('username: 3-50 caracteres'),
  body('email')
    .isEmail().withMessage('email inválido'),
  body('password')
    .isLength({ min: 6 }).withMessage('password: mínimo 6 caracteres'),
];

exports.handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};