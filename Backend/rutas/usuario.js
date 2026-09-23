const express = require('express');
const router = express.Router();
const autenticar = require('../middlewares/auth');
const usuarioController = require('../controladores/usuarioController');

router.post('/registro', usuarioController.registrar);
router.post('/login', usuarioController.login);
router.post('/recuperar', usuarioController.solicitarRecuperacion);
router.post('/restablecer', usuarioController.restablecerContrasena);
router.get('/perfil', autenticar, usuarioController.obtenerPerfil);
router.put('/', autenticar, usuarioController.editar);

module.exports = router;