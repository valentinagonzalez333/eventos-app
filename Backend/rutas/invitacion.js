const express = require('express');
const router = express.Router();
const invitadoController = require('../controladores/invitacionController');
const autenticar = require('../middlewares/auth');

router.get('/evento/:eventoId', autenticar, invitadoController.listarPorEvento);
router.post('/evento/:eventoId', autenticar, invitadoController.crear);
router.put('/:id', autenticar, invitadoController.editar);
router.delete('/:id', autenticar, invitadoController.eliminar);

module.exports = router;