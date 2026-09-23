const formularioLogin = document.getElementById('formularioLogin');
const btnLogin = formularioLogin.querySelector('button');

formularioLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    const correo = document.getElementById('correo').value;
    const pass = document.getElementById('contrasena').value;

    btnLogin.disabled = true;
    const textoOriginal = btnLogin.textContent;
    btnLogin.textContent = 'Ingresando...';

    try {
        const respuesta = await fetch('/api/usuarios/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, pass })
        });
        const datos = await respuesta.json();

        if (respuesta.ok) {
            localStorage.setItem('token', datos.token);
            localStorage.setItem('usuario', JSON.stringify(datos.usuario)); // datos es un objeto y localStorage solo guarda texto

            
            window.location.href = '/panel';
            return;
        }

        window.Alerta.error(datos.mensaje || 'Usuario o contraseña incorrectos');
    } catch (error) {
        window.Alerta.error('Error con el servidor');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = textoOriginal;
    }
});