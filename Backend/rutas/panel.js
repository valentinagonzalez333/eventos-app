const express = require('express');
const router = express.Router();
const panelController = require('../controladores/panelController'); 
const autenticar = require('../middlewares/auth');

router.get('/resumen', autenticar, panelController.resumen);

module.exports = router;