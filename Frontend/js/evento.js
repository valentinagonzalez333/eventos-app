const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario'));


const contenedorCards = document.querySelector('.cards');
const buscador = document.querySelector('.input');

const modal = document.getElementById('modalCrear');
const btnAbrir = document.getElementById('btnAbrirModal');
const btnCerrar = document.getElementById('btnCerrarModal');


btnAbrir.addEventListener('click', () => {
    modal.classList.add('abierto');
});


btnCerrar.addEventListener('click', () => {
    modal.classList.remove('abierto');
});


modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('abierto');
    }
});


let todosLosEventos = [];
let eventoEditando = null;


async function cargarEventos() {
    try {
        const respuesta = await fetch('/api/eventos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!respuesta.ok) {
            throw new Error('No se pudieron cargar los eventos');
        }

        todosLosEventos = await respuesta.json();
        mostrarEventos(todosLosEventos);

    } catch (error) {
        console.error(error);
        contenedorCards.innerHTML = '<p>Error al cargar los eventos</p>';
    }
}

contenedorCards.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    const card = e.target.closest('.card');
    if (!card) return;

    const id = card.dataset.id;

    if (boton) {
        if (boton.classList.contains('btn-eliminar')) {
            eliminarEvento(id);
        } else if (boton.classList.contains('btn-editar')) {
            window.location.href = `/detalle?id=${id}`;
        }
        return;
    }


    window.location.href = `/detalle?id=${id}`;
});


const ESTADO_VACIO = `
    <div class="estado-vacio">
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="20" width="68" height="60" rx="10" fill="#f4eefc" stroke="#5b2a86" stroke-width="2"/>
            <rect x="14" y="20" width="68" height="18" rx="10" fill="#5b2a86"/>
            <circle cx="30" cy="20" r="4" fill="#1f1b2e"/>
            <circle cx="66" cy="20" r="4" fill="#1f1b2e"/>
            <circle cx="30" cy="56" r="3" fill="#5b2a86"/>
            <circle cx="48" cy="56" r="3" fill="#5b2a86"/>
            <circle cx="66" cy="56" r="3" fill="#5b2a86"/>
            <circle cx="30" cy="68" r="3" fill="#5b2a86"/>
            <circle cx="48" cy="68" r="3" fill="#5b2a86"/>
        </svg>
        <h3>Todavía no tienes eventos</h3>
        <p>Crea el primero y empieza a organizar los detalles.</p>
    </div>
`;


function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caracter]));
}

function mostrarEventos(eventos) {
    if (eventos.length === 0) {
        contenedorCards.innerHTML = ESTADO_VACIO;
        return;
    }

    contenedorCards.innerHTML = eventos.map(evento => {
        const variante = Math.abs([...evento._id].reduce((a, c) => a + c.charCodeAt(0), 0)) % 4;

        const nombreSeguro = escaparHtml(evento.nombre);
        const descripcionSegura = escaparHtml(evento.descripcion || 'Sin descripción');
        const lugarSeguro = escaparHtml(evento.lugar || 'Sin lugar');
        const imagenSegura = evento.imagen ? escaparHtml(evento.imagen) : null;
        const inicial = escaparHtml(evento.nombre.charAt(0).toUpperCase());

        const imagenHtml = imagenSegura
            ? `<img src="${imagenSegura}" onerror="this.parentElement.classList.add('grad-${variante}'); this.remove();" alt="${nombreSeguro}">`
            : `<div class="placeholder-imagen">
                   <span class="punto"></span><span class="punto"></span><span class="punto"></span>
                   <span class="letra">${inicial}</span>
               </div>`;

        return `
        <div class="card" data-id="${evento._id}">
            <div class="card-imagen ${evento.imagen ? '' : 'grad-' + variante}">
                <span class="badge">${inicial}</span>
                ${imagenHtml}
            </div>
            <div class="card-contenido">
                <h3>${nombreSeguro}</h3>
                <p class="descripcion">${descripcionSegura}</p>
                <div class="metadata">
                    <span>📅 ${new Date(evento.fecha).toLocaleDateString()}</span>
                    <span>📍 ${lugarSeguro}</span>
                    <span>💰 $${evento.presupuesto || 0}</span>
                </div>
                <div class="acciones">
                    <button class="btn-editar">Editar</button>
                    <button class="btn-eliminar">Eliminar</button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}




buscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = todosLosEventos.filter(evento =>
        evento.nombre.toLowerCase().includes(texto)
    );
    mostrarEventos(filtrados);
});


async function eliminarEvento(id) {
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return;

    try {
        const respuesta = await fetch(`/api/eventos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (respuesta.ok) {
            cargarEventos();  
        } else {
            alert('No se pudo eliminar');
        }
    } catch (error) {
        console.error(error);
    }
}

document.getElementById('formEvento').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('nombre', document.getElementById('nombre').value);
    formData.append('descripcion', document.getElementById('descripcion').value);
    formData.append('fecha', new Date(document.getElementById('fecha').value).toISOString());
    formData.append('lugar', document.getElementById('lugar').value);
    formData.append('presupuesto', document.getElementById('presupuesto').value);
    const archivo = document.getElementById('imagen').files[0];
    if (archivo) formData.append('imagen', archivo);

    try {
        const respuesta = await fetch('/api/eventos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (respuesta.ok) {
            modal.classList.remove('abierto');
            e.target.reset();
            cargarEventos();
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al crear el evento');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
});


function abrirEdicion(id) {
    eventoEditando = todosLosEventos.find(e => e._id === id);
    if (!eventoEditando) return;

    document.getElementById('nombre').value = eventoEditando.nombre;
    document.getElementById('descripcion').value = eventoEditando.descripcion || '';
    document.getElementById('fecha').value = new Date(eventoEditando.fecha).toISOString().slice(0, 16);
    document.getElementById('lugar').value = eventoEditando.lugar || '';
    document.getElementById('presupuesto').value = eventoEditando.presupuesto || '';

    document.getElementById('imagen').value = '';

    modal.classList.add('abierto');
}



cargarEventos();