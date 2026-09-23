const express = require('express');
const router = express.Router();
const rsvpController = require('../controladores/rscontroller');


router.get('/:token', rsvpController.obtenerPorToken);
router.post('/:token', rsvpController.responder);

module.exports = router;