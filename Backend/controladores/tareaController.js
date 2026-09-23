const Tarea = require('../models/tarea');
const Gasto = require('../models/gasto');
const { eventoDelUsuario } = require('../controladores/eventoUser');
const { CATEGORIAS } = require('../conf/categorias');
const v = require('../controladores/validaciones');

const PRIORIDADES = ['baja', 'media', 'alta'];
const ESTADOS = ['pendiente', 'en_progreso', 'completada'];

async function sincronizarGasto(tarea) {
    if (tarea.estado === 'completada' && tarea.monto > 0) {
        await Gasto.findOneAndUpdate(
            { tareaId: tarea._id },
            {
                eventoId: tarea.eventoId,
                usuarioId: tarea.usuarioId,
                categoria: tarea.categoria,
                monto: tarea.monto,
                descripcion: tarea.nombre,
                tareaId: tarea._id
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
    } else {
        await Gasto.deleteMany({ tareaId: tarea._id });
    }
}


function validarTarea(body, tareaActual = null) {
    const errores = [];
    const { nombre, descripcion, categoria, fechaLimite, prioridad, monto, estado } = body || {};

    if (!v.esTextoOAusente(nombre) || !v.texto(nombre)) errores.push('El nombre es obligatorio');
    else if (v.texto(nombre).length > 100) errores.push('El nombre no puede superar los 100 caracteres');

    if (!v.esTextoOAusente(descripcion)) errores.push('Las notas no son válidas');
    else if (v.texto(descripcion).length > 300) errores.push('Las notas no pueden superar los 300 caracteres');

    if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) {
        errores.push('Elige una categoría válida');
    }

    if (prioridad !== undefined && !PRIORIDADES.includes(prioridad)) errores.push('La prioridad no es válida');
    if (estado !== undefined && !ESTADOS.includes(estado)) errores.push('El estado no es válido');

    const errorDeMonto = v.errorMonto(monto, { obligatorio: false, permitirCero: true });
    if (errorDeMonto) errores.push(errorDeMonto);

    let fecha = null;
    if (fechaLimite) {
        fecha = v.aFecha(fechaLimite);
        if (!fecha) {
            errores.push('La fecha límite no es válida');
        } else if (fecha < v.FECHA_MINIMA || fecha > v.FECHA_MAXIMA) {
            errores.push('La fecha límite debe estar entre los años 2000 y 2100');
        }
    }

    const sinMonto = monto === undefined || monto === null || monto === '';

    return {
        errores,
        datos: {
            nombre: v.texto(nombre),
            descripcion: v.texto(descripcion),
            categoria,
            fechaLimite: fecha,
            prioridad,
            estado,
            monto: sinMonto ? 0 : Number(monto)
        }
    };
}

async function listarPorEvento(req, res) {
    try {
        if (!v.idValido(req.params.eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const tareas = await Tarea.find({
            eventoId: req.params.eventoId,
            usuarioId: req.usuarioId
        }).sort({ createAt: -1 });
        res.json(tareas);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar las tareas' });
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

        const { errores, datos } = validarTarea(req.body);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const tarea = new Tarea({
            eventoId,
            usuarioId: req.usuarioId,
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            categoria: datos.categoria,
            fechaLimite: datos.fechaLimite,
            prioridad: datos.prioridad,
            estado: datos.estado,
            monto: datos.monto
        });

        await tarea.save();
        await sincronizarGasto(tarea);
        res.status(201).json(tarea);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear la tarea', error: error.message });
    }
}

async function editar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Tarea no válida' });

        const tarea = await Tarea.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

        const evento = await eventoDelUsuario(tarea.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = validarTarea(req.body, tarea);
        if (errores.length > 0) return v.responderErrores(res, errores);

        tarea.nombre = datos.nombre;
        tarea.descripcion = datos.descripcion;
        tarea.categoria = datos.categoria;
        tarea.fechaLimite = datos.fechaLimite;
        tarea.prioridad = datos.prioridad || tarea.prioridad;
        tarea.monto = datos.monto;

        await tarea.save();
        await sincronizarGasto(tarea);
        res.json(tarea);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al editar la tarea', error: error.message });
    }
}

async function cambiarEstado(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Tarea no válida' });

        const { estado } = req.body || {};
        if (!ESTADOS.includes(estado)) return v.responderErrores(res, ['El estado no es válido']);

        const tarea = await Tarea.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

        const evento = await eventoDelUsuario(tarea.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        tarea.estado = estado;
        await tarea.save();
        await sincronizarGasto(tarea);
        res.json(tarea);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al cambiar el estado', error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Tarea no válida' });

        const tarea = await Tarea.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!tarea) return res.status(404).json({ mensaje: 'Tarea no encontrada' });

        const evento = await eventoDelUsuario(tarea.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        await tarea.deleteOne();
        await Gasto.updateMany({ tareaId: tarea._id }, { $unset: { tareaId: 1 } });
        res.json({ mensaje: 'Tarea eliminada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar la tarea' });
    }
}

module.exports = { listarPorEvento, crear, editar, cambiarEstado, eliminar };