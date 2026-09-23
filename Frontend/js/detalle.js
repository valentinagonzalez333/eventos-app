const eventoId = new URLSearchParams(window.location.search).get('id');
const nombreEvento = document.getElementById('nombreEvento');
const btnVolver = document.getElementById('btnVolver');
const menuItems = document.querySelectorAll('.menu-item');

let eventoInfo = null;
let modoEdicionInfo = false;

const cargadores = { invitaciones: cargarModuloInvitaciones };
const recargables = {
    info: cargarEvento,
    gastos: cargarGastos,
    tareas: cargarTareas,
    proveedores: cargarProveedores,
    mesas: cargarMesas
};
const pestanasCargadas = new Set();

const MAX_IMAGEN_MB = 5;

function activarPestana(pestana) {
    menuItems.forEach(i => i.classList.toggle('activo', i.dataset.pestana === pestana));
    document.querySelectorAll('.pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(`pestana-${pestana}`).classList.add('activa');

    if (recargables[pestana]) {
        recargables[pestana]();
    } else if (cargadores[pestana]) {
        if (!pestanasCargadas.has(pestana)) {
            pestanasCargadas.add(pestana);
            cargadores[pestana]();
        } else if (pestana === 'invitaciones') {

            actualizarDatosEventoEnDiseno();
        }
    }
}

menuItems.forEach(item => {
    item.addEventListener('click', () => activarPestana(item.dataset.pestana));
});

btnVolver.addEventListener('click', () => {
    window.location.href = '/eventos';
});

function validarImagen(archivo) {
    if (!archivo.type.startsWith('image/')) return 'El archivo debe ser una imagen';
    if (archivo.size > MAX_IMAGEN_MB * 1024 * 1024) return `La imagen no puede pesar más de ${MAX_IMAGEN_MB} MB`;
    return null;
}



async function cargarEvento() {
    try {

        const [evento, presupuesto, invitados] = await Promise.all([
            api(`/api/eventos/${eventoId}`),
            api(`/api/eventos/${eventoId}/presupuesto`).catch(() => null),
            api(`/api/invitados/evento/${eventoId}`).catch(() => [])
        ]);

        eventoInfo = evento;
        nombreEvento.textContent = evento.nombre;
        renderizarInfo(evento, presupuesto, invitados);
    } catch (error) {
        console.error(error);

        if (error.status === 400 || error.status === 404) {
            Alerta.error('No encontramos ese evento en tu cuenta.');
            setTimeout(() => window.location.replace('/eventos'), 1500);
        } else {
            Alerta.error('No se pudo cargar el evento. Intenta de nuevo.');
        }
    }
}

function contarInvitados(invitados) {
    return {
        total: invitados.length,
        confirmados: invitados.filter(i => i.estado === 'confirmado').length,
        pendientes: invitados.filter(i => i.estado === 'pendiente').length,
        acompanantes: invitados.reduce((suma, i) => suma + (i.numeroAcompanantes || 0), 0)
    };
}

function renderizarInfo(evento, presupuesto, invitados) {
    const pestana = document.getElementById('pestana-info');

    if (modoEdicionInfo) {
        pestana.innerHTML = plantillaFormularioInfo(evento);
        prepararFormularioInfo();
        return;
    }

    const conteo = contarInvitados(invitados);

    pestana.innerHTML = `
        <div class="info-header">
            <button type="button" class="btn-mini btn-mini-morado" id="btnEditarInfo">Editar información</button>
        </div>

        <div class="info-basica">
            <div class="info-titulo">
                <h1>${escapar(evento.nombre)}</h1>
                <p class="info-descripcion">${escapar(evento.descripcion || 'Sin descripción')}</p>
            </div>

            <img src="${escapar(evento.imagen || '/assets/default.jpg')}" alt="${escapar(evento.nombre)}" class="info-imagen">

            <dl class="info-datos">
                <div class="info-dato"><dt>Fecha y hora</dt><dd>${formatearFechaHora(evento.fecha)}</dd></div>
                <div class="info-dato"><dt>Lugar</dt><dd>${escapar(evento.lugar || 'Sin lugar')}</dd></div>
                <div class="info-dato"><dt>Estado</dt><dd><span class="estado ${evento.vencido ? 'inactivo' : ''}">${evento.vencido ? 'Inactivo' : escapar(evento.estado || 'activo')}</span></dd></div>
                <div class="info-dato"><dt>Creado</dt><dd>${formatearFecha(evento.createAt)}</dd></div>
            </dl>

            <div class="tablero-presupuesto">
                <h3>Presupuesto</h3>
                ${presupuesto ? htmlResumenPresupuesto(presupuesto) : '<p class="nota-presupuesto">No se pudo cargar el presupuesto.</p>'}
            </div>
        </div>

        <div class="cards-resumen">
            <div class="card-resumen"><span>Invitados</span><strong>${conteo.total}</strong></div>
            <div class="card-resumen"><span>Confirmados</span><strong>${conteo.confirmados}</strong></div>
            <div class="card-resumen"><span>Pendientes</span><strong>${conteo.pendientes}</strong></div>
            <div class="card-resumen"><span>Acompañantes</span><strong>${conteo.acompanantes}</strong></div>
        </div>
    `;

    document.getElementById('btnEditarInfo').addEventListener('click', () => {
        modoEdicionInfo = true;
        renderizarInfo(evento, presupuesto, invitados);
    });
}

function plantillaFormularioInfo(evento) {
    return `
        <div class="info-header">
            <button type="button" class="btn-mini" id="btnCancelarEdicionInfo">← Cancelar</button>
        </div>

        <form id="formInfoEvento" class="form-info-evento" novalidate>
            <div id="erroresInfo" class="lista-errores"></div>

            <div class="form-info-layout">
                <div class="form-info-imagen">
                    <div class="preview-portada" id="previewInfoImagen">
                        ${evento.imagen ? `<img src="${escapar(evento.imagen)}" alt="Imagen actual">` : '<span>Sin imagen todavía</span>'}
                    </div>
                    <label class="btn-cambiar-imagen">
                        Cambiar foto
                        <input type="file" id="infoImagen" accept="image/*" hidden>
                    </label>
                </div>

                <div class="form-info-campos">
                    <label class="campo-doble">Nombre
                        <input type="text" id="infoNombre" value="${escapar(evento.nombre)}" maxlength="100" required>
                    </label>

                    <label>Estado
                        <select id="infoEstado">
                            <option value="activo" ${evento.estado === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="finalizado" ${evento.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                            <option value="cancelado" ${evento.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </label>

                    <label class="campo-full">Descripción
                        <textarea id="infoDescripcion" maxlength="500" rows="2">${evento.descripcion && evento.descripcion !== 'Sin especificar' ? escapar(evento.descripcion) : ''}</textarea>
                    </label>

                    <label>Fecha y hora
                        <input type="datetime-local" id="infoFecha" value="${fechaHoraParaInput(evento.fecha)}" required>
                        <small class="ayuda-campo">También se muestra en la invitación.</small>
                    </label>

                    <label>Lugar
                        <input type="text" id="infoLugar" value="${evento.lugar && evento.lugar !== 'Sin especificar' ? escapar(evento.lugar) : ''}" maxlength="150">
                        <small class="ayuda-campo">También se muestra en la invitación.</small>
                    </label>

                    <label>Presupuesto
                        <input type="number" id="infoPresupuesto" min="0" max="${MONTO_MAXIMO}" step="1" inputmode="numeric" value="${evento.presupuesto || 0}">
                    </label>

                    <div class="form-info-acciones-full">
                        <button type="submit" class="btn-guardar">Guardar cambios</button>
                    </div>
                </div>
            </div>
        </form>
    `;
}

function prepararFormularioInfo() {
    document.getElementById('btnCancelarEdicionInfo').addEventListener('click', () => {
        modoEdicionInfo = false;
        cargarEvento();
    });

    soloPositivos(document.getElementById('infoPresupuesto'));

    document.getElementById('infoImagen').addEventListener('change', (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const error = validarImagen(archivo);
        if (error) {
            e.target.value = '';
            mostrarErrores('erroresInfo', [error]);
            return;
        }

        mostrarErrores('erroresInfo', []);
        document.getElementById('previewInfoImagen').innerHTML =
            `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">`;
    });

    document.getElementById('formInfoEvento').addEventListener('submit', guardarInfoEvento);
}

function validarInfoEvento({ nombre, fecha, lugar, descripcion, presupuesto }) {
    const errores = [];

    if (!nombre.trim()) errores.push('El nombre es obligatorio');
    else if (nombre.trim().length > 100) errores.push('El nombre no puede superar los 100 caracteres');

    if (!fecha || isNaN(new Date(fecha).getTime())) errores.push('La fecha es obligatoria y debe ser válida');
    else if (fecha < '2000-01-01' || fecha > '2100-12-31T23:59') errores.push('La fecha debe estar entre los años 2000 y 2100');

    if (lugar.length > 150) errores.push('El lugar no puede superar los 150 caracteres');
    if (descripcion.length > 500) errores.push('La descripción no puede superar los 500 caracteres');

    const errorDePresupuesto = errorMonto(presupuesto, { obligatorio: false, permitirCero: true, etiqueta: 'El presupuesto' });
    if (errorDePresupuesto) errores.push(errorDePresupuesto);

    return errores;
}

async function guardarInfoEvento(e) {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById('infoNombre').value,
        descripcion: document.getElementById('infoDescripcion').value,
        fecha: document.getElementById('infoFecha').value,
        lugar: document.getElementById('infoLugar').value,
        presupuesto: document.getElementById('infoPresupuesto').value,
        estado: document.getElementById('infoEstado').value
    };

    const archivo = document.getElementById('infoImagen').files[0];

    const errores = validarInfoEvento(datos);
    if (archivo) {
        const errorImagen = validarImagen(archivo);
        if (errorImagen) errores.push(errorImagen);
    }

    mostrarErrores('erroresInfo', errores);
    if (errores.length > 0) return;

    const formData = new FormData();
    formData.append('nombre', datos.nombre.trim());
    formData.append('descripcion', datos.descripcion.trim());
    formData.append('fecha', new Date(datos.fecha).toISOString());
    formData.append('lugar', datos.lugar.trim());
    formData.append('presupuesto', datos.presupuesto || 0);
    formData.append('estado', datos.estado);
    if (archivo) formData.append('imagen', archivo);

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        await apiForm(`/api/eventos/${eventoId}`, { method: 'PUT', formData });
        Alerta.exito('Cambios guardados');
        modoEdicionInfo = false;
        cargarEvento();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresInfo', erroresDeApi(error));
        boton.disabled = false;
    }
}


// Invitaciones: sub-tabs "Diseño" e "Invitados"

let disenoActual = { color: '#5b2a86', fotoPortada: '', frase: '', momentos: [] };
let invitadosActuales = [];

function cargarModuloInvitaciones() {
    const contenedor = document.getElementById('pestana-invitaciones');

    contenedor.innerHTML = `
        <div class="subtabs">
            <button class="subtab-item activo" data-subtab="diseno">Diseño</button>
            <button class="subtab-item" data-subtab="invitados">Invitados</button>
        </div>
        <div id="subtab-diseno" class="subtab-contenido activa"></div>
        <div id="subtab-invitados" class="subtab-contenido"></div>
    `;

    contenedor.querySelectorAll('.subtab-item').forEach(btn => {
        btn.addEventListener('click', () => {
            contenedor.querySelectorAll('.subtab-item').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            contenedor.querySelectorAll('.subtab-contenido').forEach(c => c.classList.remove('activa'));
            document.getElementById(`subtab-${btn.dataset.subtab}`).classList.add('activa');
        });
    });

    cargarDiseno();
    cargarInvitados();
}


async function cargarDiseno() {
    try {
        disenoActual = await api(`/api/disenoinvitacion/evento/${eventoId}`);
        if (!disenoActual.momentos) disenoActual.momentos = [];
        renderizarFormDiseno();
    } catch (error) {
        console.error(error);
        document.getElementById('subtab-diseno').innerHTML = '<p>Error al cargar el diseño.</p>';
    }
}

function textoLugarEvento() {
    const lugar = eventoInfo && eventoInfo.lugar;
    return lugar && lugar !== 'Sin especificar' ? lugar : 'Sin lugar definido';
}

function actualizarDatosEventoEnDiseno() {
    const fecha = document.getElementById('disenoFechaTexto');
    const lugar = document.getElementById('disenoLugarTexto');
    if (!fecha || !lugar) return;

    fecha.textContent = eventoInfo ? formatearFechaHora(eventoInfo.fecha) : 'Cargando…';
    lugar.textContent = eventoInfo ? textoLugarEvento() : 'Cargando…';
}

function renderizarFormDiseno() {
    const cont = document.getElementById('subtab-diseno');

    cont.innerHTML = `
        <form id="formDiseno" class="form-diseno" novalidate>
            <div id="erroresDiseno" class="lista-errores"></div>

            <div class="diseno-layout">
                <div class="diseno-imagen">
                    <div class="preview-portada" id="previewPortada">
                        ${disenoActual.fotoPortada ? `<img src="${escapar(disenoActual.fotoPortada)}" alt="Portada actual">` : '<span>Sin foto todavía</span>'}
                    </div>
                    <label class="btn-cambiar-imagen">
                        Cambiar foto
                        <input type="file" id="disenoFoto" accept="image/*" hidden>
                    </label>
                    <label class="campo-color">Color principal
                        <input type="color" id="disenoColor" value="${escapar(disenoActual.color || '#5b2a86')}">
                    </label>
                </div>

                <div class="diseno-campos">
                    <label class="campo-full">Frase
                        <textarea id="disenoFrase" rows="3" maxlength="500" placeholder="Con la bendición de Dios y nuestros padres...">${escapar(disenoActual.frase || '')}</textarea>
                    </label>

                    <div class="dato-bloqueado">
                        <span class="dato-bloqueado-etiqueta">Fecha y hora</span>
                        <strong id="disenoFechaTexto"></strong>
                    </div>

                    <div class="dato-bloqueado">
                        <span class="dato-bloqueado-etiqueta">Lugar</span>
                        <strong id="disenoLugarTexto"></strong>
                    </div>

                    <p class="ayuda-campo">
                        La fecha y el lugar salen de la información del evento.
                        <button type="button" class="enlace-boton" id="btnEditarDatosEvento">Cambiarlos en Info básica</button>
                    </p>

                    <div class="diseno-acciones">
                        <button type="button" class="btn-mini" id="btnVistaPrevia">Vista previa</button>
                        <button type="submit" class="btn-guardar">Guardar diseño</button>
                    </div>
                </div>
            </div>

            <div class="diseno-momentos-card">
                <div class="momentos-header">
                    <h4>Momentos del evento</h4>
                    <button type="button" class="btn-mini" id="btnAgregarMomento">+ Agregar</button>
                </div>
                <div id="listaMomentos" class="lista-momentos-horizontal"></div>
            </div>
        </form>
    `;

    actualizarDatosEventoEnDiseno();
    renderizarMomentos();

    document.getElementById('btnAgregarMomento').addEventListener('click', () => {
        disenoActual.momentos.push({ hora: '', descripcion: '' });
        renderizarMomentos();
    });

    document.getElementById('btnEditarDatosEvento').addEventListener('click', () => {
        modoEdicionInfo = true;
        activarPestana('info');
    });

    document.getElementById('btnVistaPrevia').addEventListener('click', () => {
        if (typeof abrirVistaPrevia === 'function') abrirVistaPrevia();
        else Alerta.error('Falta cargar /js/vistaPrevia.js en detalle.html');
    });

    document.getElementById('disenoFoto').addEventListener('change', (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const error = validarImagen(archivo);
        if (error) {
            e.target.value = '';
            mostrarErrores('erroresDiseno', [error]);
            return;
        }

        mostrarErrores('erroresDiseno', []);
        document.getElementById('previewPortada').innerHTML =
            `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">`;
    });

    document.getElementById('formDiseno').addEventListener('submit', guardarDiseno);
}

function renderizarMomentos() {
    const lista = document.getElementById('listaMomentos');

    if (disenoActual.momentos.length === 0) {
        lista.innerHTML = '<p class="momentos-vacio">Sin momentos agregados todavía.</p>';
        return;
    }

    lista.innerHTML = disenoActual.momentos.map((m, i) => `
        <div class="momento-fila" data-index="${i}">
            <input type="text" class="momento-hora" placeholder="4:00 PM" maxlength="20" value="${escapar(m.hora || '')}">
            <input type="text" class="momento-desc" placeholder="Ceremonia" maxlength="100" value="${escapar(m.descripcion || '')}">
            <button type="button" class="btn-quitar-momento" title="Quitar">&times;</button>
        </div>
    `).join('');

    lista.querySelectorAll('.momento-fila').forEach(fila => {
        const i = Number(fila.dataset.index);

        fila.querySelector('.momento-hora').addEventListener('input', (e) => {
            disenoActual.momentos[i].hora = e.target.value;
        });
        fila.querySelector('.momento-desc').addEventListener('input', (e) => {
            disenoActual.momentos[i].descripcion = e.target.value;
        });
        fila.querySelector('.btn-quitar-momento').addEventListener('click', () => {
            disenoActual.momentos.splice(i, 1);
            renderizarMomentos();
        });
    });
}



function momentosLimpios() {
    return disenoActual.momentos
        .map(m => ({ hora: (m.hora || '').trim(), descripcion: (m.descripcion || '').trim() }))
        .filter(m => m.hora || m.descripcion);
}

function validarDiseno(frase, archivo) {
    const errores = [];

    if (frase.length > 500) errores.push('La frase no puede superar los 500 caracteres');
    if (disenoActual.momentos.length > 20) errores.push('Solo puedes agregar hasta 20 momentos');

    momentosLimpios().forEach((m, i) => {
        if (!m.hora || !m.descripcion) errores.push(`El momento ${i + 1} necesita hora y descripción`);
    });

    if (archivo) {
        const errorImagen = validarImagen(archivo);
        if (errorImagen) errores.push(errorImagen);
    }

    return errores;
}

async function guardarDiseno(e) {
    e.preventDefault();

    const frase = document.getElementById('disenoFrase').value.trim();
    const inputFoto = document.getElementById('disenoFoto');
    const archivo = inputFoto.files[0];

    const errores = validarDiseno(frase, archivo);
    mostrarErrores('erroresDiseno', errores);
    if (errores.length > 0) return;


    const formData = new FormData();
    formData.append('color', document.getElementById('disenoColor').value);
    formData.append('frase', frase);
    formData.append('momentos', JSON.stringify(momentosLimpios()));
    if (archivo) formData.append('fotoPortada', archivo);

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        disenoActual = await apiForm(`/api/disenoinvitacion/evento/${eventoId}`, { method: 'PUT', formData });
        if (!disenoActual.momentos) disenoActual.momentos = [];
        inputFoto.value = '';
        renderizarMomentos();
        Alerta.exito('Diseño guardado');
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresDiseno', erroresDeApi(error));
    } finally {
        boton.disabled = false;
    }
}




async function cargarInvitados() {
    try {
        invitadosActuales = await api(`/api/invitados/evento/${eventoId}`);
        renderizarInvitados();
    } catch (error) {
        console.error(error);
        document.getElementById('subtab-invitados').innerHTML = '<p>Error al cargar los invitados.</p>';
    }
}

function renderizarInvitados() {
    const cont = document.getElementById('subtab-invitados');

    cont.innerHTML = `
        <form id="formInvitado" class="form-invitado" novalidate>
    <div id="erroresInvitado" class="lista-errores"></div>

    <label class="campo-invitado">
        <span>Nombre</span>
        <input type="text" id="invitadoNombre" placeholder="Nombre del invitado" maxlength="100" required>
    </label>

    <label class="campo-invitado">
        <span>Email (opcional)</span>
        <input type="email" id="invitadoEmail" placeholder="correo@ejemplo.com" maxlength="100">
    </label>

    <label class="campo-invitado campo-invitado-chico">
        <span>N.º de acompañantes que puede llevar</span>
        <input type="number" id="invitadoAcompanantes" min="0" max="${MAX_ACOMPANANTES}" step="1" inputmode="numeric" value="0">
    </label>

    <label class="campo-invitado">
        <span>Restricciones alimentarias (opcional)</span>
        <input type="text" id="invitadoRestricciones" placeholder="Ej: vegetariano, alérgico al maní" maxlength="200">
    </label>

    <label class="campo-invitado">
        <span>Observaciones (opcional)</span>
        <input type="text" id="invitadoObservaciones" placeholder="Cualquier nota extra" maxlength="200">
    </label>

    <button type="submit" class="btn-mini btn-mini-morado">+ Agregar invitado</button>
</form>

        <div class="lista-invitados">
            ${invitadosActuales.length === 0
            ? '<p class="momentos-vacio">Todavía no has agregado invitados.</p>'
            : invitadosActuales.map(filaInvitado).join('')}
        </div>
    `;

    soloPositivos(document.getElementById('invitadoAcompanantes'));
    document.getElementById('formInvitado').addEventListener('submit', crearInvitado);

    cont.querySelectorAll('.btn-copiar-link').forEach(btn => {
        btn.addEventListener('click', async () => {
            const link = `${window.location.origin}/invitacion/${btn.dataset.token}`;
            try {
                await navigator.clipboard.writeText(link);
                btn.textContent = '¡Copiado!';
                setTimeout(() => { btn.textContent = 'Copiar link'; }, 1500);
            } catch (error) {
                Alerta.copiable('Copia este link', link);
            }
        });
    });

    cont.querySelectorAll('.btn-eliminar-invitado').forEach(btn => {
        btn.addEventListener('click', () => eliminarInvitado(btn.dataset.id));
    });
}

function filaInvitado(inv) {
    const clasesEstado = {
        pendiente: 'estado-pendiente',
        confirmado: 'estado-confirmado',
        rechazado: 'estado-rechazado'
    };

    const yaRespondio = inv.estado !== 'pendiente';

    let bloqueAcompanantes;
    if (!yaRespondio) {
        bloqueAcompanantes = `<span class="invitado-detalle">Puede llevar ${inv.numeroAcompanantes || 0} acompañante(s) · Sin respuesta todavía</span>`;
    } else if (inv.estado === 'rechazado') {
        bloqueAcompanantes = `<span class="invitado-detalle">No asistirá</span>`;
    } else {
        const nombres = inv.acompanantesConfirmados || [];
        bloqueAcompanantes = nombres.length > 0
            ? `<span class="invitado-detalle">Acompañantes: ${nombres.map(escapar).join(', ')}</span>`
            : `<span class="invitado-detalle">Sin acompañantes</span>`;
    }

    const restricciones = inv.restriccionesAlimentarias
        ? `<span class="invitado-detalle invitado-alergia">🍽️ ${escapar(inv.restriccionesAlimentarias)}</span>`
        : '';

    const observaciones = inv.observaciones
        ? `<span class="invitado-detalle">📝 ${escapar(inv.observaciones)}</span>`
        : '';

    return `
        <div class="invitado-fila">
            <div class="invitado-info">
                <strong>${escapar(inv.nombre)}</strong>
                <span class="invitado-meta">
                    <span class="badge-estado ${clasesEstado[inv.estado] || ''}">${escapar(inv.estado)}</span>
                </span>
                ${bloqueAcompanantes}
                ${restricciones}
                ${observaciones}
            </div>
            <div class="invitado-acciones">
                <button type="button" class="btn-mini btn-copiar-link" data-token="${escapar(inv.token)}">Copiar link</button>
                <button type="button" class="btn-mini btn-eliminar-invitado" data-id="${escapar(inv._id)}">Eliminar</button>
            </div>
        </div>
    `;
}

function validarInvitado({ nombre, email, numeroAcompanantes, restriccionesAlimentarias, observaciones }) {
    const errores = [];

    if (!nombre) errores.push('El nombre es obligatorio');
    else if (nombre.length > 100) errores.push('El nombre no puede superar los 100 caracteres');

    if (email) {
        if (email.length > 100) {
            errores.push('El email no puede superar los 100 caracteres');
        } else if (!REGEX_EMAIL.test(email)) {
            errores.push('El email no es válido');
        } else if (invitadosActuales.some(i => (i.email || '').toLowerCase() === email.toLowerCase())) {
            errores.push('Ya hay un invitado con ese email');
        }
    }

    if (!Number.isInteger(numeroAcompanantes) || numeroAcompanantes < 0) {
        errores.push('Los acompañantes deben ser un número entero mayor o igual a 0');
    } else if (numeroAcompanantes > MAX_ACOMPANANTES) {
        errores.push(`Un invitado no puede llevar más de ${MAX_ACOMPANANTES} acompañantes`);
    }

    if (restriccionesAlimentarias.length > 200) errores.push('Las restricciones alimentarias no pueden superar los 200 caracteres');
    if (observaciones.length > 200) errores.push('Las observaciones no pueden superar los 200 caracteres');

    return errores;
}

async function crearInvitado(e) {
    e.preventDefault();

    const cuerpo = {
        nombre: document.getElementById('invitadoNombre').value.trim(),
        email: document.getElementById('invitadoEmail').value.trim(),
        numeroAcompanantes: Number(document.getElementById('invitadoAcompanantes').value),
        restriccionesAlimentarias: document.getElementById('invitadoRestricciones').value.trim(),
        observaciones: document.getElementById('invitadoObservaciones').value.trim()
    };

    const errores = validarInvitado(cuerpo);
    mostrarErrores('erroresInvitado', errores);
    if (errores.length > 0) return;

    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        await api(`/api/invitados/evento/${eventoId}`, { method: 'POST', body: cuerpo });
        Alerta.exito('Invitado agregado');
        cargarInvitados();
    } catch (error) {
        console.error(error);
        mostrarErrores('erroresInvitado', erroresDeApi(error));
        boton.disabled = false;
    }
}

async function eliminarInvitado(id) {
    const invitado = invitadosActuales.find(i => i._id === id);
    const confirmado = await Alerta.confirmar({
        titulo: 'Eliminar invitado',
        mensaje: `¿Quieres eliminar a ${invitado ? invitado.nombre : 'este invitado'}? También se quitará de su mesa y su link dejará de funcionar.`,
        confirmar: 'Eliminar',
        peligro: true
    });
    if (!confirmado) return;

    try {
        await api(`/api/invitados/${id}`, { method: 'DELETE' });
        Alerta.exito('Invitado eliminado');
        cargarInvitados();
    } catch (error) {
        console.error(error);
        Alerta.error(erroresDeApi(error));
    }
}

if (!eventoId) {
    window.location.replace('/eventos');
} else {
    cargarEvento();
}