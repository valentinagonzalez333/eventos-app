const express = require('express');
const router = express.Router();
const tareaController = require('../controladores/tareaController');
const autenticar = require('../middlewares/auth');

router.get('/evento/:eventoId', autenticar, tareaController.listarPorEvento);
router.post('/evento/:eventoId', autenticar, tareaController.crear);
router.put('/:id', autenticar, tareaController.editar);
router.patch('/:id/estado', autenticar, tareaController.cambiarEstado);
router.delete('/:id', autenticar, tareaController.eliminar);

module.exports = router;