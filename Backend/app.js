require("node:dns").setServers(["1.1.1.1", "8.8.8.8"]); // arreglo local para conectar con Atlas
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const conectarDB = require('./conf/db_conexion');
const autenticar = require('./middlewares/auth');
const { CATEGORIAS } = require('./conf/categorias');


const faltantes = ['MONGO_URL', 'JWT_SECRET'].filter(nombre => !process.env[nombre]);
if (faltantes.length > 0) {
    console.error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET es corto: usa una cadena larga y aleatoria (32+ caracteres).');
}

const FRONTEND = path.join(__dirname, '../Frontend');
const app = express();

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    }
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(FRONTEND));


if (process.env.NODE_ENV === 'production') {
    app.use('/api', (req, res, next) => {
        const enviar = res.json.bind(res);
        res.json = (cuerpo) => {
            if (res.statusCode >= 400 && cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo) {
                console.error(`[${req.method} ${req.originalUrl}]`, cuerpo.error);
                const { error, ...resto } = cuerpo;
                return enviar(resto);
            }
            return enviar(cuerpo);
        };
        next();
    });
}


const limiteAutenticacion = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

app.use('/api/eventos', require('./rutas/evento'));
app.use('/api/usuarios', limiteAutenticacion, require('./rutas/usuario'));
app.use('/api/panel', require('./rutas/panel'));
app.use('/api/disenoinvitacion', require('./rutas/disenoInvitacion'));
app.use('/api/invitados', require('./rutas/invitacion'));
app.use('/api/rsvp', require('./rutas/rs'));
app.get('/api/categorias', autenticar, (req, res) => res.json(CATEGORIAS));
app.use('/api/gastos', require('./rutas/gasto'));
app.use('/api/tareas', require('./rutas/tarea'));
app.use('/api/proveedores', require('./rutas/proveedor'));
app.use('/api/mesas', require('./rutas/mesa'));


app.use('/api', (req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

const PAGINAS = {
    '/':              'index.html',
    '/login':         'login.html',
    '/registro':      'registro.html',
    '/panel':         'panel.html',
    '/eventos':       'evento.html',
    '/detalle':       'detalle.html',
    '/configuracion': 'configuracion.html',
    '/calendario':    'calendario.html',
    '/recuperar':     'recuperar.html',
    '/restablecer':   'restablecer.html'
};

for (const [url, archivo] of Object.entries(PAGINAS)) {
    app.get(url, (req, res) => res.sendFile(path.join(FRONTEND, 'html', archivo)));
}

app.get('/invitacion/:token', (req, res) => {
    res.sendFile(path.join(FRONTEND, 'html', 'invitacion.html'));
});


app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof multer.MulterError) {
        const mensaje = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen no puede pesar más de 5 MB'
            : 'No se pudo subir la imagen';
        return res.status(400).json({ mensaje });
    }
    if (error.codigo === 'TIPO_NO_PERMITIDO') return res.status(400).json({ mensaje: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'Los datos enviados no son válidos' });
    if (error.type === 'entity.too.large') return res.status(413).json({ mensaje: 'Los datos enviados son demasiado grandes' });

    console.error(error);
    res.status(500).json({ mensaje: 'Error del servidor' });
});

conectarDB().then(() => {
    const puerto = process.env.PORT || 3000;
    app.listen(puerto, () => console.log(`Servidor corriendo en http://localhost:${puerto}`));
});