const MAX_CHIPS_POR_DIA = 3;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

const calendarioGrid = document.getElementById('calendarioGrid');
const mesActualEl = document.getElementById('mesActual');
const btnMesAnterior = document.getElementById('btnMesAnterior');
const btnMesSiguiente = document.getElementById('btnMesSiguiente');
const btnHoy = document.getElementById('btnHoy');

const modalDia = document.getElementById('modalDia');
const btnCerrarModalDia = document.getElementById('btnCerrarModalDia');
const modalDiaFecha = document.getElementById('modalDiaFecha');
const modalDiaLista = document.getElementById('modalDiaLista');

let eventosPorDia = new Map();
let fechaVisible = new Date();
fechaVisible.setDate(1);

const hoy = new Date();



function claveDia(fecha) {
    return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

function esMismoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

async function cargarEventos() {
    try {
        const eventos = await api('/api/eventos');
        agruparPorDia(eventos);
        renderizarMes();
    } catch (error) {
        console.error(error);
        calendarioGrid.innerHTML = '<p class="calendario-cargando">No se pudo cargar tu calendario. Intenta de nuevo más tarde.</p>';
    }
}

function agruparPorDia(eventos) {
    eventosPorDia = new Map();

    eventos.forEach(evento => {
        if (!evento.fecha) return;
        const fecha = new Date(evento.fecha);
        if (isNaN(fecha)) return;

        const clave = claveDia(fecha);
        if (!eventosPorDia.has(clave)) eventosPorDia.set(clave, []);
        eventosPorDia.get(clave).push({ ...evento, _fecha: fecha });
    });

    eventosPorDia.forEach(lista => lista.sort((a, b) => a._fecha - b._fecha));
}

function renderizarMes() {
    const año = fechaVisible.getFullYear();
    const mes = fechaVisible.getMonth();

    mesActualEl.textContent = `${MESES[mes]} ${año}`;

    const primerDiaMes = new Date(año, mes, 1);
    const inicioSemana = (primerDiaMes.getDay() + 6) % 7; 
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const totalCeldas = Math.ceil((inicioSemana + diasEnMes) / 7) * 7;

    let html = '';

    for (let i = 0; i < totalCeldas; i++) {
        const numeroDia = i - inicioSemana + 1;
        const fechaCelda = new Date(año, mes, numeroDia);
        const fueraDeMes = fechaCelda.getMonth() !== mes;
        const esHoy = esMismoDia(fechaCelda, hoy);

        const clave = claveDia(fechaCelda);
        const eventosDelDia = eventosPorDia.get(clave) || [];

        const clases = ['dia-celda'];
        if (fueraDeMes) clases.push('fuera-mes');
        if (esHoy) clases.push('hoy');

        const chipsVisibles = eventosDelDia.slice(0, MAX_CHIPS_POR_DIA);
        const restantes = eventosDelDia.length - chipsVisibles.length;

        
        const chipsHtml = chipsVisibles.map(ev => `
            <a href="/detalle?id=${escapar(ev._id)}" class="evento-chip ${escapar(ev.estado || 'activo')}" data-chip="1">
                <strong>${escapar(ev.nombre)}</strong>${ev.lugar ? ' · ' + escapar(ev.lugar) : ''}
            </a>
        `).join('');

        const masHtml = restantes > 0
            ? `<button type="button" class="dia-mas">+${restantes} más</button>`
            : '';

        html += `
            <div class="${clases.join(' ')}" data-clave="${clave}">
                <span class="dia-numero">${fechaCelda.getDate()}</span>
                <div class="dia-eventos">${chipsHtml}${masHtml}</div>
            </div>
        `;
    }

    calendarioGrid.innerHTML = html;
}

calendarioGrid.addEventListener('click', (e) => {
    
    if (e.target.closest('[data-chip]')) return;

    const celda = e.target.closest('.dia-celda');
    if (!celda) return;

    const clave = celda.dataset.clave;
    const eventosDelDia = eventosPorDia.get(clave) || [];
    if (eventosDelDia.length === 0) return;

    abrirModalDia(eventosDelDia[0]._fecha, eventosDelDia);
});

function abrirModalDia(fecha, eventos) {
    modalDiaFecha.textContent = fecha.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    modalDiaLista.innerHTML = eventos.map(ev => {
        const hora = ev._fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        return `
            <a href="/detalle?id=${escapar(ev._id)}" class="modal-evento ${escapar(ev.estado || 'activo')}">
                <span class="modal-evento-hora">${escapar(hora)}</span>
                <span class="modal-evento-info">
                    <span class="modal-evento-nombre">${escapar(ev.nombre)}</span>
                    <span class="modal-evento-lugar">${escapar(ev.lugar || 'Sin lugar definido')}</span>
                </span>
            </a>
        `;
    }).join('');

    modalDia.classList.add('abierto');
}

btnCerrarModalDia.addEventListener('click', () => modalDia.classList.remove('abierto'));

modalDia.addEventListener('click', (e) => {
    if (e.target === modalDia) modalDia.classList.remove('abierto');
});

btnMesAnterior.addEventListener('click', () => {
    fechaVisible.setMonth(fechaVisible.getMonth() - 1);
    renderizarMes();
});

btnMesSiguiente.addEventListener('click', () => {
    fechaVisible.setMonth(fechaVisible.getMonth() + 1);
    renderizarMes();
});

btnHoy.addEventListener('click', () => {
    fechaVisible = new Date();
    fechaVisible.setDate(1);
    renderizarMes();
});

cargarEventos();