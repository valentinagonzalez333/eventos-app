const Gasto = require('../models/gasto');
const Proveedor = require('../models/proveedor');
const { eventoDelUsuario } = require('../controladores/eventoUser');
const { CATEGORIAS } = require('../conf/categorias');
const v = require('../controladores/validaciones');

async function proveedorValido(proveedorId, eventoId, usuarioId) {
    if (!proveedorId) return true;
    const proveedor = await Proveedor.findOne({ _id: proveedorId, eventoId, usuarioId });
    return !!proveedor;
}


async function validarGasto(body, eventoId, usuarioId) {
    const errores = [];
    const { categoria, monto, descripcion, proveedorId, fecha } = body || {};

    if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) {
        errores.push('Elige una categoría válida');
    }

    const errorDeMonto = v.errorMonto(monto);
    if (errorDeMonto) errores.push(errorDeMonto);

    if (!v.esTextoOAusente(descripcion)) errores.push('La descripción no es válida');
    else if (v.texto(descripcion).length > 200) errores.push('La descripción no puede superar los 200 caracteres');

    let proveedor;
    if (proveedorId) {
        if (!v.idValido(proveedorId) || !(await proveedorValido(proveedorId, eventoId, usuarioId))) {
            errores.push('El proveedor no pertenece a este evento');
        } else {
            proveedor = proveedorId;
        }
    }

    let fechaGasto;
    if (fecha) {
        fechaGasto = v.aFecha(fecha);
        if (!fechaGasto) errores.push('La fecha no es válida');
        else if (fechaGasto < v.FECHA_MINIMA) errores.push('La fecha no puede ser anterior al año 2000');

        else if (fechaGasto.getTime() > Date.now() + v.UN_DIA) errores.push('La fecha no puede ser futura');
    }

    return {
        errores,
        datos: {
            categoria,
            monto: Number(monto),
            descripcion: v.texto(descripcion),
            proveedorId: proveedor,
            fecha: fechaGasto || undefined
        }
    };
}

async function listarPorEvento(req, res) {
    try {
        if (!v.idValido(req.params.eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const gastos = await Gasto.find({
            eventoId: req.params.eventoId,
            usuarioId: req.usuarioId
        })
            .populate('proveedorId', 'nombre')
            .sort({ fecha: -1 });
        res.json(gastos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar los gastos' });
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

        const { errores, datos } = await validarGasto(req.body, eventoId, req.usuarioId);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const gasto = new Gasto({
            eventoId,
            usuarioId: req.usuarioId,
            categoria: datos.categoria,
            monto: datos.monto,
            descripcion: datos.descripcion,
            proveedorId: datos.proveedorId,
            fecha: datos.fecha
        });

        await gasto.save();
        res.status(201).json(gasto);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear el gasto', error: error.message });
    }
}

async function editar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Gasto no válido' });

        const gasto = await Gasto.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });

        if (gasto.tareaId) {
            return res.status(409).json({ mensaje: 'Este gasto viene de una tarea; edítalo desde Tareas' });
        }

        const evento = await eventoDelUsuario(gasto.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = await validarGasto(req.body, gasto.eventoId, req.usuarioId);
        if (errores.length > 0) return v.responderErrores(res, errores);

        gasto.categoria = datos.categoria;
        gasto.monto = datos.monto;
        gasto.descripcion = datos.descripcion;
        gasto.proveedorId = datos.proveedorId || null;
        if (datos.fecha) gasto.fecha = datos.fecha;

        await gasto.save();
        res.json(gasto);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al editar el gasto', error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Gasto no válido' });

        const gasto = await Gasto.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!gasto) return res.status(404).json({ mensaje: 'Gasto no encontrado' });

        if (gasto.tareaId) {
            return res.status(409).json({ mensaje: 'Este gasto viene de una tarea; desmarca la tarea para quitarlo' });
        }

        const evento = await eventoDelUsuario(gasto.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        await gasto.deleteOne();
        res.json({ mensaje: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar el gasto' });
    }
}

module.exports = { listarPorEvento, crear, editar, eliminar };