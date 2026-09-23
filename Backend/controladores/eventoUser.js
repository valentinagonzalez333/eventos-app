const Evento = require('../models/evento');


async function eventoDelUsuario(eventoId, usuarioId) {
    return Evento.findOne({ _id: eventoId, usuarioId });
}

module.exports = { eventoDelUsuario };