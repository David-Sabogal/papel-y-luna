const { validationResult } = require('express-validator');

exports.createRules = [];

exports.handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};