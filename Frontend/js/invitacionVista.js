

const ZONA_EVENTO = 'America/Bogota';

function escapar(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fechaValida(valor) {
    if (!valor) return null;
    const fecha = new Date(valor);
    return isNaN(fecha) ? null : fecha;
}

function formatearFecha(valor) {
    const fecha = fechaValida(valor);
    if (!fecha) return null;
    return fecha.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA_EVENTO
    });
}

function formatearHora(valor) {
    const fecha = fechaValida(valor);
    if (!fecha) return null;
    return fecha.toLocaleTimeString('es-CO', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA_EVENTO
    });
}



function colorValido(color) {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color || '') ? color : '#5b2a86';
}

function hexARgb(hex) {
    const limpio = hex.replace('#', '');
    const valor = limpio.length === 3
        ? limpio.split('').map(c => c + c).join('')
        : limpio;
    const num = parseInt(valor, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbAHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslAHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const aRgb = x => Math.round(255 * f(x)).toString(16).padStart(2, '0');
    return `#${aRgb(0)}${aRgb(8)}${aRgb(4)}`;
}

// Genera y aplica toda la paleta a partir de UN color elegido por el usuario
function aplicarPaleta(colorElegido) {
    const colorBase = colorValido(colorElegido);
    const rgb = hexARgb(colorBase);
    const { h, s, l } = rgbAHsl(rgb);
    const raiz = document.documentElement.style;

    raiz.setProperty('--acento', colorBase);
    raiz.setProperty('--acento-oscuro', hslAHex(h, Math.min(s, 70), Math.max(l - 22, 14)));
    raiz.setProperty('--acento-profundo', hslAHex(h, Math.min(s, 65), Math.max(l - 42, 8)));
    raiz.setProperty('--papel', hslAHex(h, Math.min(s, 45), 96));
    raiz.setProperty('--borde', hslAHex(h, Math.min(s, 40), 88));
    raiz.setProperty('--acento-texto', l > 65 ? '#1f1b2e' : '#ffffff');
    raiz.setProperty('--acento-sombra', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
}





function renderizarInvitacion({ invitado, diseno = {}, evento = {} }, opciones = {}) {
    const app = document.getElementById('app');
    aplicarPaleta(diseno.color);

   
    const fechaOrigen = evento.fecha;
    const lugarEvento = evento.lugar && evento.lugar !== 'Sin especificar' ? evento.lugar : '';

    const fechaTexto = formatearFecha(fechaOrigen);
    const horaTexto = fechaTexto ? formatearHora(fechaOrigen) : null;

    const momentosHtml = (diseno.momentos || [])
        .filter(m => m.hora || m.descripcion)
        .map(m => `
            <div class="momento">
                <span class="momento-hora">${escapar(m.hora)}</span>
                <span class="momento-linea"></span>
                <span class="momento-desc">${escapar(m.descripcion)}</span>
            </div>
        `).join('');

    app.innerHTML = `
        <div class="tarjeta-invitacion">

            <section class="portada">
                <div class="portada-velo"></div>
                <div class="portada-contenido">
                    <p class="portada-para">Para</p>
                    <h1 class="portada-nombre">${escapar(invitado.nombre)}</h1>
                    ${evento.nombre ? `
                        <p class="portada-invita">Estás invitado a</p>
                        <h2 class="portada-evento">${escapar(evento.nombre)}</h2>` : ''}
                </div>
            </section>

            ${diseno.frase ? `<section class="bloque bloque-frase"><p>${escapar(diseno.frase)}</p></section>` : ''}

            ${(fechaTexto || lugarEvento) ? `
            <section class="bloque bloque-datos">
                ${fechaTexto ? `<div class="dato"><span class="dato-icono">📅</span><span>${escapar(fechaTexto)}</span></div>` : ''}
                ${horaTexto ? `<div class="dato"><span class="dato-icono">🕒</span><span>${escapar(horaTexto)}</span></div>` : ''}
                ${lugarEvento ? `<div class="dato"><span class="dato-icono">📍</span><span>${escapar(lugarEvento)}</span></div>` : ''}
            </section>` : ''}

            ${momentosHtml ? `
            <section class="bloque bloque-momentos">
                <h2>Itinerario</h2>
                ${momentosHtml}
            </section>` : ''}

            <section class="bloque bloque-rsvp" id="bloqueRsvp"></section>

        </div>
    `;

    
    if (diseno.fotoPortada) {
        app.querySelector('.portada').style.backgroundImage = `url(${JSON.stringify(diseno.fotoPortada)})`;
    }

    renderizarFormularioRSVP(invitado, opciones);
}

function renderizarFormularioRSVP(invitado, opciones = {}) {
    const cont = document.getElementById('bloqueRsvp');
    const estado = invitado.estado || 'pendiente';
    const yaRespondio = estado !== 'pendiente';
    const cupoAcompanantes = invitado.numeroAcompanantes || 0;

    const camposAcompanantes = Array.from({ length: cupoAcompanantes }, (_, i) => {
        const valor = invitado.acompanantesConfirmados?.[i] || '';
        return `<input type="text" class="input-acompanante" placeholder="Nombre del acompañante ${i + 1}" value="${escapar(valor)}">`;
    }).join('');

    cont.innerHTML = `
        <h2>Confirma tu asistencia</h2>

        ${yaRespondio ? `<p class="rsvp-aviso">Ya registramos tu respuesta como <strong>${escapar(estado)}</strong>. Puedes cambiarla si algo cambió.</p>` : ''}

        <form id="formRSVP">
            <div class="rsvp-opciones">
                <button type="button" class="btn-rsvp btn-rsvp-si ${estado === 'confirmado' ? 'activo' : ''}" data-valor="confirmado">
                    Sí, ahí estaré
                </button>
                <button type="button" class="btn-rsvp btn-rsvp-no ${estado === 'rechazado' ? 'activo' : ''}" data-valor="rechazado">
                    No podré asistir
                </button>
            </div>
            <input type="hidden" id="rsvpEstado" value="${yaRespondio ? escapar(estado) : ''}">

            ${cupoAcompanantes > 0 ? `
            <div class="rsvp-campo" id="bloqueAcompanantes">
                <label>¿A quién vas a llevar? (hasta ${cupoAcompanantes})</label>
                <div id="listaAcompanantes">${camposAcompanantes}</div>
            </div>` : ''}

            <div class="rsvp-campo">
                <label>Restricciones alimentarias (opcional)</label>
                <input type="text" id="rsvpRestricciones" placeholder="Ej: vegetariano, sin gluten..." value="${escapar(invitado.restriccionesAlimentarias || '')}">
            </div>

            <div class="rsvp-campo">
                <label>¿Algo más que quieras decirnos?</label>
                <textarea id="rsvpObservaciones" placeholder="Opcional">${escapar(invitado.observaciones || '')}</textarea>
            </div>

            <button type="submit" class="btn-enviar-rsvp">Enviar respuesta</button>
        </form>

        <p class="rsvp-confirmacion" id="rsvpConfirmacion" hidden>¡Gracias! Tu respuesta fue guardada 💛</p>
    `;

    cont.querySelectorAll('.btn-rsvp').forEach(btn => {
        btn.addEventListener('click', () => {
            cont.querySelectorAll('.btn-rsvp').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            document.getElementById('rsvpEstado').value = btn.dataset.valor;

            const bloqueAcomp = document.getElementById('bloqueAcompanantes');
            if (bloqueAcomp) bloqueAcomp.style.display = btn.dataset.valor === 'confirmado' ? 'block' : 'none';
        });
    });

    
    const bloqueAcomp = document.getElementById('bloqueAcompanantes');
    if (bloqueAcomp && estado === 'rechazado') bloqueAcomp.style.display = 'none';

    document.getElementById('formRSVP').addEventListener('submit', opciones.alEnviar || (e => e.preventDefault()));
}