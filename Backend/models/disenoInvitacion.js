const mongoose = require('mongoose');

const disenoInvitacionSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true, unique: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },

    color: { type: String, default: '#5b2a86' },
    fotoPortada: { type: String },
    frase: { type: String },
    lugar: { type: String },
    fecha: { type: Date },
    momentos: [{ hora: String, descripcion: String }],

    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisenoInvitacion', disenoInvitacionSchema);