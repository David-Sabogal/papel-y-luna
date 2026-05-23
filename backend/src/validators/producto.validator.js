const { validationResult } = require('express-validator');

// Sin reglas estrictas — validamos en el controller
exports.createRules = [];
exports.updateRules = [];

exports.handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};