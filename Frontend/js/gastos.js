let gastosActuales = [];
let gastosContexto = { categorias: [], proveedores: [], resumen: null };
let gastoEditandoId = null;

async function cargarGastos() {
    const cont = document.getElementById('pestana-gastos');
    try {
        const [gastos, proveedores, categorias, resumen] = await Promise.all([
            api(`/api/gastos/evento/${eventoId}`),
            api(`/api/proveedores/evento/${eventoId}`),
            obtenerCategorias(),
            api(`/api/eventos/${eventoId}/presupuesto`)
        ]);
        gastosActuales = gastos;
        gastosContexto = { categorias, proveedores, resumen };
        gastoEditandoId = null;
        renderizarGastos();
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<p class="momentos-vacio">No se pudieron cargar los gastos. Recarga la página e intenta de nuevo.</p>';
    }
}

function renderizarGastos() {
    const cont = document.getElementById('pestana-gastos');
    const { categorias, proveedores, resumen } = gastosContexto;
    const editando = gastosActuales.find(g => g._id === gastoEditandoId) || null;

    const valores = {
        categoria: editando?.categoria || '',
        monto: editando?.monto ?? '',
        descripcion: editando?.descripcion || '',
        proveedorId: editando?.proveedorId?._id || '',
        fecha: fechaParaInput(editando?.fecha) || hoyLocal()
    };

    const chips = resumen.porCategoria.length
        ? `<div class="chips">${resumen.porCategoria.map(c =>
            `<span class="chip">${escapar(c.categoria)} <strong>${formatearMoneda(c.monto)}</strong></span>`).join('')}</div>`
        : '';

    cont.innerHTML = `
        <div class="seccion">
            <h2 class="seccion-titulo">Gastos</h2>
            <p class="seccion-sub">Todo lo que ya se pagó del evento. Las tareas completadas que tienen monto aparecen aquí solas.</p>

            ${htmlResumenPresupuesto(resumen)}
            ${chips}

            <form id="formGasto" class="form-seccion" novalidate>
                <div id="erroresGasto" class="lista-errores campo-ancho"></div>

                <label>Categoría
                    <select id="gastoCategoria" required>
                        <option value="">Elige una categoría</option>
                        ${opcionesCategorias(categorias, valores.categoria)}
                    </select>
                </label>
                <label>Monto
                    <input type="number" id="gastoMonto" min="1" max="${MONTO_MAXIMO}" step="1" inputmode="numeric" required value="${valores.monto}">
                </label>
                <label class="campo-ancho">Descripción
                    <input type="text" id="gastoDescripcion" maxlength="200" placeholder="Ej: Alquiler del salón" value="${escapar(valores.descripcion)}">
                </label>
                <label>Proveedor (opcional)
                    <select id="gastoProveedor">
                        <option value="">Sin proveedor</option>
                        ${proveedores.map(p => `<option value="${escapar(p._id)}" ${p._id === valores.proveedorId ? 'selected' : ''}>${escapar(p.nombre)}</option>`).join('')}
                    </select>
                </label>
                <label>Fecha
    <input type="date" id="gastoFecha" required min="${FECHA_MINIMA_INPUT}" max="${fechaParaInput(eventoInfo?.fecha) || FECHA_MAXIMA_INPUT}" value="${valores.fecha}">
</label>
                <div class="form-acciones campo-ancho">
                    <button type="submit" class="btn-guardar">${editando ? 'Guardar cambios' : 'Agregar gasto'}</button>
                    ${editando ? '<button type="button" class="btn-secundario" id="btnCancelarGasto">Cancelar</button>' : ''}
                </div>
            </form>

            <div class="lista-filas">
                ${gastosActuales.length === 0
            ? '<p class="momentos-vacio">Todavía no hay gastos. Registra el primero arriba.</p>'
            : gastosActuales.map(filaGasto).join('')}
            </div>
        </div>
    `;

    soloPositivos(document.getElementById('gastoMonto'));
    document.getElementById('formGasto').addEventListener('submit', guardarGasto);

    const cancelar = document.getElementById('btnCancelarGasto');
    if (cancelar) cancelar.addEventListener('click', () => { gastoEditandoId = null; renderizarGastos(); });

    cont.querySelectorAll('.btn-editar-gasto').forEach(btn => {
        btn.addEventListener('click', () => {
            gastoEditandoId = btn.dataset.id;
            renderizarGastos();
            irAlFormulario('formGasto');
        });
    });

    cont.querySelectorAll('.btn-eliminar-gasto').forEach(btn => {
        btn.addEventListener('click', () => eliminarGasto(btn.dataset.id));
    });
}

function filaGasto(g) {
    const proveedor = g.proveedorId?.nombre;
    const deTarea = Boolean(g.tareaId);

    return `
        <div class="fila">
            <div class="fila-info">
                <strong class="fila-titulo">${escapar(g.descripcion || g.categoria)}</strong>
                <div class="fila-meta">
                    <span class="badge">${escapar(g.categoria)}</span>
                    ${proveedor ? `<span>${escapar(proveedor)}</span>` : ''}
                    <span>${formatearFecha(g.fecha)}</span>
                    ${deTarea ? '<span class="badge badge-suave">Viene de una tarea</span>' : ''}
                </div>
            </div>
            <div class="fila-derecha">
                <span class="fila-monto">${formatearMoneda(g.monto)}</span>
                ${deTarea ? '' : `
                    <button type="button" class="btn-mini btn-editar-gasto" data-id="${escapar(g._id)}">Editar</button>
                    <button type="button" class="btn-mini btn-mini-peligro btn-eliminar-gasto" data-id="${escapar(g._id)}">Eliminar</button>`}
            </div>
        </div>
    `;
}

function validarGasto({ categoria, monto, descripcion, proveedorId, fecha }) {
    const errores = [];

    if (!categoria) errores.push('Elige una categoría');
    else if (!gastosContexto.categorias.includes(categoria)) errores.push('La categoría no es válida');

    const errorDeMonto = errorMonto(monto);
    if (errorDeMonto) errores.push(errorDeMonto);

    if (descripcion.length > 200) errores.push('La descripción no puede superar los 200 caracteres');

    if (proveedorId && !gastosContexto.proveedores.some(p => p._id === proveedorId)) {
        errores.push('El proveedor elegido ya no existe. Cambia de pestaña y vuelve a intentar');
    }

    if (!fecha) errores.push('La fecha es obligatoria');
    else if (!fechaInputValida(fecha)) errores.push('La fecha no es válida');
    else if (fecha < FECHA_MINIMA_INPUT) errores.push('La fecha no puede ser anterior al año 2000');
    else if (eventoInfo?.fecha && fecha > fechaParaInput(eventoInfo.fecha)) {
        errores.push('La fecha no puede ser posterior a la fecha del evento');
    }
}



async function confirmarPresupuestoGasto(monto) {
    const { resumen } = gastosContexto;
    if (!resumen || !resumen.tienePresupuesto) return true;

    const anterior = gastosActuales.find(g => g._id === gastoEditandoId)?.monto || 0;
    const totalNuevo = resumen.gastado - anterior + monto;

    if (totalNuevo <= resumen.presupuesto || totalNuevo <= resumen.gastado) return true;
    return Alerta.confirmar({
        titulo: 'Te pasas del presupuesto',
        mensaje: `Con este gasto te pasas del presupuesto por ${formatearMoneda(totalNuevo - resumen.presupuesto)}. ¿Registrarlo de todos modos?`,
        confirmar: 'Registrarlo',
        cancelar: 'Revisar'
    });
}

async function guardarGasto(e) {
    e.preventDefault();

    const datos = {
        categoria: document.getElementById('gastoCategoria').value,
        monto: document.getElementById('gastoMonto').value,
        descripcion: document.getElementById('gastoDescripcion').value.trim(),
        proveedorId: document.getElementById('gastoProveedor').value,
        fecha: document.getElementById('gastoFecha').value
    };

    const errores = validarGasto(datos);
    mostrarErrores('erroresGasto', errores);
    if (errores.length > 0) return;

    const monto = Number(datos.monto);
    if (!(await confirmarPresupuestoGasto(monto))) return;

    const cuerpo = {
        categoria: datos.categoria,
        monto,
        descripcion: datos.descripcion,
        proveedorId: datos.proveedorId || null,
        fecha: fechaDesdeInput(datos.fecha)
    };

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        if (gastoEditandoId) {
            await api(`/api/gastos/${gastoEditandoId}`, { method: 'PUT', body: cuerpo });
        } else {
            await api(`/api/gastos/evento/${eventoId}`, { method: 'POST', body: cuerpo });
        }
        Alerta.exito(gastoEditandoId ? 'Cambios guardados' : 'Gasto agregado');
        cargarGastos();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresGasto', erroresDeApi(error));
        boton.disabled = false;
    }
}

async function eliminarGasto(id) {
    const confirmado = await Alerta.confirmar({
        titulo: 'Eliminar gasto',
        mensaje: '¿Seguro que quieres eliminar este gasto?',
        confirmar: 'Eliminar',
        peligro: true
    });
    if (!confirmado) return;

    try {
        await api(`/api/gastos/${id}`, { method: 'DELETE' });
        Alerta.exito('Gasto eliminado');
        cargarGastos();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}