const { Resend } = require('resend');

let resendCache = null;

function obtenerResend() {
    if (resendCache !== null) return resendCache;

    if (!process.env.RESEND_API_KEY) {
        resendCache = false;
        return resendCache;
    }

    resendCache = new Resend(process.env.RESEND_API_KEY);
    return resendCache;
}

async function enviarCorreoRecuperacion(destinatario, nombreUsuario, link) {
    const resend = obtenerResend();

    if (!resend) {
        console.log(`[correo] RESEND_API_KEY no configurada. Enlace de recuperación para ${destinatario}:`);
        console.log(`[correo] ${link}`);
        return;
    }

    const html = `
        <p>Hola ${nombreUsuario},</p>
        <p>Solicitaste restablecer tu contraseña. Este enlace vence en 1 hora:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>
    `;

    const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || 'onboarding@resend.dev',
        to: destinatario,
        subject: 'Recupera tu contraseña en Portal Eve',
        html
    });

    if (error) throw new Error(error.message || 'Error al enviar el correo');
}

module.exports = { enviarCorreoRecuperacion };