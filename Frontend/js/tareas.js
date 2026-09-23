const ESTADOS_TAREA = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada' };
const PRIORIDADES_TAREA = { baja: 'Baja', media: 'Media', alta: 'Alta' };

let tareasActuales = [];
let tareasContexto = { categorias: [], resumen: null };
let tareaEditandoId = null;
let filtroTareas = 'todas'; 

async function cargarTareas() {
    const cont = document.getElementById('pestana-tareas');
    try {
        const [tareas, categorias, resumen] = await Promise.all([
            api(`/api/tareas/evento/${eventoId}`),
            obtenerCategorias(),
            api(`/api/eventos/${eventoId}/presupuesto`)
        ]);
        tareasActuales = tareas;
        tareasContexto = { categorias, resumen };
        tareaEditandoId = null;
        renderizarTareas();
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<p class="momentos-vacio">No se pudieron cargar las tareas. Recarga la página e intenta de nuevo.</p>';
    }
}

function ordenarTareas(lista) {
    const tiempo = t => (t.fechaLimite ? new Date(t.fechaLimite).getTime() : Infinity);
    return [...lista].sort((a, b) => {
        const ca = a.estado === 'completada';
        const cb = b.estado === 'completada';
        if (ca !== cb) return ca ? 1 : -1;
        const ta = tiempo(a);
        const tb = tiempo(b);
        if (ta === tb) return 0;
        return ta < tb ? -1 : 1;
    });
}

function renderizarTareas() {
    const cont = document.getElementById('pestana-tareas');
    const { categorias, resumen } = tareasContexto;
    const editando = tareasActuales.find(t => t._id === tareaEditandoId) || null;

    const valores = {
        nombre: editando?.nombre || '',
        categoria: editando?.categoria || '',
        monto: editando?.monto ?? 0,
        prioridad: editando?.prioridad || 'media',
        fechaLimite: fechaParaInput(editando?.fechaLimite),
        descripcion: editando?.descripcion || ''
    };

  
    const fechaMinima = FECHA_MINIMA_INPUT;

    const hechas = tareasActuales.filter(t => t.estado === 'completada').length;
    const total = tareasActuales.length;
    const porcentaje = total > 0 ? (hechas / total) * 100 : 0;

    const visibles = ordenarTareas(tareasActuales).filter(t => {
        if (filtroTareas === 'pendientes') return t.estado !== 'completada';
        if (filtroTareas === 'completadas') return t.estado === 'completada';
        return true;
    });

    const boton = (clave, texto) =>
        `<button type="button" class="filtro ${filtroTareas === clave ? 'activo' : ''}" data-filtro="${clave}">${texto}</button>`;

    cont.innerHTML = `
        <div class="seccion">
            <h2 class="seccion-titulo">Tareas</h2>
            <p class="seccion-sub">Lo que hay que hacer para el evento. Si una tarea tiene monto y la marcas como completada, se registra sola como gasto.</p>

            ${htmlResumenPresupuesto(resumen)}

            <form id="formTarea" class="form-seccion" novalidate>
                <div id="erroresTarea" class="lista-errores campo-ancho"></div>

                <label class="campo-ancho">Nombre
                    <input type="text" id="tareaNombre" required maxlength="100" placeholder="Ej: Comprar el ramo de la novia" value="${escapar(valores.nombre)}">
                </label>
                <label>Categoría
                    <select id="tareaCategoria" required>
                        <option value="">Elige una categoría</option>
                        ${opcionesCategorias(categorias, valores.categoria)}
                    </select>
                </label>
                <label>Monto (opcional)
                    <input type="number" id="tareaMonto" min="0" max="${MONTO_MAXIMO}" step="1" inputmode="numeric" value="${valores.monto}">
                    <small>Déjalo en 0 si no cuesta nada.</small>
                </label>
                <label>Prioridad
                    <select id="tareaPrioridad">
                        ${Object.entries(PRIORIDADES_TAREA).map(([v, t]) =>
                            `<option value="${v}" ${v === valores.prioridad ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </label>
                <label>Fecha límite
                    <input type="date" id="tareaFecha" min="${fechaMinima}" max="${FECHA_MAXIMA_INPUT}" value="${valores.fechaLimite}">
                </label>
                <label class="campo-ancho">Notas
                    <input type="text" id="tareaDescripcion" maxlength="300" placeholder="Opcional" value="${escapar(valores.descripcion)}">
                </label>
                <div class="form-acciones campo-ancho">
                    <button type="submit" class="btn-guardar">${editando ? 'Guardar cambios' : 'Agregar tarea'}</button>
                    ${editando ? '<button type="button" class="btn-secundario" id="btnCancelarTarea">Cancelar</button>' : ''}
                </div>
            </form>

            ${total > 0 ? `
                <div class="progreso-tareas">
                    <p class="progreso-texto">${hechas} de ${total} tareas completadas</p>
                    <div class="barra"><div class="barra-llena" style="width: ${porcentaje}%"></div></div>
                </div>
                <div class="filtros">
                    ${boton('todas', 'Todas')}
                    ${boton('pendientes', 'Pendientes')}
                    ${boton('completadas', 'Completadas')}
                </div>` : ''}

            <div class="lista-filas">
                ${total === 0
                    ? '<p class="momentos-vacio">Todavía no hay tareas. Agrega la primera arriba.</p>'
                    : visibles.length === 0
                        ? '<p class="momentos-vacio">No hay tareas en este filtro.</p>'
                        : visibles.map(filaTarea).join('')}
            </div>
        </div>
    `;

    soloPositivos(document.getElementById('tareaMonto'));
    document.getElementById('formTarea').addEventListener('submit', guardarTarea);

    const cancelar = document.getElementById('btnCancelarTarea');
    if (cancelar) cancelar.addEventListener('click', () => { tareaEditandoId = null; renderizarTareas(); });

    cont.querySelectorAll('.filtro').forEach(btn => {
        btn.addEventListener('click', () => { filtroTareas = btn.dataset.filtro; renderizarTareas(); });
    });

    cont.querySelectorAll('.select-estado').forEach(sel => {
        sel.addEventListener('change', () => cambiarEstadoTarea(sel.dataset.id, sel.value));
    });

    cont.querySelectorAll('.btn-editar-tarea').forEach(btn => {
        btn.addEventListener('click', () => {
            tareaEditandoId = btn.dataset.id;
            renderizarTareas();
            irAlFormulario('formTarea');
        });
    });

    cont.querySelectorAll('.btn-eliminar-tarea').forEach(btn => {
        btn.addEventListener('click', () => eliminarTarea(btn.dataset.id));
    });
}

function filaTarea(t) {
    const completada = t.estado === 'completada';
    const vencida = !completada && t.fechaLimite && fechaParaInput(t.fechaLimite) < hoyLocal();

    return `
        <div class="fila tarea-fila ${completada ? 'completada' : ''}">
            <div class="fila-info">
                <strong class="fila-titulo">${escapar(t.nombre)}</strong>
                <div class="fila-meta">
                    <span class="badge">${escapar(t.categoria)}</span>
                    <span class="badge badge-${escapar(t.prioridad)}">${escapar(PRIORIDADES_TAREA[t.prioridad] || '')}</span>
                    <span>${t.monto > 0 ? formatearMoneda(t.monto) : 'Sin costo'}</span>
                    ${t.fechaLimite ? `<span class="${vencida ? 'texto-vencida' : ''}">${vencida ? 'Venció el ' : 'Para el '}${formatearFecha(t.fechaLimite)}</span>` : ''}
                    ${completada && t.monto > 0 ? '<span class="badge badge-suave">Registrada como gasto</span>' : ''}
                </div>
                ${t.descripcion ? `<span class="fila-nota">${escapar(t.descripcion)}</span>` : ''}
            </div>
            <div class="fila-derecha">
                <select class="select-estado" data-id="${escapar(t._id)}" aria-label="Estado de la tarea">
                    ${Object.entries(ESTADOS_TAREA).map(([v, texto]) =>
                        `<option value="${v}" ${v === t.estado ? 'selected' : ''}>${texto}</option>`).join('')}
                </select>
                <button type="button" class="btn-mini btn-editar-tarea" data-id="${escapar(t._id)}">Editar</button>
                <button type="button" class="btn-mini btn-mini-peligro btn-eliminar-tarea" data-id="${escapar(t._id)}">Eliminar</button>
            </div>
        </div>
    `;
}

function validarTarea({ nombre, categoria, monto, prioridad, fecha, descripcion }, editando) {
    const errores = [];

    if (!nombre) errores.push('El nombre es obligatorio');
    else if (nombre.length > 100) errores.push('El nombre no puede superar los 100 caracteres');

    if (!categoria) errores.push('Elige una categoría');
    else if (!tareasContexto.categorias.includes(categoria)) errores.push('La categoría no es válida');

    const errorDeMonto = errorMonto(monto, { obligatorio: false, permitirCero: true });
    if (errorDeMonto) errores.push(errorDeMonto);

    if (!Object.keys(PRIORIDADES_TAREA).includes(prioridad)) errores.push('La prioridad no es válida');

    if (fecha) {
        if (!fechaInputValida(fecha)) {
            errores.push('La fecha límite no es válida');
        } else if (fecha < FECHA_MINIMA_INPUT || fecha > FECHA_MAXIMA_INPUT) {
            errores.push('La fecha límite debe estar entre los años 2000 y 2100');
        } 
    }

    if (descripcion.length > 300) errores.push('Las notas no pueden superar los 300 caracteres');

    return errores;
}


async function confirmarFechaTarea(fecha) {
    if (!fecha || !eventoInfo || !eventoInfo.fecha) return true;
    if (fecha <= fechaParaInput(eventoInfo.fecha)) return true;
    return Alerta.confirmar({
        titulo: 'Fecha después del evento',
        mensaje: 'La fecha límite es después del día del evento. ¿Es a propósito?',
        confirmar: 'Sí, es a propósito',
        cancelar: 'Cambiarla'
    });
}

async function guardarTarea(e) {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById('tareaNombre').value.trim(),
        categoria: document.getElementById('tareaCategoria').value,
        monto: document.getElementById('tareaMonto').value,
        prioridad: document.getElementById('tareaPrioridad').value,
        fecha: document.getElementById('tareaFecha').value,
        descripcion: document.getElementById('tareaDescripcion').value.trim()
    };

    const editando = tareasActuales.find(t => t._id === tareaEditandoId) || null;

    const errores = validarTarea(datos, editando);
    mostrarErrores('erroresTarea', errores);
    if (errores.length > 0) return;

    if (!(await confirmarFechaTarea(datos.fecha))) return;

    const cuerpo = {
        nombre: datos.nombre,
        categoria: datos.categoria,
        monto: datos.monto === '' ? 0 : Number(datos.monto),
        prioridad: datos.prioridad,
        fechaLimite: fechaDesdeInput(datos.fecha),
        descripcion: datos.descripcion
    };

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        if (tareaEditandoId) {
            await api(`/api/tareas/${tareaEditandoId}`, { method: 'PUT', body: cuerpo });
        } else {
            await api(`/api/tareas/evento/${eventoId}`, { method: 'POST', body: cuerpo });
        }
        Alerta.exito(tareaEditandoId ? 'Cambios guardados' : 'Tarea agregada');
        cargarTareas();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresTarea', erroresDeApi(error));
        boton.disabled = false;
    }
}

async function cambiarEstadoTarea(id, estado) {
    if (!Object.keys(ESTADOS_TAREA).includes(estado)) {
        cargarTareas();
        return;
    }

    const tarea = tareasActuales.find(t => t._id === id);
    const { resumen } = tareasContexto;
    if (tarea && estado === 'completada' && tarea.estado !== 'completada' && tarea.monto > 0 &&
        resumen && resumen.tienePresupuesto && resumen.gastado + tarea.monto > resumen.presupuesto) {
        const exceso = resumen.gastado + tarea.monto - resumen.presupuesto;
        const seguir = await Alerta.confirmar({
            titulo: 'Te pasas del presupuesto',
            mensaje: `Al completarla se registrará un gasto de ${formatearMoneda(tarea.monto)} y te pasarás del presupuesto por ${formatearMoneda(exceso)}. ¿Continuar?`,
            confirmar: 'Continuar',
            cancelar: 'Cancelar'
        });
        if (!seguir) {
            cargarTareas();
            return;
        }
    }

    try {
        await api(`/api/tareas/${id}/estado`, { method: 'PATCH', body: { estado } });
        cargarTareas();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
        cargarTareas();
    }
}

async function eliminarTarea(id) {
    const confirmado = await Alerta.confirmar({
        titulo: 'Eliminar tarea',
        mensaje: '¿Eliminar esta tarea? Si ya se registró como gasto, el gasto se conserva.',
        confirmar: 'Eliminar',
        peligro: true
    });
    if (!confirmado) return;

    try {
        await api(`/api/tareas/${id}`, { method: 'DELETE' });
        Alerta.exito('Tarea eliminada');
        cargarTareas();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}