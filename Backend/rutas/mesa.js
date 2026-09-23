const express = require('express');
const router = express.Router();
const mesaController = require('../controladores/mesaController');
const autenticar = require('../middlewares/auth');

router.get('/evento/:eventoId', autenticar, mesaController.listarPorEvento);
router.post('/evento/:eventoId', autenticar, mesaController.crear);
router.put('/:id', autenticar, mesaController.editar);
router.delete('/:id', autenticar, mesaController.eliminar);
router.post('/:id/invitados', autenticar, mesaController.agregarInvitado);
router.delete('/:id/invitados/:invitadoId', autenticar, mesaController.quitarInvitado);

module.exports = router;