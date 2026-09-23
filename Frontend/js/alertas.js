
window.Alerta = (() => {
    const ICONOS = { exito: '✓', error: '✕', info: 'i', aviso: '!', pregunta: '?', peligro: '!' };

    const comoTexto = (mensaje) => (Array.isArray(mensaje) ? mensaje.join('\n') : String(mensaje ?? ''));

    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }


    function contenedorToasts() {
        let cont = document.getElementById('alertas-toasts');
        if (!cont) {
            cont = crear('div');
            cont.id = 'alertas-toasts';
            cont.setAttribute('aria-live', 'polite');
            document.body.appendChild(cont);
        }
        return cont;
    }

    function toast(tipo, mensaje, duracion) {
        const el = crear('div', `alerta-toast alerta-${tipo}`);
        el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');

        const cerrarBtn = crear('button', 'alerta-cerrar', '×');
        cerrarBtn.type = 'button';
        cerrarBtn.setAttribute('aria-label', 'Cerrar');

        el.append(crear('span', 'alerta-icono', ICONOS[tipo]), crear('p', 'alerta-texto', comoTexto(mensaje)), cerrarBtn);

        let temporizador;
        const quitar = () => {
            clearTimeout(temporizador);
            el.classList.add('saliendo');
            setTimeout(() => el.remove(), 200);
        };
        const programar = (ms) => { if (duracion) temporizador = setTimeout(quitar, ms); };

        cerrarBtn.addEventListener('click', quitar);
        el.addEventListener('mouseenter', () => clearTimeout(temporizador));
        el.addEventListener('mouseleave', () => programar(1500));

        contenedorToasts().appendChild(el);
        programar(duracion);
        return quitar;
    }

    
    function ventana({ tipo, titulo, mensaje, botones, extra, valorEscape }) {
        return new Promise((resolver) => {
            const anterior = document.activeElement;
            const idTitulo = `alerta-titulo-${Math.random().toString(36).slice(2)}`;

            const fondo = crear('div', 'alerta-fondo');
            const caja = crear('div', `alerta-caja alerta-${tipo}`);
            caja.setAttribute('role', 'alertdialog');
            caja.setAttribute('aria-modal', 'true');
            caja.setAttribute('aria-labelledby', idTitulo);

            const titular = crear('h2', 'alerta-titulo', titulo);
            titular.id = idTitulo;
            caja.append(crear('div', 'alerta-icono alerta-icono-grande', ICONOS[tipo]), titular);
            if (mensaje) caja.append(crear('p', 'alerta-mensaje', comoTexto(mensaje)));
            if (extra) caja.append(extra);

            const acciones = crear('div', 'alerta-acciones');
            const elementos = botones.map((b) => {
                const el = crear('button', `alerta-btn${b.principal ? ' principal' : ''}${b.peligro ? ' peligro' : ''}`, b.texto);
                el.type = 'button';
                el.addEventListener('click', () => cerrar(b.valor));
                acciones.append(el);
                return el;
            });
            caja.append(acciones);
            fondo.append(caja);

            const overflowAnterior = document.body.style.overflow;

            function cerrar(valor) {
                document.removeEventListener('keydown', alTeclear);
                document.body.style.overflow = overflowAnterior;
                fondo.classList.add('saliendo');
                setTimeout(() => fondo.remove(), 150);
                if (anterior && typeof anterior.focus === 'function') anterior.focus();
                resolver(valor);
            }

            function alTeclear(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cerrar(valorEscape);
                } else if (e.key === 'Tab') {
                 
                    const enfocables = [...caja.querySelectorAll('button, input')];
                    const primero = enfocables[0];
                    const ultimo = enfocables[enfocables.length - 1];
                    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
                    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
                }
            }

            fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(valorEscape); });
            document.addEventListener('keydown', alTeclear);
            document.body.style.overflow = 'hidden';
            document.body.append(fondo);

            const inicial = botones.findIndex(b => b.enfocar);
            elementos[inicial >= 0 ? inicial : 0].focus();
        });
    }

    function confirmar({ titulo = '¿Estás seguro?', mensaje = '', confirmar: textoOk = 'Aceptar', cancelar = 'Cancelar', peligro = false } = {}) {
        return ventana({
            tipo: peligro ? 'peligro' : 'pregunta',
            titulo,
            mensaje,
            valorEscape: false,
            botones: [
                { texto: cancelar, valor: false, enfocar: peligro }, 
                { texto: textoOk, valor: true, principal: true, peligro, enfocar: !peligro }
            ]
        });
    }

    function mensaje({ titulo = 'Aviso', mensaje: texto = '', boton = 'Entendido', tipo = 'info' } = {}) {
        return ventana({
            tipo,
            titulo,
            mensaje: texto,
            valorEscape: true,
            botones: [{ texto: boton, valor: true, principal: true, enfocar: true }]
        });
    }

    function copiable(titulo, valor) {
        const extra = crear('div', 'alerta-copiable');
        const campo = crear('input');
        campo.type = 'text';
        campo.readOnly = true;
        campo.value = valor;
        campo.setAttribute('aria-label', titulo);

        const copiar = crear('button', 'alerta-btn', 'Copiar');
        copiar.type = 'button';
        copiar.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(valor);
                copiar.textContent = '¡Copiado!';
            } catch {
                campo.select();
                copiar.textContent = 'Copia con Ctrl+C';
            }
        });
        extra.append(campo, copiar);

        setTimeout(() => { campo.focus(); campo.select(); }, 40);

        return ventana({
            tipo: 'info',
            titulo,
            valorEscape: true,
            extra,
            botones: [{ texto: 'Cerrar', valor: true, principal: true }]
        });
    }

    // Avisos que deja sesion.js antes de cambiar de página ("Tu sesión venció", etc.).
    document.addEventListener('DOMContentLoaded', () => {
        let aviso = null;
        try {
            aviso = sessionStorage.getItem('avisoSesion');
            sessionStorage.removeItem('avisoSesion');
        } catch { }
        if (aviso) toast('info', aviso, 6000);
    });

    return {
        exito: (m, ms = 3500) => toast('exito', m, ms),
        error: (m, ms = 7000) => toast('error', m, ms),
        info: (m, ms = 5000) => toast('info', m, ms),
        aviso: (m, ms = 5000) => toast('aviso', m, ms),
        confirmar,
        mensaje,
        copiable
    };
})();