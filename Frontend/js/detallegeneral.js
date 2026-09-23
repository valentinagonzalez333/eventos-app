function escapar(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


async function pedir(url, opciones) {
    const respuesta = await fetch(url, opciones);
    const datos = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 401) Sesion.expirar();

    if (!respuesta.ok) {
        const error = new Error(datos.mensaje || 'Ocurrió un error');
        error.status = respuesta.status;
        error.errores = Array.isArray(datos.errores) ? datos.errores : null;
        throw error;
    }
    return datos;
}

async function api(url, { method = 'GET', body } = {}) {
    const headers = { 'Authorization': `Bearer ${Sesion.token()}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return pedir(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
}


async function apiForm(url, { method = 'POST', formData }) {
    return pedir(url, { method, headers: { 'Authorization': `Bearer ${Sesion.token()}` }, body: formData });
}

let categoriasCache = null;
async function obtenerCategorias() {
    if (!categoriasCache) categoriasCache = await api('/api/categorias');
    return categoriasCache;
}

function opcionesCategorias(lista, seleccionada = '') {
    return lista
        .map(c => `<option value="${escapar(c)}" ${c === seleccionada ? 'selected' : ''}>${escapar(c)}</option>`)
        .join('');
}


function fechaDesdeInput(valor) {
    return valor ? new Date(`${valor}T12:00:00`).toISOString() : null;
}

function fechaParaInput(valor) {
    if (!valor) return '';
    const f = new Date(valor);
    if (isNaN(f)) return '';
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const dia = String(f.getDate()).padStart(2, '0');
    return `${f.getFullYear()}-${mes}-${dia}`;
}

function hoyLocal() {
    return fechaParaInput(new Date());
}


function irAlFormulario(idFormulario) {
    const form = document.getElementById(idFormulario);
    if (!form) return;
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    form.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
    const primero = form.querySelector('input, select, textarea');
    if (primero) primero.focus({ preventScroll: true });
}


function htmlResumenPresupuesto(r) {
    const etiqueta = r.tienePresupuesto ? 'Disponible' : 'Proyectado';
    const valor = r.tienePresupuesto ? r.disponible : r.proyectado;

    let aviso = '';
    if (r.excedido) {
        aviso = `<p class="aviso-presupuesto grave">Ya superaste el presupuesto por ${formatearMoneda(r.gastado - r.presupuesto)}.</p>`;
    } else if (r.excederiaConPendientes) {
        aviso = `<p class="aviso-presupuesto">Si gastas lo que tienen las tareas pendientes, te pasarías del presupuesto.</p>`;
    }

    return `
        <div class="resumen-tira">
            <div class="resumen-item">
                <span>Gastado</span>
                <strong>${formatearMoneda(r.gastado)}</strong>
            </div>
            <div class="resumen-item">
                <span>Por gastar en tareas</span>
                <strong>${formatearMoneda(r.estimadoPendiente)}</strong>
            </div>
            <div class="resumen-item ${r.excedido ? 'excedida' : 'destacada'}">
                <span>${etiqueta}</span>
                <strong>${formatearMoneda(valor)}</strong>
            </div>
        </div>
        ${aviso}
    `;
}

function formatearFecha(valor) {
    if (!valor) return 'Sin fecha';
    const fecha = new Date(valor);
    if (isNaN(fecha)) return 'Sin fecha';
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
}

function fechaHoraParaInput(valor) {
    if (!valor) return '';
    const f = new Date(valor);
    if (isNaN(f)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(f.getHours())}:${p(f.getMinutes())}`;
}

function formatearFechaHora(valor) {
    if (!valor) return 'Sin fecha';
    const f = new Date(valor);
    if (isNaN(f)) return 'Sin fecha';
    return f.toLocaleString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}




const MONTO_MAXIMO = 1e12;               
const FECHA_MINIMA_INPUT = '2000-01-01';
const FECHA_MAXIMA_INPUT = '2100-12-31';
const MAX_ACOMPANANTES = 20;            
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;



function mostrarErrores(idContenedor, errores) {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    if (!errores || errores.length === 0) {
        cont.innerHTML = '';
        return;
    }
    cont.innerHTML = `<ul>${errores.map(err => `<li>${escapar(err)}</li>`).join('')}</ul>`;
    cont.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


function erroresDeApi(error) {
    return error.errores && error.errores.length ? error.errores : [error.message || 'Ocurrió un error'];
}



function errorMonto(valor, { obligatorio = true, permitirCero = false, etiqueta = 'El monto' } = {}) {
    if (valor === '' || valor === null || valor === undefined) {
        return obligatorio ? `${etiqueta} es obligatorio` : null;
    }
    const n = Number(valor);
    if (!Number.isFinite(n)) return `${etiqueta} debe ser un número`;
    if (!Number.isInteger(n)) return `${etiqueta} debe ser un número entero, sin decimales`;
    if (n < 0) return `${etiqueta} no puede ser negativo`;
    if (n === 0 && !permitirCero) return `${etiqueta} debe ser mayor a 0`;
    if (n > MONTO_MAXIMO) return `${etiqueta} no puede superar ${formatearMoneda(MONTO_MAXIMO)}`;
    return null;
}

// 'YYYY-MM-DD' que exista de verdad (rechaza 2026-02-30).
function fechaInputValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return false;
    const [a, m, d] = valor.split('-').map(Number);
    const f = new Date(a, m - 1, d);
    return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d;
}

// Ignora mayúsculas, tildes y espacios de los bordes 
function mismoTexto(a, b) {
    return String(a).trim().localeCompare(String(b).trim(), 'es', { sensitivity: 'base' }) === 0;
}

// Teléfono (7 a 15 dígitos, con + espacios ( ) - .) o correo.
function contactoValido(contacto) {
    if (REGEX_EMAIL.test(contacto)) return true;
    if (!/^[+\d\s().-]+$/.test(contacto)) return false;
    const digitos = contacto.replace(/\D/g, '').length;
    return digitos >= 7 && digitos <= 15;
}

// Impide teclear "-", "+", "e", "." y "," en un input numérico y pegar cosas que no sean dígitos.
function soloPositivos(input) {
    if (!input) return;
    const prohibidas = ['-', '+', 'e', 'E', '.', ','];
    input.addEventListener('keydown', (e) => {
        if (prohibidas.includes(e.key)) e.preventDefault();
    });
    input.addEventListener('paste', (e) => {
        const pegado = (e.clipboardData || window.clipboardData).getData('text');
        if (!/^\d+$/.test(pegado.trim())) e.preventDefault();
    });
}