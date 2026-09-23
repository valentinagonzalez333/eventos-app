let mesasActuales = [];
let invitadosParaMesas = [];
let mesaEditandoId = null;

const MAX_SILLAS_MESA = 50; 

function sillasDe(invitado) {
    if (invitado.estado === 'rechazado') return 0;
    const acompanantes = invitado.estado === 'confirmado'
        ? (invitado.acompanantesConfirmados || []).length
        : (invitado.numeroAcompanantes || 0);
    return 1 + acompanantes;
}

function textoSillas(n) {
    return `${n} ${n === 1 ? 'silla' : 'sillas'}`;
}

function sillasOcupadas(mesa) {
    return mesa.invitados.reduce((total, inv) => total + sillasDe(inv), 0);
}

async function cargarMesas() {
    const cont = document.getElementById('pestana-mesas');
    try {
        const [mesas, invitados] = await Promise.all([
            api(`/api/mesas/evento/${eventoId}`),
            api(`/api/invitados/evento/${eventoId}`)
        ]);
        mesasActuales = mesas;
        invitadosParaMesas = invitados;
        mesaEditandoId = null;
        renderizarMesas();
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<p class="momentos-vacio">No se pudieron cargar las mesas. Recarga la página e intenta de nuevo.</p>';
    }
}

function renderizarMesas() {
    const cont = document.getElementById('pestana-mesas');
    const editando = mesasActuales.find(m => m._id === mesaEditandoId) || null;

    const ubicados = new Set(mesasActuales.flatMap(m => m.invitados.map(i => i._id)));
    const sinUbicar = invitadosParaMesas
        .filter(i => !ubicados.has(i._id) && i.estado !== 'rechazado')
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const sillasTotales = mesasActuales.reduce((t, m) => t + m.capacidad, 0);
    const sillasUsadas = mesasActuales.reduce((t, m) => t + sillasOcupadas(m), 0);
    const porUbicar = sinUbicar.reduce((t, i) => t + sillasDe(i), 0);
    const faltan = porUbicar - (sillasTotales - sillasUsadas);

    // Al editar, no se puede bajar de las sillas que ya están ocupadas.
    const minimoSillas = editando ? Math.max(1, sillasOcupadas(editando)) : 1;

    cont.innerHTML = `
        <div class="seccion">
            <h2 class="seccion-titulo">Mesas</h2>
            <p class="seccion-sub">Crea las mesas con su número de sillas y ve ubicando invitados. Cada invitado ocupa una silla más las de sus acompañantes.</p>

            <div class="resumen-tira">
                <div class="resumen-item">
                    <span>Sillas en total</span>
                    <strong>${sillasTotales}</strong>
                </div>
                <div class="resumen-item">
                    <span>Sillas ocupadas</span>
                    <strong>${sillasUsadas}</strong>
                </div>
                <div class="resumen-item ${faltan > 0 ? 'excedida' : 'destacada'}">
                    <span>Por ubicar (${sinUbicar.length} ${sinUbicar.length === 1 ? 'invitado' : 'invitados'})</span>
                    <strong>${textoSillas(porUbicar)}</strong>
                </div>
            </div>
            ${faltan > 0 ? `<p class="aviso-presupuesto grave">No alcanzan las sillas: te faltan ${textoSillas(faltan)} para ubicar a todos.</p>` : ''}

            <form id="formMesa" class="form-seccion" novalidate>
                <div id="erroresMesa" class="lista-errores campo-ancho"></div>

                <label>Identificador
                    <input type="text" id="mesaNombre" required maxlength="50" placeholder="Ej: Mesa 1" value="${escapar(editando?.nombre || '')}">
                </label>
                <label>Número de sillas
                    <input type="number" id="mesaCapacidad" min="${minimoSillas}" max="${MAX_SILLAS_MESA}" step="1" inputmode="numeric" required value="${editando?.capacidad ?? 8}">
                </label>
                <label class="campo-ancho">Descripción
                    <input type="text" id="mesaDescripcion" maxlength="150" placeholder="Ej: Familia de la novia, cerca de la pista" value="${escapar(editando?.descripcion || '')}">
                </label>
                <div class="form-acciones campo-ancho">
                    <button type="submit" class="btn-guardar">${editando ? 'Guardar cambios' : 'Crear mesa'}</button>
                    ${editando ? '<button type="button" class="btn-secundario" id="btnCancelarMesa">Cancelar</button>' : ''}
                </div>
            </form>

            ${mesasActuales.length === 0
                ? '<p class="momentos-vacio">Todavía no hay mesas. Crea la primera arriba.</p>'
                : `<div class="grid-mesas">${mesasActuales.map(m => tarjetaMesa(m, sinUbicar)).join('')}</div>`}

            ${sinUbicar.length > 0 ? `
                <div class="sin-ubicar">
                    <h3>Invitados sin mesa</h3>
                    <div class="chips">
                        ${sinUbicar.map(i => `<span class="chip">${escapar(i.nombre)} <strong>${textoSillas(sillasDe(i))}</strong></span>`).join('')}
                    </div>
                </div>` : ''}
        </div>
    `;

    soloPositivos(document.getElementById('mesaCapacidad'));
    document.getElementById('formMesa').addEventListener('submit', guardarMesa);

    const cancelar = document.getElementById('btnCancelarMesa');
    if (cancelar) cancelar.addEventListener('click', () => { mesaEditandoId = null; renderizarMesas(); });

    cont.querySelectorAll('.btn-editar-mesa').forEach(btn => {
        btn.addEventListener('click', () => {
            mesaEditandoId = btn.dataset.id;
            renderizarMesas();
            irAlFormulario('formMesa');
        });
    });

    cont.querySelectorAll('.btn-eliminar-mesa').forEach(btn => {
        btn.addEventListener('click', () => eliminarMesa(btn.dataset.id));
    });

    cont.querySelectorAll('.btn-agregar-a-mesa').forEach(btn => {
        btn.addEventListener('click', () => {
            const seleccionado = btn.closest('.mesa-agregar').querySelector('select').value;
            if (!seleccionado) {
                Alerta.aviso('Elige el invitado que quieres ubicar en esta mesa');
                return;
            }
            agregarInvitadoAMesa(btn.dataset.id, seleccionado);
        });
    });

    cont.querySelectorAll('.btn-quitar-de-mesa').forEach(btn => {
        btn.addEventListener('click', () => quitarInvitadoDeMesa(btn.dataset.mesa, btn.dataset.invitado));
    });
}

function tarjetaMesa(mesa, sinUbicar) {
    const ocupadas = sillasOcupadas(mesa);
    const libres = mesa.capacidad - ocupadas;
    const excedida = libres < 0;
    const porcentaje = Math.min((ocupadas / mesa.capacidad) * 100, 100);

    const opciones = sinUbicar.map(i => {
        const n = sillasDe(i);
        return `<option value="${escapar(i._id)}" ${n > libres ? 'disabled' : ''}>${escapar(i.nombre)} (${textoSillas(n)})</option>`;
    }).join('');

    return `
        <article class="mesa-card ${excedida ? 'excedida' : ''}">
            <div class="mesa-cabecera">
                <h4>${escapar(mesa.nombre)}</h4>
                <span class="mesa-cupo">${ocupadas} de ${mesa.capacidad} sillas</span>
            </div>
            ${mesa.descripcion ? `<p class="mesa-desc">${escapar(mesa.descripcion)}</p>` : ''}
            <div class="barra"><div class="barra-llena" style="width: ${porcentaje}%"></div></div>
            ${excedida ? '<p class="mesa-alerta">Esta mesa quedó con más gente que sillas. Cambia las sillas o quita a alguien.</p>' : ''}

            ${mesa.invitados.length === 0
                ? '<p class="mesa-vacia">Sin invitados todavía.</p>'
                : `<ul class="mesa-invitados">
                    ${mesa.invitados.map(i => `
                        <li>
                            <span>${escapar(i.nombre)} <span class="mesa-sillas">${textoSillas(sillasDe(i))}</span></span>
                            <button type="button" class="btn-mini btn-quitar-de-mesa" data-mesa="${escapar(mesa._id)}" data-invitado="${escapar(i._id)}">Quitar</button>
                        </li>`).join('')}
                   </ul>`}

            ${sinUbicar.length > 0 ? `
                <div class="mesa-agregar">
                    <select aria-label="Invitado para ${escapar(mesa.nombre)}">
                        <option value="">Agregar invitado</option>
                        ${opciones}
                    </select>
                    <button type="button" class="btn-mini btn-mini-morado btn-agregar-a-mesa" data-id="${escapar(mesa._id)}">Agregar</button>
                </div>` : ''}

            <div class="acciones-tarjeta">
                <button type="button" class="btn-mini btn-editar-mesa" data-id="${escapar(mesa._id)}">Editar</button>
                <button type="button" class="btn-mini btn-mini-peligro btn-eliminar-mesa" data-id="${escapar(mesa._id)}">Eliminar</button>
            </div>
        </article>
    `;
}


function validarMesa({ nombre, capacidad, descripcion }) {
    const errores = [];
    const editando = mesasActuales.find(m => m._id === mesaEditandoId) || null;

    if (!nombre) {
        errores.push('El identificador de la mesa es obligatorio');
    } else if (nombre.length > 50) {
        errores.push('El identificador no puede superar los 50 caracteres');
    } else if (mesasActuales.some(m => m._id !== mesaEditandoId && mismoTexto(m.nombre, nombre))) {
        errores.push('Ya hay una mesa con ese identificador');
    }

    if (capacidad === '') {
        errores.push('El número de sillas es obligatorio');
    } else {
        const n = Number(capacidad);
        if (!Number.isInteger(n)) errores.push('El número de sillas debe ser un número entero');
        else if (n < 1) errores.push('La mesa debe tener al menos 1 silla');
        else if (n > MAX_SILLAS_MESA) errores.push(`Una mesa no puede tener más de ${MAX_SILLAS_MESA} sillas`);
        else if (editando && n < sillasOcupadas(editando)) {
            errores.push(`Ya hay ${sillasOcupadas(editando)} sillas ocupadas; no puedes dejar la mesa con ${n}`);
        }
    }

    if (descripcion.length > 150) errores.push('La descripción no puede superar los 150 caracteres');

    return errores;
}

async function guardarMesa(e) {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById('mesaNombre').value.trim(),
        capacidad: document.getElementById('mesaCapacidad').value,
        descripcion: document.getElementById('mesaDescripcion').value.trim()
    };

    const errores = validarMesa(datos);
    mostrarErrores('erroresMesa', errores);
    if (errores.length > 0) return;

    const cuerpo = {
        nombre: datos.nombre,
        capacidad: Number(datos.capacidad),
        descripcion: datos.descripcion
    };

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        if (mesaEditandoId) {
            await api(`/api/mesas/${mesaEditandoId}`, { method: 'PUT', body: cuerpo });
        } else {
            await api(`/api/mesas/evento/${eventoId}`, { method: 'POST', body: cuerpo });
        }
        Alerta.exito(mesaEditandoId ? 'Cambios guardados' : 'Mesa creada');
        cargarMesas();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresMesa', erroresDeApi(error));
        boton.disabled = false;
    }
}

async function eliminarMesa(id) {
    const confirmado = await Alerta.confirmar({
        titulo: 'Eliminar mesa',
        mensaje: 'Sus invitados quedarán sin ubicar.',
        confirmar: 'Eliminar',
        peligro: true
    });
    if (!confirmado) return;

    try {
        await api(`/api/mesas/${id}`, { method: 'DELETE' });
        Alerta.exito('Mesa eliminada');
        cargarMesas();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}

async function agregarInvitadoAMesa(mesaId, invitadoId) {
    try {
        await api(`/api/mesas/${mesaId}/invitados`, { method: 'POST', body: { invitadoId } });
        cargarMesas();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}

async function quitarInvitadoDeMesa(mesaId, invitadoId) {
    try {
        await api(`/api/mesas/${mesaId}/invitados/${invitadoId}`, { method: 'DELETE' });
        cargarMesas();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}