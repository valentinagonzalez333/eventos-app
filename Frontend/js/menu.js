
const elUsuario = document.getElementById('usuario');
const userRaw = localStorage.getItem('usuario');

if (elUsuario && userRaw) {
    try {
        const usuario = JSON.parse(userRaw);
        elUsuario.textContent = 'Tus eventos, ' + usuario.user;
    } catch (e) {
        console.error('No se pudo leer el usuario de localStorage:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ruta = window.location.pathname;
    const enlaces = document.querySelectorAll('.menu a');

    enlaces.forEach(enlace => {
        const href = enlace.getAttribute('href');

        if (enlace.textContent.trim() === 'Inicio') {
            if (ruta === '/' || ruta === '/panel') {
                enlace.classList.add('activo');
            }
            return;
        }

        if (ruta.startsWith(href)) {
            enlace.classList.add('activo');
        }
    });
});


const IDS_TARJETAS = ['totalEventos', 'eventosActivos', 'proximosEventos', 'eventosFinalizados'];

function mostrarCargando() {
    IDS_TARJETAS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('cargando');
    });
}

function mostrarError(mostrar) {
    const errorEl = document.getElementById('panelError');
    if (errorEl) errorEl.hidden = !mostrar;
}

function formatearFechaCorta(valor) {
    if (!valor) return 'Sin fecha';
    const fecha = new Date(valor);
    if (isNaN(fecha)) return 'Sin fecha';
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function textoDias(dias) {
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    return `${dias} días`;
}

function renderizarProximos(lista) {
    const contenedor = document.getElementById('listaProximos');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = '<p class="panel-proximos-vacio">No tienes eventos en los próximos 15 días.</p>';
        return;
    }

    contenedor.innerHTML = lista.map(ev => `
        <a href="/detalle?id=${ev._id}" class="proximo-card ${ev.diasRestantes <= 3 ? 'urgente' : ''}">
            <img src="${ev.imagen || '/assets/default.jpg'}" alt="" class="proximo-imagen">
            <div class="proximo-info">
                <span class="proximo-nombre">${ev.nombre}</span>
                <span class="proximo-meta">
                    <span>${formatearFechaCorta(ev.fecha)}</span>
                    ${ev.lugar ? `<span>· ${ev.lugar}</span>` : ''}
                </span>
            </div>
            <div class="proximo-dias">
                <strong>${ev.diasRestantes <= 1 ? '' : ev.diasRestantes}</strong>
                <span>${textoDias(ev.diasRestantes)}</span>
            </div>
        </a>
    `).join('');
}

async function cargarResumen() {
    const totalEventosEl = document.getElementById('totalEventos');
    if (!totalEventosEl) return;

    const token = localStorage.getItem('token');
    mostrarError(false);
    mostrarCargando();

    try {
        const respuesta = await fetch('/api/panel/resumen', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) {
            throw new Error(`El servidor respondió con estado ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        document.getElementById('totalEventos').textContent = datos.totalEventos ?? 0;
        document.getElementById('eventosActivos').textContent = datos.eventosActivos ?? 0;
        document.getElementById('proximosEventos').textContent = datos.proximosEventos ?? 0;
        document.getElementById('eventosFinalizados').textContent = datos.eventosFinalizados ?? 0;

        renderizarProximos(datos.proximosDetalle);
    } catch (error) {
        console.error('Error al cargar el resumen del panel:', error);
        IDS_TARJETAS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '–';
        });
        mostrarError(true);
    } finally {
        IDS_TARJETAS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('cargando');
        });
    }
}

if (document.getElementById('totalEventos')) {
    cargarResumen();

    const btnReintentar = document.getElementById('reintentar');
    if (btnReintentar) {
        btnReintentar.addEventListener('click', cargarResumen);
    }
}