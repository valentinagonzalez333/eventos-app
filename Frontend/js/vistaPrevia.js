

function opcionesInvitadoPrevia() {
    const ejemplos = [
        { etiqueta: 'Invitado de ejemplo (sin acompañantes)', nombre: 'Nombre del invitado', numeroAcompanantes: 0 },
        { etiqueta: 'Invitado de ejemplo (con 2 acompañantes)', nombre: 'Nombre del invitado', numeroAcompanantes: 2 }
    ];

    const reales = invitadosActuales.map(inv => ({
        etiqueta: `${inv.nombre} (${inv.numeroAcompanantes || 0} acompañante${(inv.numeroAcompanantes || 0) === 1 ? '' : 's'})`,
        nombre: inv.nombre,
        numeroAcompanantes: inv.numeroAcompanantes || 0
    }));

    return [...ejemplos, ...reales];
}

function abrirVistaPrevia() {
    const boton = document.getElementById('btnVistaPrevia');
    const archivo = document.getElementById('disenoFoto').files[0];
    const urlObjeto = archivo ? URL.createObjectURL(archivo) : null;

    const diseno = {
        color: document.getElementById('disenoColor').value,
        frase: document.getElementById('disenoFrase').value.trim(),
        fotoPortada: urlObjeto || disenoActual.fotoPortada || '',
        momentos: momentosLimpios().filter(m => m.hora && m.descripcion)
    };

    const evento = {
        nombre: eventoInfo ? eventoInfo.nombre : 'Tu evento',
        fecha: eventoInfo ? eventoInfo.fecha : null,
        lugar: eventoInfo && eventoInfo.lugar !== 'Sin especificar' ? (eventoInfo.lugar || '') : ''
    };

    const opciones = opcionesInvitadoPrevia();

    const fondo = document.createElement('div');
    fondo.className = 'vp-fondo';
    fondo.setAttribute('role', 'dialog');
    fondo.setAttribute('aria-modal', 'true');
    fondo.setAttribute('aria-label', 'Vista previa de la invitación');

    fondo.innerHTML = `
        <div class="vp-ventana">
            <div class="vp-barra">
                <strong>Vista previa</strong>

                <label class="vp-selector">Ver como
                    <select id="vpInvitado">
                        ${opciones.map((o, i) => `<option value="${i}">${escapar(o.etiqueta)}</option>`).join('')}
                    </select>
                </label>

                <div class="vp-dispositivos" role="group" aria-label="Tamaño de pantalla">
                    <button type="button" class="activo" data-modo="movil">Celular</button>
                    <button type="button" data-modo="escritorio">Computador</button>
                </div>

                <button type="button" class="vp-cerrar" aria-label="Cerrar">&times;</button>
            </div>

            <div class="vp-escenario">
                <div class="vp-marco vp-movil" id="vpMarco">
                    <iframe id="vpIframe" title="Vista previa de la invitación"></iframe>
                </div>
            </div>

            <p class="vp-nota">Así la ven tus invitados. Aquí no se guarda ninguna respuesta.</p>
        </div>
    `;

    const iframe = fondo.querySelector('#vpIframe');
    const selector = fondo.querySelector('#vpInvitado');
    const marco = fondo.querySelector('#vpMarco');

    const pintar = () => {
        const ventana = iframe.contentWindow;
        if (!ventana || typeof ventana.renderizarInvitacion !== 'function') {
            iframe.contentDocument.body.textContent =
                'No se pudo cargar la vista previa. Revisa que exista /js/invitacionVista.js';
            return;
        }

        const elegido = opciones[Number(selector.value)];

        ventana.renderizarInvitacion(
            {
                invitado: {
                    nombre: elegido.nombre,
                    numeroAcompanantes: elegido.numeroAcompanantes,
                    estado: 'pendiente',
                    acompanantesConfirmados: []
                },
                diseno,
                evento
            },
            {
                alEnviar: (e) => {
                    e.preventDefault();
                    const aviso = ventana.document.getElementById('rsvpConfirmacion');
                    aviso.textContent = 'Vista previa: aquí no se guarda ninguna respuesta.';
                    aviso.hidden = false;
                }
            }
        );
    };

   
    iframe.addEventListener('load', pintar);
    iframe.srcdoc = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/css/invitacion.css">
    <script src="/js/invitacionVista.js"><\/script>
</head>
<body>
    <main id="app"></main>
</body>
</html>`;

    selector.addEventListener('change', pintar);

    fondo.querySelectorAll('.vp-dispositivos button').forEach(btn => {
        btn.addEventListener('click', () => {
            fondo.querySelectorAll('.vp-dispositivos button').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            marco.classList.toggle('vp-movil', btn.dataset.modo === 'movil');
            marco.classList.toggle('vp-escritorio', btn.dataset.modo === 'escritorio');
        });
    });

    const alPresionar = (ev) => { if (ev.key === 'Escape') cerrar(); };

    const cerrar = () => {
        document.removeEventListener('keydown', alPresionar);
        if (urlObjeto) URL.revokeObjectURL(urlObjeto);
        document.body.style.overflow = '';
        fondo.remove();
        if (boton) boton.focus();
    };

    fondo.addEventListener('click', (ev) => { if (ev.target === fondo) cerrar(); });
    fondo.querySelector('.vp-cerrar').addEventListener('click', cerrar);
    document.addEventListener('keydown', alPresionar);

    document.body.style.overflow = 'hidden';
    document.body.appendChild(fondo);
    fondo.querySelector('.vp-cerrar').focus();
}