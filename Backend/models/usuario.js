const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    user:{type: String, required: true, unique:true},
    correo:{type: String, required: true, unique: true},
    pass:{type: String, required: true},
    rol:{type: String, required: true},
    createdAt:{type: Date, default: Date.now},
    resetTokenHash: { type: String, default: null, select: false },
    resetExpira: { type: Date, default: null, select: false }
});

module.exports = mongoose.model('Usuario', usuarioSchema); // Exporta el modelo 'Usuario' con el esquema definido
//modelo: se necesita para crear, leer, actualizar y eliminar documentos en la colección de usuarios en la base de datos.