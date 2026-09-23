const Proveedor = require('../models/proveedor');
const Gasto = require('../models/gasto');
const { eventoDelUsuario } = require('../controladores/eventoUser');
const v = require('../controladores/validaciones');


async function validarProveedor(body, eventoId, usuarioId, idActual = null) {
    const errores = [];
    const { nombre, servicio, contacto } = body || {};

    const nombreLimpio = v.texto(nombre);
    if (!v.esTextoOAusente(nombre) || !nombreLimpio) {
        errores.push('El nombre es obligatorio');
    } else if (nombreLimpio.length > 100) {
        errores.push('El nombre no puede superar los 100 caracteres');
    } else {
        const existentes = await Proveedor.find({ eventoId, usuarioId }).select('nombre').lean();
        const repetido = existentes.some(p =>
            String(p._id) !== String(idActual) && v.mismoTexto(p.nombre, nombreLimpio));
        if (repetido) errores.push('Ya tienes un proveedor con ese nombre');
    }

    const servicioLimpio = v.texto(servicio);
    if (!v.esTextoOAusente(servicio)) errores.push('El servicio no es válido');
    else if (servicioLimpio.length > 60) errores.push('El servicio no puede superar los 60 caracteres');

    const contactoLimpio = v.texto(contacto);
    if (!v.esTextoOAusente(contacto)) {
        errores.push('El contacto no es válido');
    } else if (contactoLimpio.length > 100) {
        errores.push('El contacto no puede superar los 100 caracteres');
    } else if (contactoLimpio && !v.contactoValido(contactoLimpio)) {
        errores.push('El contacto debe ser un teléfono (7 a 15 dígitos) o un correo válido');
    }

    return {
        errores,
        datos: { nombre: nombreLimpio, servicio: servicioLimpio, contacto: contactoLimpio }
    };
}

async function listarPorEvento(req, res) {
    try {
        const { eventoId } = req.params;
        if (!v.idValido(eventoId)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const proveedores = await Proveedor.find({ eventoId, usuarioId: req.usuarioId })
            .sort({ nombre: 1 })
            .lean();

        const gastos = await Gasto.find({
            eventoId,
            usuarioId: req.usuarioId,
            proveedorId: { $ne: null }
        }).select('proveedorId monto').lean();

        const totales = {};
        for (const g of gastos) {
            const clave = g.proveedorId.toString();
            totales[clave] = (totales[clave] || 0) + g.monto;
        }

        res.json(proveedores.map(p => ({ ...p, totalGastado: totales[p._id.toString()] || 0 })));
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar los proveedores' });
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

        const { errores, datos } = await validarProveedor(req.body, eventoId, req.usuarioId);
        if (errores.length > 0) return v.responderErrores(res, errores);

        const proveedor = new Proveedor({ eventoId, usuarioId: req.usuarioId, ...datos });

        await proveedor.save();
        res.status(201).json(proveedor);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear el proveedor', error: error.message });
    }
}

async function editar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Proveedor no válido' });

        const proveedor = await Proveedor.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!proveedor) return res.status(404).json({ mensaje: 'Proveedor no encontrado' });

        const evento = await eventoDelUsuario(proveedor.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        const { errores, datos } = await validarProveedor(
            req.body, proveedor.eventoId, req.usuarioId, proveedor._id
        );
        if (errores.length > 0) return v.responderErrores(res, errores);

        proveedor.nombre = datos.nombre;
        proveedor.servicio = datos.servicio;
        proveedor.contacto = datos.contacto;

        await proveedor.save();
        res.json(proveedor);
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al editar el proveedor', error: error.message });
    }
}

async function eliminar(req, res) {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Proveedor no válido' });

        const proveedor = await Proveedor.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!proveedor) return res.status(404).json({ mensaje: 'Proveedor no encontrado' });

        const evento = await eventoDelUsuario(proveedor.eventoId, req.usuarioId);
        if (evento && evento.estaBloqueado()) {
            return res.status(409).json({ mensaje: 'Este evento ya no está activo. Solo puedes consultarlo o actualizar su información general para reprogramarlo.' });
        }

        await proveedor.deleteOne();
        await Gasto.updateMany({ proveedorId: proveedor._id }, { $unset: { proveedorId: 1 } });
        res.json({ mensaje: 'Proveedor eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar el proveedor' });
    }
}

module.exports = { listarPorEvento, crear, editar, eliminar };