const Evento = require('../models/evento');
const Gasto = require('../models/gasto');
const Tarea = require('../models/tarea');
const Proveedor = require('../models/proveedor');
const Mesa = require('../models/mesa');
const Invitado = require('../models/invitacion');
const DisenoInvitacion = require('../models/disenoInvitacion');
const { urlImagen, descartarImagen, borrarImagenPorUrl } = require('./imagenes');
const v = require('./validaciones');

const ESTADOS_VALIDOS = ['activo', 'finalizado', 'cancelado'];

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function limitesDelDia(fecha) {
    const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
    const fin = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
    return { inicio, fin };
}


function validarEvento(body) {
    const errores = [];
    const { nombre, fecha, lugar, descripcion, presupuesto, estado } = body || {};

    const nombreLimpio = v.validarTexto(errores, nombre, {
        etiqueta: 'El nombre', max: 100, obligatorio: 'El nombre es obligatorio'
    });
    const lugarLimpio = v.validarTexto(errores, lugar, { etiqueta: 'El lugar', max: 150 });
    const descripcionLimpia = v.validarTexto(errores, descripcion, { etiqueta: 'La descripción', max: 500 });

    const fechaValida = v.aFecha(fecha);
    if (!fechaValida) {
        errores.push('La fecha es obligatoria y debe ser válida');
    } else if (fechaValida < v.FECHA_MINIMA || fechaValida > v.FECHA_MAXIMA) {
        errores.push('La fecha debe estar entre los años 2000 y 2100');
    }

    const errorPresupuesto = v.errorMonto(presupuesto, {
        obligatorio: false, permitirCero: true, etiqueta: 'El presupuesto'
    });
    if (errorPresupuesto) errores.push(errorPresupuesto);

    if (estado && !ESTADOS_VALIDOS.includes(estado)) errores.push('Estado no válido');

    return {
        errores,
        datos: {
            nombre: nombreLimpio,
            descripcion: descripcionLimpia || 'Sin especificar',
            fecha: fechaValida,
            lugar: lugarLimpio || 'Sin especificar',
            presupuesto: presupuesto ? Number(presupuesto) : 0,
            estado
        }
    };
}



async function buscarDuplicado(usuarioId, nombre, fecha, idExcluir) {
    const { inicio, fin } = limitesDelDia(fecha);

    const filtro = {
        usuarioId,
        fecha: { $gte: inicio, $lte: fin },
        nombre: { $regex: new RegExp(`^${escaparRegex(nombre)}$`, 'i') }
    };
    if (idExcluir) filtro._id = { $ne: idExcluir };
    return Evento.findOne(filtro);
}

const MENSAJE_DUPLICADO = 'Ya tienes un evento con ese nombre ese mismo día';

exports.crear = async (req, res) => {
    try {
        const { errores, datos } = validarEvento(req.body);

        
        if (datos.fecha && datos.fecha < new Date()) {
            errores.push('La fecha del evento no puede estar en el pasado');
        }

        if (errores.length > 0) {
            descartarImagen(req.file);
            return v.responderErrores(res, errores);
        }

        if (await buscarDuplicado(req.usuarioId, datos.nombre, datos.fecha)) {
            descartarImagen(req.file);
            return res.status(409).json({ mensaje: MENSAJE_DUPLICADO });
        }

        const nuevoEvento = await Evento.create({
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            fecha: datos.fecha,
            lugar: datos.lugar,
            imagen: urlImagen(req.file),
            presupuesto: datos.presupuesto,
            usuarioId: req.usuarioId
        });

        res.status(201).json(nuevoEvento);
    } catch (error) {
        descartarImagen(req.file);
        res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
    }
};

exports.editar = async (req, res) => {
    try {
        const { id } = req.params;
        if (!v.idValido(id)) {
            descartarImagen(req.file);
            return res.status(400).json({ mensaje: 'Evento no válido' });
        }

        const eventoExistente = await Evento.findOne({ _id: id, usuarioId: req.usuarioId });
        if (!eventoExistente) {
            descartarImagen(req.file);
            return res.status(404).json({ mensaje: 'El evento no se encuentra' });
        }

        const { errores, datos } = validarEvento(req.body);

        
        const fechaCambio = datos.fecha &&
            (!eventoExistente.fecha || datos.fecha.getTime() !== eventoExistente.fecha.getTime());
        if (fechaCambio && datos.fecha < new Date()) {
            errores.push('La fecha del evento no puede estar en el pasado');
        }

        if (errores.length > 0) {
            descartarImagen(req.file);
            return v.responderErrores(res, errores);
        }

        if (await buscarDuplicado(req.usuarioId, datos.nombre, datos.fecha, id)) {
            descartarImagen(req.file);
            return res.status(409).json({ mensaje: MENSAJE_DUPLICADO });
        }

        const datosActualizados = {
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            fecha: datos.fecha,
            lugar: datos.lugar,
            presupuesto: datos.presupuesto
        };

        if (datos.estado) datosActualizados.estado = datos.estado;
        if (req.file) datosActualizados.imagen = urlImagen(req.file);

        const eventoActualizado = await Evento.findOneAndUpdate(
            { _id: id, usuarioId: req.usuarioId },
            datosActualizados,
            { new: true, runValidators: true }
        );

        if (req.file) borrarImagenPorUrl(eventoExistente.imagen); 

        res.status(200).json({ mensaje: 'Evento actualizado con éxito', evento: eventoActualizado });
    } catch (error) {
        descartarImagen(req.file);
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        if (!v.idValido(id)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const eventoEliminado = await Evento.findOneAndDelete({
            _id: id,
            usuarioId: req.usuarioId
        });

        if (!eventoEliminado) {
            return res.status(404).json({ mensaje: 'El evento no se encuentra' });
        }

        
        await Promise.all(
            [Gasto, Tarea, Proveedor, Mesa, Invitado, DisenoInvitacion]
                .map(Modelo => Modelo.deleteMany({ eventoId: eventoEliminado._id }))
        );
        borrarImagenPorUrl(eventoEliminado.imagen);

        res.status(200).json({ mensaje: 'Evento eliminado con éxito' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
};

exports.listar = async (req, res) => {
    try {
        const eventos = await Evento.find({ usuarioId: req.usuarioId });
        const conEstado = eventos.map(e => ({ ...e.toObject(), vencido: e.estaVencido() }));
        res.status(200).json(conEstado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
    }
};

exports.obtenerUno = async (req, res) => {
    try {
        if (!v.idValido(req.params.id)) return res.status(400).json({ mensaje: 'Evento no válido' });

        const evento = await Evento.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });

        res.json({ ...evento.toObject(), vencido: evento.estaVencido() });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar el evento' });
    }
};