const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CARPETA_UPLOADS } = require('../controladores/imagenes');

fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const EXTENSIONES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
    filename: (req, file, cb) => {
        const unico = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `evento-${unico}${EXTENSIONES[file.mimetype]}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (EXTENSIONES[file.mimetype]) return cb(null, true);
        const error = new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF');
        error.codigo = 'TIPO_NO_PERMITIDO';
        cb(error);
    }
});

module.exports = upload;