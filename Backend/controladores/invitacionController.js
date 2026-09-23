const crypto = require('crypto');
const Invitado = require('../models/invitacion');
const Mesa = require('../models/mesa');
const { eventoDelUsuario } = require('./eventoUser');
const v = require('./validaciones');

const SIN_MAYUSCULAS = { locale: 'es', strength: 2 };

function generarToken() {
    return crypto.randomBytes(12).toString('hex');
}

async function validarInvitado(body, eventoId, usuarioId, invitadoActual = null) {
    const errores = [];
    const { nombre, email, numeroAcompanantes, restriccionesAlimentarias, observaciones } = body || {};

    const nombreLimpio = v.validarTexto(errores, nombre, {
        etiqueta: 'El nombre', max: 100, obligatorio: 'El nombre es obligatorio'
    });

    const emailLimpio = v.validarTexto(errores, email, { etiqueta: 'El email', max: 100 });
    if (emailLimpio) {
        if (!v.esEmail(emailLimpio)) {
            errores.push('El email no es válido');
        } else {
            const repetido = await Invitado.findOne({
                eventoId, usuarioId, email: emailLimpio,
                _id: { $ne: invitadoActual ? invitadoActual._id : null }
            }).collation(SIN_MAYUSCULAS);
            if (repetido) errores.push('Ya hay un invitado con ese email');
        }
    }

    let acompanantes = 0;
    if (numeroAcompanantes !== undefined && numeroAcompanantes !== null && numeroAcompanantes !== '') {
        const n = Number(numeroAcompanantes);
        const yaConfirmados = invitadoActual ? (invitadoActual.acompanantesConfirmados || []).length : 0;
        if (!Number.isInteger(n) || n < 0) {
            errores.push('Los acompañantes deben ser un número entero mayor o igual a 0');
        } else if (n > v.MAX_ACOMPANANTES) {
            errores.push(`Un invitado no puede llevar más de ${v.MAX_ACOMPANANTES} acompañantes`);
        } else if (n < yaConfirmados) {
            errores.push(`Este invitado ya anotó ${yaConfirmados} acompañante(s); no puedes dejarlo con ${n}`);
        } else {
            acompanantes = n;
        }
    }

    const restriccionesLimpias = v.validarTexto(errores, restriccionesAlimentarias, {
        etiqueta: 'Las restricciones alimentarias', max: 200
    });
    const observacionesLimpias = v.validarTexto(errores, observaciones, {
        etiqueta: 'Las observaciones', max: 200
    });

    return {
        errores,
        datos: {
            nombre: nombreLimpio, email: emailLimpio, numeroAcompanantes: acompanantes,
            restriccionesAlimentarias: restriccionesLimpias || '',
            observaciones: observacionesLimpias || ''
        }
    };
}

async function listarPorEvento(req, res) {
    try {
        if (!v.idValido(req.params.eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const invitados = await Invitado.find({
            eventoId: req.params.eventoId,
            usuarioId: req.usuarioId
        }).sort({ createAt: -1 });
        res.json(invitados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar los invitados' });
    }
}

async function crear(req, res) {
    try {
        const { eventoId } = req.params;
        if (!v.idValido(eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const evento = await eventoDelUsuario(eventoId, req.usuarioId);
        if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });
        if (evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = await validarInvitado(req.body, eventoId, req.usuarioId);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const invitado = await Invitado.create({
            eventoId,
            usuarioId: req.usuarioId,
            ...datos,
            token: generarToken()
        });

        res.status(201).json(invitado);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear el invitado', error: error.message });
    }
}

async function editar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Invitado no válido' });

        const invitado = await Invitado.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!invitado) return res.status(404).json({ mensaje: 'Invitado no encontrado' });

        const evento = await eventoDelUsuario(invitado.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = await validarInvitado(req.body, invitado.eventoId, req.usuarioId, invitado);

        if (errores.length > 0) return v.responderErrores(res, errores);

        invitado.nombre = datos.nombre;
        invitado.email = datos.email;
        invitado.numeroAcompanantes = datos.numeroAcompanantes;
        invitado.restriccionesAlimentarias = datos.restriccionesAlimentarias;
        invitado.observaciones = datos.observaciones;

        await invitado.save();
        res.json(invitado);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al editar el invitado', error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Invitado no válido' });

        const invitado = await Invitado.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!invitado) return res.status(404).json({ mensaje: 'Invitado no encontrado' });

        const evento = await eventoDelUsuario(invitado.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        await invitado.deleteOne();

        res.json({ mensaje: 'Invitado eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar el invitado' });
    }
}

module.exports = { listarPorEvento, crear, editar, eliminar };