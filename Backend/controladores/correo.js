
const nodemailer = require('nodemailer');

let transportadorCache = null;

function obtenerTransportador() {
    if (transportadorCache !== null) return transportadorCache;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        transportadorCache = false;
        return transportadorCache;
    }

    transportadorCache = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    return transportadorCache;
}

async function enviarCorreoRecuperacion(destinatario, nombreUsuario, link) {
    const transportador = obtenerTransportador();

    if (!transportador) {
        console.log(`[correo] SMTP no configurado. Enlace de recuperación para ${destinatario}:`);
        console.log(`[correo] ${link}`);
        return;
    }

    const asunto = 'Recupera tu contraseña en Portal Eve';
    const texto = `Hola ${nombreUsuario},\n\nSolicitaste restablecer tu contraseña. Este enlace vence en 1 hora:\n${link}\n\nSi no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.`;
    const html = `
        <p>Hola ${nombreUsuario},</p>
        <p>Solicitaste restablecer tu contraseña. Este enlace vence en 1 hora:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>
    `;

    await transportador.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: destinatario,
        subject: asunto,
        text: texto,
        html
    });
}

module.exports = { enviarCorreoRecuperacion };