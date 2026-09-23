const express = require('express');
const router = express.Router();
const proveedorController = require('../controladores/proveedorController');
const autenticar = require('../middlewares/auth');

router.get('/evento/:eventoId', autenticar, proveedorController.listarPorEvento);
router.post('/evento/:eventoId', autenticar, proveedorController.crear);
router.put('/:id', autenticar, proveedorController.editar);
router.delete('/:id', autenticar, proveedorController.eliminar);

module.exports = router;