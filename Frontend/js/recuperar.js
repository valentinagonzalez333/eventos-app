const formularioRecuperar = document.getElementById('formularioRecuperar');
const btnEnviar = document.getElementById('btnEnviar');

formularioRecuperar.addEventListener('submit', async (event) => {
    event.preventDefault();

    const correo = document.getElementById('correo').value.trim();
    if (!correo) return;

    btnEnviar.disabled = true;
    const textoOriginal = btnEnviar.textContent;
    btnEnviar.textContent = 'Enviando...';

    try {
        const respuesta = await fetch('/api/usuarios/recuperar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {

            await window.Alerta.mensaje({
                titulo: 'Revisa tu correo',
                mensaje: datos.mensaje,
                tipo: 'exito',
                boton: 'Entendido'
            });
            formularioRecuperar.reset();
        } else {
            window.Alerta.error(datos.errores ? datos.errores.join('. ') : (datos.mensaje || 'No se pudo procesar la solicitud'));
        }
    } catch (error) {
        window.Alerta.error('Error con el servidor');
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textoOriginal;
    }
});