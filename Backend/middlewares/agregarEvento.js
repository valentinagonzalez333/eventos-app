const Invitado = require('../models/invitacion');
const Evento = require('../models/evento');

function agregarEventoARsvp(req, res, next) {
    const enviarOriginal = res.json.bind(res);

    res.json = (cuerpo) => {
        if (res.statusCode !== 200 || !cuerpo || !cuerpo.invitado) {
            return enviarOriginal(cuerpo);
        }

        Invitado.findOne({ token: req.params.token })
            .select('eventoId')
            .lean()
            .then(invitado => {
                if (!invitado) {
                    console.warn('[rsvp] No encontré un invitado con el token', req.params.token);
                    return null;
                }
                return Evento.findById(invitado.eventoId).select('nombre fecha lugar').lean();
            })
            .then(evento => {
                if (!evento) console.warn('[rsvp] No encontré el evento de esta invitación');
                enviarOriginal(evento ? { ...cuerpo, evento } : cuerpo);
            })
            .catch(error => {
                console.error('[rsvp] No se pudo agregar el evento a la invitación:', error.message);
                enviarOriginal(cuerpo);
            });

        return res;
    };

    next(); 
}

module.exports = agregarEventoARsvp;