const mongoose = require('mongoose');
const { CATEGORIAS } = require('../conf/categorias');

const tareaSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nombre: { type: String, required: true },
    descripcion: String,
    categoria: { type: String, enum: CATEGORIAS, required: true },
    fechaLimite: Date,
    prioridad: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
    estado: { type: String, enum: ['pendiente', 'en_progreso', 'completada'], default: 'pendiente' },
    monto: { type: Number, default: 0, min: 0 },
    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tarea', tareaSchema);