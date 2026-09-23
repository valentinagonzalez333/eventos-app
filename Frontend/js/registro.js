const formularioRegistro = document.getElementById('formularioRegistro');
const btnRegistro = formularioRegistro.querySelector('button');

formularioRegistro.addEventListener('submit', async (event) => {
    event.preventDefault();

    const user = document.getElementById('usuario').value;
    const correo = document.getElementById('correo').value;
    const pass = document.getElementById('contrasena').value;

    btnRegistro.disabled = true;
    const textoOriginal = btnRegistro.textContent;
    btnRegistro.textContent = 'Creando cuenta...';

    try {
        const respuesta = await fetch('/api/usuarios/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, correo, pass })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            await window.Alerta.mensaje({
                titulo: '¡Cuenta creada!',
                mensaje: `Bienvenido/a, ${user}. Ya puedes iniciar sesión.`,
                tipo: 'exito',
                boton: 'Iniciar sesión'
            });
            window.location.href = '/login';
            return;
        }

        window.Alerta.error(datos.mensaje || 'No se pudo completar el registro');
    } catch (error) {
        window.Alerta.error('Error con el servidor');
    } finally {
        btnRegistro.disabled = false;
        btnRegistro.textContent = textoOriginal;
    }
});