const DisenoInvitacion = require('../models/disenoInvitacion');
const { eventoDelUsuario } = require('./eventoUser');
const { urlImagen, descartarImagen, borrarImagenPorUrl } = require('./imagenes');
const v = require('./validaciones');

const MAX_MOMENTOS = 20;

async function obtener(req, res) {
    try {
        const { eventoId } = req.params;
        if (!v.idValido(eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const diseno = await DisenoInvitacion.findOne({ eventoId, usuarioId: req.usuarioId });
        if (diseno) return res.json(diseno);

        res.json({
            eventoId,
            color: '#5b2a86',
            fotoPortada: null,
            frase: '',
            momentos: [],
            configurado: false
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar el diseño de la invitación' });
    }
}


function leerMomentos(errores, crudo) {
    if (crudo === undefined || crudo === '') return [];

    let lista;
    try {
        lista = JSON.parse(crudo);
    } catch {
        errores.push('Los momentos no tienen un formato válido');
        return [];
    }
    if (!Array.isArray(lista)) {
        errores.push('Los momentos no tienen un formato válido');
        return [];
    }
    if (lista.length > MAX_MOMENTOS) {
        errores.push(`Solo puedes agregar hasta ${MAX_MOMENTOS} momentos`);
        return [];
    }

    const momentos = [];
    lista.forEach((m, i) => {
        const hora = v.validarTexto(errores, m && m.hora, { etiqueta: `La hora del momento ${i + 1}`, max: 20 });
        const descripcion = v.validarTexto(errores, m && m.descripcion, { etiqueta: `La descripción del momento ${i + 1}`, max: 100 });
        if (!hora && !descripcion) return;
        if (!hora || !descripcion) errores.push(`El momento ${i + 1} necesita hora y descripción`);
        momentos.push({ hora, descripcion });
    });
    return momentos;
}

async function guardar(req, res) {
    try {
        const { eventoId } = req.params;
        if (!v.idValido(eventoId)) {
            descartarImagen(req.file);
            return res.status(400).json({ mensaje: 'Evento no válido' });
        }

        const evento = await eventoDelUsuario(eventoId, req.usuarioId);
        if (!evento) {
            descartarImagen(req.file);
            return res.status(404).json({ mensaje: 'Evento no encontrado' });
        }

        
        if (evento.estaBloqueado()) {
            descartarImagen(req.file);
            return res.status(409).json({
                mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.'
            });
        }

        const { color, frase } = req.body || {};
        const errores = [];

        if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            errores.push('El color no es válido');
        }
        const fraseLimpia = v.validarTexto(errores, frase, { etiqueta: 'La frase', max: 500 });
        const momentos = leerMomentos(errores, req.body && req.body.momentos);

        if (errores.length > 0) {
            descartarImagen(req.file);
            return v.responderErrores(res, errores);
        }

        const datos = { color, frase: fraseLimpia, momentos };
        let fotoAnterior = null;

        if (req.file) {
            const previo = await DisenoInvitacion.findOne({ eventoId, usuarioId: req.usuarioId })
                .select('fotoPortada').lean();
            fotoAnterior = previo && previo.fotoPortada;
            datos.fotoPortada = urlImagen(req.file);
        }

        const diseno = await DisenoInvitacion.findOneAndUpdate(
            { eventoId, usuarioId: req.usuarioId },
            datos,
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        borrarImagenPorUrl(fotoAnterior);
        res.json(diseno);
    } catch (error) {
        descartarImagen(req.file);
        res.status(400).json({ mensaje: 'Error al guardar el diseño de la invitación', error: error.message });
    }
}

module.exports = { obtener, guardar };