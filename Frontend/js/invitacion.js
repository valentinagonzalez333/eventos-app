const token = window.location.pathname.split('/').filter(Boolean).pop();
const app = document.getElementById('app');

async function cargarInvitacion() {
    try {
        const respuesta = await fetch(`/api/rsvp/${token}`);
        if (!respuesta.ok) {
            app.innerHTML = `
                <div class="estado-mensaje">
                    <h1>Invitación no encontrada</h1>
                    <p>Revisa que el link esté completo, o pregúntale a quien te invitó.</p>
                </div>`;
            return;
        }

       
        const { invitado, diseno, evento } = await respuesta.json();

        if (!evento) {
            console.warn('/api/rsvp/:token no devolvió "evento": faltan nombre, fecha y lugar en la invitación.');
        } else if (evento.nombre) {
            document.title = `Invitación · ${evento.nombre}`;
        }

        renderizarInvitacion(
            { invitado, diseno: diseno || {}, evento: evento || {} },
            { alEnviar: enviarRSVP }
        );
    } catch (error) {
        console.error(error);
        app.innerHTML = `
            <div class="estado-mensaje">
                <h1>Algo salió mal</h1>
                <p>No pudimos cargar la invitación. Intenta de nuevo en un momento.</p>
            </div>`;
    }
}

async function enviarRSVP(e) {
    e.preventDefault();

    const estado = document.getElementById('rsvpEstado').value;
    if (!estado) {
        Alerta.aviso('Elige si vas a asistir o no.');
        return;
    }

    const acompanantesConfirmados = Array.from(document.querySelectorAll('.input-acompanante'))
        .map(input => input.value.trim())
        .filter(Boolean);

    const cuerpo = {
        estado,
        acompanantesConfirmados,
        restriccionesAlimentarias: document.getElementById('rsvpRestricciones').value,
        observaciones: document.getElementById('rsvpObservaciones').value
    };

    try {
        const respuesta = await fetch(`/api/rsvp/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cuerpo)
        });

        if (!respuesta.ok) {
            const error = await respuesta.json().catch(() => ({}));
            Alerta.error(error.errores || error.mensaje || 'No se pudo enviar tu respuesta');
            return;
        }

        document.getElementById('formRSVP').hidden = true;
        document.getElementById('rsvpConfirmacion').hidden = false;
    } catch (error) {
        console.error(error);
        Alerta.error('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.');
    }
}

cargarInvitacion();