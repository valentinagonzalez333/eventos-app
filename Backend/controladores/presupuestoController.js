const Evento = require('../models/evento');
const Gasto = require('../models/gasto');
const Tarea = require('../models/tarea');

const sumar = (lista) => lista.reduce((acc, item) => acc + (item.monto || 0), 0);

async function resumen(req, res) {
    try {
        const evento = await Evento.findOne({ _id: req.params.id, usuarioId: req.usuarioId });
        if (!evento) return res.status(404).json({ mensaje: 'Evento no encontrado' });

        const [gastos, tareasPendientes] = await Promise.all([
            Gasto.find({ eventoId: evento._id, usuarioId: req.usuarioId }).select('categoria monto').lean(),
            Tarea.find({
                eventoId: evento._id,
                usuarioId: req.usuarioId,
                estado: { $ne: 'completada' },
                monto: { $gt: 0 }
            }).select('monto').lean()
        ]);

        const total = evento.presupuesto || 0;
        const gastado = sumar(gastos);
        const estimadoPendiente = sumar(tareasPendientes);
        const tienePresupuesto = total > 0;

        const porCategoria = {};
        for (const g of gastos) {
            porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
        }

        res.json({
            tienePresupuesto,
            presupuesto: total,
            gastado,
            disponible: tienePresupuesto ? total - gastado : null,
            porcentajeGastado: tienePresupuesto ? Math.min((gastado / total) * 100, 100) : 0,
            excedido: tienePresupuesto && gastado > total,
            estimadoPendiente,
            proyectado: gastado + estimadoPendiente,
            excederiaConPendientes: tienePresupuesto && gastado + estimadoPendiente > total,
            porCategoria: Object.entries(porCategoria).map(([categoria, monto]) => ({ categoria, monto }))
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al calcular el presupuesto' });
    }
}

module.exports = { resumen };