
const mongoose = require('mongoose');


const eventoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    fecha: { type: Date, required: true },
    lugar: { type: String },
    imagen: { type: String },
    presupuesto: { type: Number },
    estado: { type: String, enum: ['activo', 'finalizado', 'cancelado'], default: 'activo' },
    createAt: { type: Date, default: Date.now },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
});

eventoSchema.methods.estaVencido = function () {
    return this.fecha < new Date();
};

eventoSchema.methods.estaBloqueado = function () {
    return this.estado !== 'activo' || this.fecha < new Date();
};

module.exports = mongoose.model('Evento', eventoSchema);