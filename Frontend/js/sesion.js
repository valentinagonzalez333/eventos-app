

(function () {
    const CLAVE = 'token';
    const RUTA_LOGIN = '/login';
    const RUTA_INICIO = '/panel';
    const MAX_TIMEOUT = 2147483647;

    function leer() {
        return localStorage.getItem(CLAVE);
    }

    function decodificar(token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
            );
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function vigente(token) {
        const datos = token ? decodificar(token) : null;
        return !!(datos && datos.id && (!datos.exp || datos.exp * 1000 > Date.now()));
    }

    function idDe(token) {
        const datos = token ? decodificar(token) : null;
        return datos ? datos.id : null;
    }


    function avisar(mensaje) {
        try { sessionStorage.setItem('avisoSesion', mensaje); } catch { }
    }

    function ir(ruta) {
        window.location.replace(ruta);
    }

    function expirar(mensaje = 'Tu sesión venció. Inicia sesión de nuevo.') {
        localStorage.removeItem(CLAVE);
        avisar(mensaje);
        ir(RUTA_LOGIN);
    }

    function cerrar() {
        localStorage.removeItem(CLAVE); 
        ir(RUTA_LOGIN);
    }

    const tokenInicial = leer();
    const miId = idDe(tokenInicial);

    window.Sesion = { token: leer, usuarioId: () => miId, vigente: () => vigente(leer()), expirar, cerrar };

    // sin sesión válida no se ve nada.
    if (!vigente(tokenInicial)) {
        localStorage.removeItem(CLAVE);
        if (tokenInicial) avisar('Tu sesión venció. Inicia sesión de nuevo.');
        ir(RUTA_LOGIN);
        return;
    }

    //cambios de sesión hechos en otra pestaña.
    window.addEventListener('storage', (e) => {
        if (e.storageArea !== localStorage) return;
        if (e.key !== null && e.key !== CLAVE) return; 

        const nuevo = e.key === null ? null : e.newValue;

        if (!vigente(nuevo)) {
            avisar('Se cerró la sesión en otra ventana.');
            ir(RUTA_LOGIN);
        } else if (idDe(nuevo) !== miId) {
            avisar('Iniciaste sesión con otra cuenta en otra ventana; ahora estás usando esa cuenta.');
            ir(RUTA_INICIO);
        }
        // Misma cuenta con un token nuevo: no hay nada que hacer.
    });

    // justo cuando toca, y al volver a la pestaña por si el navegador la durmió.
    const datos = decodificar(tokenInicial);
    if (datos && datos.exp) {
        const restante = datos.exp * 1000 - Date.now() + 500;
        setTimeout(() => { if (!vigente(leer())) expirar(); }, Math.min(restante, MAX_TIMEOUT));
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        const actual = leer();
        if (!vigente(actual)) expirar();
        else if (idDe(actual) !== miId) ir(RUTA_INICIO);
    });
})();