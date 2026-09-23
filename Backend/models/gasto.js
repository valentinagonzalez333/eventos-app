const mongoose = require('mongoose');
const { CATEGORIAS } = require('../conf/categorias');
const gastoSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
    categoria: { type: String, enum: CATEGORIAS, required: true },
    monto: { type: Number, required: true, min: [0.01, 'El monto debe ser mayor a 0'] },
    descripcion: String,
    proveedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proveedor' },
    tareaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tarea' },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gasto', gastoSchema);