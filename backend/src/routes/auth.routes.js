const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { loginRules, registerRules, handleErrors } = require('../validators/auth.validator');
const authJwt = require('../middlewares/authJwt');

const router = Router();

router.post('/register', registerRules, handleErrors, ctrl.register);
router.post('/login',    loginRules,    handleErrors, ctrl.login);
router.get('/me',        authJwt,                     ctrl.me);

module.exports = router;