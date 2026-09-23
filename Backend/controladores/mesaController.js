const Mesa = require('../models/mesa');
const Invitado = require('../models/invitacion');
const { eventoDelUsuario } = require('../controladores/eventoUser');
const v = require('../controladores/validaciones');

const MAX_SILLAS_MESA = 50;

function sillasDe(invitado) {
    if (invitado.estado === 'rechazado') return 0;
    const acompanantes = invitado.estado === 'confirmado'
        ? (invitado.acompanantesConfirmados || []).length
        : (invitado.numeroAcompanantes || 0);
    return 1 + acompanantes;
}

async function sillasOcupadas(mesa) {
    const invitados = await Invitado.find({ _id: { $in: mesa.invitados } });
    return invitados.reduce((total, inv) => total + sillasDe(inv), 0);
}


async function validarMesa(body, eventoId, usuarioId, idActual = null) {
    const errores = [];
    const { nombre, capacidad, descripcion } = body || {};

    const nombreLimpio = v.texto(nombre);
    if (!v.esTextoOAusente(nombre) || !nombreLimpio) {
        errores.push('El identificador de la mesa es obligatorio');
    } else if (nombreLimpio.length > 50) {
        errores.push('El identificador no puede superar los 50 caracteres');
    } else {
        const existentes = await Mesa.find({ eventoId, usuarioId }).select('nombre').lean();
        const repetida = existentes.some(m =>
            String(m._id) !== String(idActual) && v.mismoTexto(m.nombre, nombreLimpio));
        if (repetida) errores.push('Ya hay una mesa con ese identificador');
    }

    let sillas;
    if (capacidad === undefined && idActual === null) {
        sillas = 8;
    } else if (capacidad === undefined || capacidad === null || capacidad === '') {
        errores.push('El número de sillas es obligatorio');
    } else {
        const n = typeof capacidad === 'number' ? capacidad : (typeof capacidad === 'string' ? Number(capacidad) : NaN);
        if (!Number.isInteger(n)) errores.push('El número de sillas debe ser un número entero');
        else if (n < 1) errores.push('La mesa debe tener al menos 1 silla');
        else if (n > MAX_SILLAS_MESA) errores.push(`Una mesa no puede tener más de ${MAX_SILLAS_MESA} sillas`);
        else sillas = n;
    }

    const descripcionLimpia = v.texto(descripcion);
    if (!v.esTextoOAusente(descripcion)) errores.push('La descripción no es válida');
    else if (descripcionLimpia.length > 150) errores.push('La descripción no puede superar los 150 caracteres');

    return {
        errores,
        datos: { nombre: nombreLimpio, capacidad: sillas, descripcion: descripcionLimpia }
    };
}

async function listarPorEvento(req, res) {
    try {
        if (!v.idValido(req.params.eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const mesas = await Mesa.find({ eventoId: req.params.eventoId, usuarioId: req.usuarioId })
            .populate('invitados', 'nombre numeroAcompanantes acompanantesConfirmados estado')
            .sort({ createAt: 1 });
        res.json(mesas);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar las mesas' });
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

        const { errores, datos } = await validarMesa(req.body, eventoId, req.usuarioId);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const mesa = new Mesa({
            eventoId,
            usuarioId: req.usuarioId,
            nombre: datos.nombre,
            capacidad: datos.capacidad,
            descripcion: datos.descripcion
        });

        await mesa.save();
        res.status(201).json(mesa);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear la mesa', error: error.message });
    }
}

async function editar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Mesa no válida' });

        const mesa = await Mesa.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' });

        const evento = await eventoDelUsuario(mesa.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = await validarMesa(req.body, mesa.eventoId, req.usuarioId, mesa._id);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const ocupadas = await sillasOcupadas(mesa);
        if (datos.capacidad < ocupadas) {
            return v.responderErrores(res, [
                `Ya hay ${ocupadas} sillas ocupadas; no puedes dejar la mesa con ${datos.capacidad}`
            ]);
        }

        mesa.nombre = datos.nombre;
        mesa.capacidad = datos.capacidad;
        mesa.descripcion = datos.descripcion;

        await mesa.save();
        res.json(mesa);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al editar la mesa', error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Mesa no válida' });

        const mesa = await Mesa.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' });

        const evento = await eventoDelUsuario(mesa.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        await mesa.deleteOne();
        res.json({ mensaje: 'Mesa eliminada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar la mesa' });
    }
}

async function agregarInvitado(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Mesa no válida' });
        if (!v.idValido(req.body && req.body.invitadoId)) return res.status(400).json({ mensaje: 'Invitado no válido' });

        const mesa = await Mesa.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
        const evento = await eventoDelUsuario(mesa.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const invitado = await Invitado.findOne({
            _id: req.body.invitadoId,
            eventoId: mesa.eventoId,
            usuarioId: req.usuarioId
        });
        if (!invitado) return res.status(404).json({ mensaje: 'Invitado no encontrado' });

        if (invitado.estado === 'rechazado') {
            return res.status(400).json({ mensaje: 'Este invitado dijo que no asistirá' });
        }

        const otraMesa = await Mesa.findOne({ eventoId: mesa.eventoId, invitados: invitado._id });
        if (otraMesa) {
            return res.status(400).json({ mensaje: `Este invitado ya está en ${otraMesa.nombre}` });
        }

        const ocupadas = await sillasOcupadas(mesa);
        const necesarias = sillasDe(invitado);
        const libres = mesa.capacidad - ocupadas;
        if (necesarias > libres) {
            return res.status(400).json({
                mensaje: `No caben: necesita ${necesarias} silla(s) y a esta mesa le quedan ${libres}`
            });
        }

        mesa.invitados.push(invitado._id);
        await mesa.save();
        res.json(mesa);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al ubicar el invitado', error: error.message });
    }
}

async function quitarInvitado(req, res) {
    try {
        if (!v.idValido(req.params.id) || !v.idValido(req.params.invitadoId)) {
            return res.status(400).json({ mensaje: 'Identificador no válido' });
        }

        const mesa = await Mesa.findOneAndUpdate(
            { _id: req.params.id, usuarioId: req.usuarioId },
            { $pull: { invitados: req.params.invitadoId } },
            { new: true }
        );
        if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
        const evento = await eventoDelUsuario(mesa.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }
        res.json(mesa);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al quitar el invitado de la mesa' });
    }
}

module.exports = { listarPorEvento, crear, editar, eliminar, agregarInvitado, quitarInvitado };