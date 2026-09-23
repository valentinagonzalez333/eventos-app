const mongoose = require('mongoose');

const invitadoSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },

    nombre: { type: String, required: true },
    email: { type: String },
    token: { type: String, required: true, unique: true }, 

    numeroAcompanantes: { type: Number, default: 0 }, 
    acompanantesConfirmados: [String], 

    estado: { type: String, enum: ['pendiente', 'confirmado', 'rechazado'], default: 'pendiente' },
    restriccionesAlimentarias: { type: String },
    observaciones: { type: String },

    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invitado', invitadoSchema);