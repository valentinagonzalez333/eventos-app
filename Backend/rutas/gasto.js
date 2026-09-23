const express = require('express');
const router = express.Router();
const gastoController = require('../controladores/gastoController');
const autenticar = require('../middlewares/auth');

router.get('/evento/:eventoId', autenticar, gastoController.listarPorEvento);
router.post('/evento/:eventoId', autenticar, gastoController.crear);
router.put('/:id', autenticar, gastoController.editar);
router.delete('/:id', autenticar, gastoController.eliminar);

module.exports = router;