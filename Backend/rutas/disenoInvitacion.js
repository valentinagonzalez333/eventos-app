const express = require('express');
const router = express.Router();
const disenoController = require('../controladores/disenoInvitacionController');
const autenticar = require('../middlewares/auth');
const upload = require('../middlewares/multer'); 

router.get('/evento/:eventoId', autenticar, disenoController.obtener);
router.put('/evento/:eventoId', autenticar, upload.single('fotoPortada'), disenoController.guardar);

module.exports = router;