const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

function urlImagen(archivo) {
    return archivo ? archivo.path : null; 
}

function descartarImagen(archivo) {
    if (archivo && archivo.filename) {
        cloudinary.uploader.destroy(archivo.filename).catch(() => {});
    }
}

function extraerPublicId(url) {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
}

function borrarImagenPorUrl(url) {
    if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return;
    const publicId = extraerPublicId(url);
    if (publicId) cloudinary.uploader.destroy(publicId).catch(() => {});
}

module.exports = { urlImagen, descartarImagen, borrarImagenPorUrl };