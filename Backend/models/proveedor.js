const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
    eventoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nombre: { type: String, required: true },
    servicio: String,
    contacto: String,
    createAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Proveedor', proveedorSchema);