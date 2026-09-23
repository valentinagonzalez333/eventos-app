const perfilVista = document.getElementById('perfilVista');
const formPerfil = document.getElementById('formPerfil');
const btnEditarPerfil = document.getElementById('btnEditarPerfil');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const mensajePerfil = document.getElementById('mensajePerfil');

const railUsuario = document.getElementById('railUsuario');
const railRol = document.getElementById('railRol');

const verUsuario = document.getElementById('verUsuario');
const verCorreo = document.getElementById('verCorreo');
const verRolAcceso = document.getElementById('verRolAcceso');

const editUsuario = document.getElementById('editUsuario');
const passActual = document.getElementById('passActual');
const passNueva = document.getElementById('passNueva');
const passConfirmar = document.getElementById('passConfirmar');

let perfilActual = null;



async function cargarPerfil() {
    try {
        perfilActual = await api('/api/usuarios/perfil');
        renderizarVista(perfilActual);
    } catch (error) {
        console.error(error);
        verUsuario.textContent = 'Error al cargar';
        railUsuario.textContent = 'Error al cargar';
    }
}

function renderizarVista(usuario) {
    verUsuario.textContent = usuario.user;
    verCorreo.textContent = usuario.correo;
    verRolAcceso.textContent = usuario.rol;
    editUsuario.value = usuario.user;

    railUsuario.textContent = usuario.user;
    railRol.textContent = usuario.rol;
}

btnEditarPerfil.addEventListener('click', () => {
    limpiarMensaje();
    perfilVista.classList.add('oculto');
    formPerfil.classList.add('activo');
});

btnCancelarEdicion.addEventListener('click', () => {
    formPerfil.reset();
    if (perfilActual) editUsuario.value = perfilActual.user;
    limpiarMensaje();
    formPerfil.classList.remove('activo');
    perfilVista.classList.remove('oculto');
});



function validarPerfil(nuevoUsuario, quiereCambiarPass, actual, nueva, confirmar) {
    if (!nuevoUsuario) return 'El nombre de usuario es obligatorio';
    if (nuevoUsuario.length < 3) return 'El nombre de usuario debe tener al menos 3 caracteres';
    if (nuevoUsuario.length > 30) return 'El nombre de usuario no puede superar los 30 caracteres';

    if (quiereCambiarPass) {
        if (!actual) return 'Ingresa tu contraseña actual para cambiarla';
        if (!nueva) return 'Ingresa la nueva contraseña';
        if (nueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
        if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return 'La nueva contraseña debe tener letras y números';
        if (nueva !== confirmar) return 'La nueva contraseña no coincide con la confirmación';
    }
    return null;
}

formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarMensaje();

    const nuevoUsuario = editUsuario.value.trim();
    const quiereCambiarPass = Boolean(passNueva.value || passConfirmar.value || passActual.value);

    const error = validarPerfil(nuevoUsuario, quiereCambiarPass, passActual.value, passNueva.value, passConfirmar.value);
    if (error) return mostrarMensaje(error, 'error');

    const cuerpo = { user: nuevoUsuario };
    if (quiereCambiarPass) {
        cuerpo.pass = passActual.value;
        cuerpo.nuevaPass = passNueva.value;
    }

    const boton = formPerfil.querySelector('.btn-guardar');
    boton.disabled = true;

    try {
        await api('/api/usuarios', { method: 'PUT', body: cuerpo });

        mostrarMensaje('Perfil actualizado con éxito', 'exito');
        passActual.value = '';
        passNueva.value = '';
        passConfirmar.value = '';

        perfilActual = { ...perfilActual, user: nuevoUsuario };
        renderizarVista(perfilActual);

        setTimeout(() => {
            formPerfil.classList.remove('activo');
            perfilVista.classList.remove('oculto');
            limpiarMensaje();
        }, 900);

    } catch (error) {
        console.error(error);
        mostrarMensaje(erroresDeApi(error).join('. '), 'error');
    } finally {
        boton.disabled = false;
    }
});

function mostrarMensaje(texto, tipo) {
    mensajePerfil.textContent = texto;
    mensajePerfil.className = `mensaje ${tipo}`;
}

function limpiarMensaje() {
    mensajePerfil.textContent = '';
    mensajePerfil.className = 'mensaje';
}





const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');

        const tab = btn.dataset.tab;
        document.querySelectorAll('[data-panel]').forEach(panel => {
            panel.hidden = panel.dataset.panel !== tab;
        });
    });
});




const btnCerrarSesion = document.getElementById('btnCerrarSesion');

btnCerrarSesion.addEventListener('click', async () => {
 

    const confirmado = await Alerta.confirmar({
        titulo: 'Cerrar sesión',
        mensaje: '¿Seguro que quieres salir de tu cuenta?',
        confirmar: 'Cerrar sesión'
    });
    if (!confirmado) return;

    localStorage.removeItem('usuario');
    Sesion.cerrar(); 
});




const eventosLista = document.getElementById('eventosLista');
const eventosContador = document.getElementById('eventosContador');

const ETIQUETAS_ESTADO = {
    activo: 'Activo',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    inactivo: 'Inactivo'
};

async function cargarEventosUsuario() {
    try {
        const eventos = await api('/api/eventos');
        renderizarEventos(eventos);
    } catch (error) {
        console.error(error);
        eventosContador.textContent = '–';
        eventosLista.innerHTML = '<p class="eventos-error">No se pudo cargar tu lista de eventos.</p>';
    }
}

function renderizarEventos(eventos) {
    eventosContador.textContent = eventos.length;

    if (eventos.length === 0) {
        eventosLista.innerHTML = '<p class="eventos-vacio">Todavía no tienes eventos.</p>';
        return;
    }

    const ordenados = [...eventos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    

    
    eventosLista.innerHTML = ordenados.map(evento => {
        const inicial = evento.nombre ? evento.nombre.charAt(0).toUpperCase() : '?';
        const fecha = evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Sin fecha';
        const estado = evento.vencido ? 'inactivo' : (evento.estado || 'activo');
const etiquetaEstado = ETIQUETAS_ESTADO[estado] || estado;

        return `
            <a href="/detalle?id=${escapar(evento._id)}" class="evento-fila">
                <span class="evento-inicial">${escapar(inicial)}</span>
                <span class="evento-info">
                    <span class="evento-nombre">${escapar(evento.nombre)}</span>
                    <span class="evento-meta">${escapar(fecha)}${evento.lugar ? ' · ' + escapar(evento.lugar) : ''}</span>
                </span>
                <span class="evento-estado ${escapar(estado)}">${escapar(etiquetaEstado)}</span>
            </a>
        `;
    }).join('');
}

cargarEventosUsuario();


cargarPerfil();