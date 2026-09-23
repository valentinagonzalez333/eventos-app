

const express = require('express');
const router = express.Router();
const eventoController = require ('../controladores/eventoController');
const presupuestoController = require('../controladores/presupuestoController');
const autenticar = require ('../middlewares/auth');
const upload = require ('../middlewares/multer');

router.get('/', autenticar, eventoController.listar);
router.post('/', autenticar, upload.single('imagen'), eventoController.crear);
router.put('/:id', autenticar, upload.single('imagen'), eventoController.editar);
router.get('/:id', autenticar, eventoController.obtenerUno);
router.delete('/:id', autenticar,eventoController.eliminar);
router.get('/:id/presupuesto', autenticar, presupuestoController.resumen);

module.exports = router;
