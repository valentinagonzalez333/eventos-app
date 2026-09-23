
const MONTO_MAXIMO = 1e12; 
const MAX_ACOMPANANTES = 20;
const FECHA_MINIMA = new Date('2000-01-01T00:00:00Z');
const FECHA_MAXIMA = new Date('2100-12-31T23:59:59Z');
const UN_DIA = 24 * 60 * 60 * 1000;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_ID = /^[0-9a-fA-F]{24}$/;


function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}


function esTextoOAusente(valor) {
    return valor === undefined || valor === null || typeof valor === 'string';
}


function validarTexto(errores, valor, { etiqueta, max, obligatorio }) {
    if (!esTextoOAusente(valor)) {
        errores.push(`${etiqueta} no tiene un formato válido`);
        return '';
    }
    const limpio = texto(valor);
    if (obligatorio && !limpio) errores.push(obligatorio);
    else if (limpio.length > max) errores.push(`${etiqueta} no puede superar los ${max} caracteres`);
    return limpio;
}

function idValido(valor) {
    return typeof valor === 'string' && REGEX_ID.test(valor);
}

function esEmail(valor) {
    return typeof valor === 'string' && REGEX_EMAIL.test(valor);
}


function aFecha(valor) {
    if (!valor || (typeof valor !== 'string' && !(valor instanceof Date))) return null;
    const fecha = new Date(valor);
    return isNaN(fecha) ? null : fecha;
}


function mismoTexto(a, b) {
    return String(a).trim().localeCompare(String(b).trim(), 'es', { sensitivity: 'base' }) === 0;
}


function contactoValido(contacto) {
    if (REGEX_EMAIL.test(contacto)) return true;
    if (!/^[+\d\s().-]+$/.test(contacto)) return false;
    const digitos = contacto.replace(/\D/g, '').length;
    return digitos >= 7 && digitos <= 15;
}


function errorMonto(valor, { obligatorio = true, permitirCero = false, etiqueta = 'El monto' } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        return obligatorio ? `${etiqueta} es obligatorio` : null;
    }
    const n = typeof valor === 'number' ? valor : (typeof valor === 'string' ? Number(valor) : NaN);
    if (!Number.isFinite(n)) return `${etiqueta} debe ser un número`;
    if (!Number.isInteger(n)) return `${etiqueta} debe ser un número entero, sin decimales`;
    if (n < 0) return `${etiqueta} no puede ser negativo`;
    if (n === 0 && !permitirCero) return `${etiqueta} debe ser mayor a 0`;
    if (n > MONTO_MAXIMO) return `${etiqueta} no puede superar ${MONTO_MAXIMO.toLocaleString('es-CO')}`;
    return null;
}


function responderErrores(res, errores, estado = 400) {
    return res.status(estado).json({ mensaje: errores.join('. '), errores });
}

module.exports = {
    MONTO_MAXIMO,
    MAX_ACOMPANANTES,
    FECHA_MINIMA,
    FECHA_MAXIMA,
    UN_DIA,
    texto,
    esTextoOAusente,
    validarTexto,
    idValido,
    esEmail,
    aFecha,
    mismoTexto,
    contactoValido,
    errorMonto,
    responderErrores
};