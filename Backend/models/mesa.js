const mongoose = require('mongoose');


const mesaSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nombre: { type: String, required: true, trim: true },
    capacidad: { type: Number, default: 8, min: [1, 'La mesa debe tener al menos 1 silla'] },
    descripcion: String,
    invitados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invitado' }],
    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mesa', mesaSchema);