const Evento = require('../models/evento');

const MS_DIA = 1000 * 60 * 60 * 24;
const VENTANA_PROXIMOS_DIAS = 15;

exports.resumen = async (req, res) => {
    try {
        const eventos = await Evento.find({ usuarioId: req.usuarioId });

        const ahora = new Date();
        const limiteProximos = new Date(ahora.getTime() + VENTANA_PROXIMOS_DIAS * MS_DIA);

        const totalEventos = eventos.length;

        const eventosActivos = eventos.filter(e => e.estado === 'activo' && !e.estaVencido()).length;
        const eventosFinalizados = eventos.filter(e => e.estado === 'finalizado').length;

       
        const proximos = eventos
            .filter(e => e.estado === 'activo' && e.fecha && new Date(e.fecha) >= ahora && new Date(e.fecha) <= limiteProximos)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        const proximosDetalle = proximos.slice(0, 6).map(e => {
            const diasRestantes = Math.ceil((new Date(e.fecha) - ahora) / MS_DIA);
            return {
                _id: e._id,
                nombre: e.nombre,
                fecha: e.fecha,
                lugar: e.lugar,
                imagen: e.imagen,
                diasRestantes
            };
        });

        res.status(200).json({
            totalEventos,
            eventosActivos,
            eventosFinalizados,
            proximosEventos: proximos.length,
            proximosDetalle
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cargar el resumen', error: error.message });
    }
};