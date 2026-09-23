const token = new URLSearchParams(window.location.search).get('token');

const formularioRestablecer = document.getElementById('formularioRestablecer');
const mensajeSinToken = document.getElementById('mensajeSinToken');
const btnRestablecer = document.getElementById('btnRestablecer');


if (!token) {
    formularioRestablecer.hidden = true;
    mensajeSinToken.hidden = false;
} else {
    formularioRestablecer.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nuevaPass = document.getElementById('nuevaPass').value;
        const confirmarPass = document.getElementById('confirmarPass').value;

        if (nuevaPass !== confirmarPass) {
            window.Alerta.error('Las contraseñas no coinciden');
            return;
        }

        btnRestablecer.disabled = true;
        const textoOriginal = btnRestablecer.textContent;
        btnRestablecer.textContent = 'Guardando...';

        try {
            const respuesta = await fetch('/api/usuarios/restablecer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nuevaPass })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                await window.Alerta.mensaje({
                    titulo: '¡Listo!',
                    mensaje: datos.mensaje,
                    tipo: 'exito',
                    boton: 'Iniciar sesión'
                });
                window.location.href = '/login';
            } else {
                window.Alerta.error(datos.errores ? datos.errores.join('. ') : (datos.mensaje || 'No se pudo restablecer la contraseña'));
            }
        } catch (error) {
            window.Alerta.error('Error con el servidor');
        } finally {
            btnRestablecer.disabled = false;
            btnRestablecer.textContent = textoOriginal;
        }
    });
}