const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento' },
    accion: { type: String, required: true },
    detalle: String,
    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Actividad', actividadSchema);
