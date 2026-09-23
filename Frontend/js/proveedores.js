let proveedoresActuales = [];
let proveedorEditandoId = null;

async function cargarProveedores() {
    const cont = document.getElementById('pestana-proveedores');
    try {
        proveedoresActuales = await api(`/api/proveedores/evento/${eventoId}`);
        proveedorEditandoId = null;
        renderizarProveedores();
    } catch (error) {
        console.error(error);
        cont.innerHTML = '<p class="momentos-vacio">No se pudieron cargar los proveedores. Recarga la página e intenta de nuevo.</p>';
    }
}

function renderizarProveedores() {
    const cont = document.getElementById('pestana-proveedores');
    const editando = proveedoresActuales.find(p => p._id === proveedorEditandoId) || null;

    cont.innerHTML = `
        <div class="seccion">
            <h2 class="seccion-titulo">Proveedores</h2>
            <p class="seccion-sub">Las personas y negocios que trabajan en tu evento. Lo que les pagas se registra en Gastos, eligiéndolos ahí.</p>

            <form id="formProveedor" class="form-seccion" novalidate>
                <div id="erroresProveedor" class="lista-errores campo-ancho"></div>

                <label>Nombre
                    <input type="text" id="proveedorNombre" required maxlength="100" placeholder="Ej: Chef Andrés" value="${escapar(editando?.nombre || '')}">
                </label>
                <label>Servicio
                    <input type="text" id="proveedorServicio" maxlength="60" placeholder="Ej: Catering" value="${escapar(editando?.servicio || '')}">
                </label>
                <label class="campo-ancho">Contacto
                    <input type="text" id="proveedorContacto" maxlength="100" placeholder="Teléfono o correo" value="${escapar(editando?.contacto || '')}">
                </label>
                <div class="form-acciones campo-ancho">
                    <button type="submit" class="btn-guardar">${editando ? 'Guardar cambios' : 'Agregar proveedor'}</button>
                    ${editando ? '<button type="button" class="btn-secundario" id="btnCancelarProveedor">Cancelar</button>' : ''}
                </div>
            </form>

            ${proveedoresActuales.length === 0
                ? '<p class="momentos-vacio">Todavía no tienes proveedores. Agrégalos para poder asignarlos a tus gastos.</p>'
                : `<div class="grid-tarjetas">${proveedoresActuales.map(tarjetaProveedor).join('')}</div>`}
        </div>
    `;

    document.getElementById('formProveedor').addEventListener('submit', guardarProveedor);

    const cancelar = document.getElementById('btnCancelarProveedor');
    if (cancelar) cancelar.addEventListener('click', () => { proveedorEditandoId = null; renderizarProveedores(); });

    cont.querySelectorAll('.btn-editar-proveedor').forEach(btn => {
        btn.addEventListener('click', () => {
            proveedorEditandoId = btn.dataset.id;
            renderizarProveedores();
            irAlFormulario('formProveedor');
        });
    });

    cont.querySelectorAll('.btn-eliminar-proveedor').forEach(btn => {
        btn.addEventListener('click', () => eliminarProveedor(btn.dataset.id));
    });
}

function tarjetaProveedor(p) {
    return `
        <article class="tarjeta-prov">
            <div class="tarjeta-cabecera">
                <h4>${escapar(p.nombre)}</h4>
                ${p.servicio ? `<span class="badge">${escapar(p.servicio)}</span>` : ''}
            </div>
            <p class="tarjeta-detalle">${p.contacto ? escapar(p.contacto) : 'Sin contacto'}</p>
            <div class="tarjeta-total">
                <span>Total en gastos</span>
                <strong>${formatearMoneda(p.totalGastado)}</strong>
            </div>
            <div class="acciones-tarjeta">
                <button type="button" class="btn-mini btn-editar-proveedor" data-id="${escapar(p._id)}">Editar</button>
                <button type="button" class="btn-mini btn-mini-peligro btn-eliminar-proveedor" data-id="${escapar(p._id)}">Eliminar</button>
            </div>
        </article>
    `;
}

function validarProveedor({ nombre, servicio, contacto }) {
    const errores = [];

    if (!nombre) {
        errores.push('El nombre es obligatorio');
    } else if (nombre.length > 100) {
        errores.push('El nombre no puede superar los 100 caracteres');
    } else if (proveedoresActuales.some(p => p._id !== proveedorEditandoId && mismoTexto(p.nombre, nombre))) {
        errores.push('Ya tienes un proveedor con ese nombre');
    }

    if (servicio.length > 60) errores.push('El servicio no puede superar los 60 caracteres');

    if (contacto) {
        if (contacto.length > 100) {
            errores.push('El contacto no puede superar los 100 caracteres');
        } else if (!contactoValido(contacto)) {
            errores.push('El contacto debe ser un teléfono (7 a 15 dígitos) o un correo válido');
        }
    }

    return errores;
}

async function guardarProveedor(e) {
    e.preventDefault();

    const cuerpo = {
        nombre: document.getElementById('proveedorNombre').value.trim(),
        servicio: document.getElementById('proveedorServicio').value.trim(),
        contacto: document.getElementById('proveedorContacto').value.trim()
    };

    const errores = validarProveedor(cuerpo);
    mostrarErrores('erroresProveedor', errores);
    if (errores.length > 0) return;

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        if (proveedorEditandoId) {
            await api(`/api/proveedores/${proveedorEditandoId}`, { method: 'PUT', body: cuerpo });
        } else {
            await api(`/api/proveedores/evento/${eventoId}`, { method: 'POST', body: cuerpo });
        }
        Alerta.exito(proveedorEditandoId ? 'Cambios guardados' : 'Proveedor agregado');
        cargarProveedores();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresProveedor', erroresDeApi(error));
        boton.disabled = false;
    }
}

async function eliminarProveedor(id) {
    const confirmado = await Alerta.confirmar({
        titulo: 'Eliminar proveedor',
        mensaje: 'Sus gastos se conservan, solo pierden el proveedor.',
        confirmar: 'Eliminar',
        peligro: true
    });
    if (!confirmado) return;

    try {
        await api(`/api/proveedores/${id}`, { method: 'DELETE' });
        Alerta.exito('Proveedor eliminado');
        cargarProveedores();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}