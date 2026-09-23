const Invitado = require('../models/invitacion');
const DisenoInvitacion = require('../models/disenoInvitacion');
const Evento = require('../models/evento');
const v = require('./validaciones');


const REGEX_TOKEN = /^[0-9a-f]{24}$/;

function buscarInvitado(token) {
    return REGEX_TOKEN.test(token) ? Invitado.findOne({ token }) : null;
}


async function obtenerPorToken(req, res) {
    try {
        const invitado = await buscarInvitado(req.params.token);
        if (!invitado) {
            return res.status(404).json({ mensaje: 'Invitación no encontrada' });
        }

        const [diseno, evento] = await Promise.all([
            DisenoInvitacion.findOne({ eventoId: invitado.eventoId })
                .select('color fotoPortada frase momentos -_id').lean(),
            Evento.findById(invitado.eventoId).select('nombre fecha lugar -_id').lean()
        ]);

        
        if (!evento) {
            return res.status(404).json({ mensaje: 'Invitación no encontrada' });
        }

        res.json({
            invitado: {
                nombre: invitado.nombre,
                numeroAcompanantes: invitado.numeroAcompanantes,
                acompanantesConfirmados: invitado.acompanantesConfirmados,
                estado: invitado.estado,
                restriccionesAlimentarias: invitado.restriccionesAlimentarias,
                observaciones: invitado.observaciones
            },
            diseno: diseno || null,
            evento
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar la invitación' });
    }
}


async function responder(req, res) {
    try {
        const invitado = await buscarInvitado(req.params.token);
        if (!invitado) {
            return res.status(404).json({ mensaje: 'Invitación no encontrada' });
        }

        const { estado, acompanantesConfirmados, restriccionesAlimentarias, observaciones } = req.body || {};
        const errores = [];

        if (!['confirmado', 'rechazado'].includes(estado)) errores.push('Estado inválido');

        const restricciones = v.validarTexto(errores, restriccionesAlimentarias, {
            etiqueta: 'Las restricciones alimentarias', max: 200
        });
        const notas = v.validarTexto(errores, observaciones, { etiqueta: 'El mensaje', max: 500 });

        let acompanantes = [];
        if (estado === 'confirmado' && acompanantesConfirmados !== undefined) {
            if (!Array.isArray(acompanantesConfirmados) || acompanantesConfirmados.some(a => typeof a !== 'string')) {
                errores.push('Los acompañantes no tienen un formato válido');
            } else {
                acompanantes = acompanantesConfirmados.map(a => a.trim()).filter(Boolean);
                if (acompanantes.length > invitado.numeroAcompanantes) {
                    errores.push(`Solo puedes anotar hasta ${invitado.numeroAcompanantes} acompañante(s)`);
                }
                if (acompanantes.some(a => a.length > 100)) {
                    errores.push('El nombre de un acompañante no puede superar los 100 caracteres');
                }
            }
        }

        if (errores.length > 0) return v.responderErrores(res, errores);

        invitado.estado = estado;
        invitado.acompanantesConfirmados = estado === 'confirmado' ? acompanantes : [];
        invitado.restriccionesAlimentarias = restricciones;
        invitado.observaciones = notas;

        await invitado.save();

        
        res.json({ mensaje: 'Respuesta guardada, ¡gracias!' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al guardar tu respuesta', error: error.message });
    }
}

module.exports = { obtenerPorToken, responder };