const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const v = require('./validaciones');
const { enviarCorreoRecuperacion } = require('../controladores/correo');


const SIN_MAYUSCULAS = { locale: 'es', strength: 2 };
const RECUPERACION_VIGENCIA_MS = 60 * 60 * 1000; 

function validarNombreUsuario(errores, user) {
  const limpio = v.validarTexto(errores, user, {
    etiqueta: 'El nombre de usuario',
    max: 30,
    obligatorio: 'El nombre de usuario es obligatorio'
  });
  if (limpio && limpio.length < 3) errores.push('El nombre de usuario debe tener al menos 3 caracteres');
  return limpio;
}


function validarPass(errores, pass, etiqueta = 'La contraseña') {
  if (typeof pass !== 'string' || !pass) {
    errores.push(`${etiqueta} es obligatoria`);
  } else if (pass.length < 8) {
    errores.push(`${etiqueta} debe tener al menos 8 caracteres`);
  } else if (pass.length > 72) {
    errores.push(`${etiqueta} no puede superar los 72 caracteres`);
  } else if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
    errores.push(`${etiqueta} debe tener letras y números`);
  }
}

function hashToken(tokenCrudo) {
  return crypto.createHash('sha256').update(tokenCrudo).digest('hex');
}

exports.registrar = async (req, res) => {
  try {
    const { user, correo, pass } = req.body || {};

    const errores = [];
    const usuarioLimpio = validarNombreUsuario(errores, user);
    const correoLimpio = v.validarTexto(errores, correo, {
      etiqueta: 'El correo',
      max: 100,
      obligatorio: 'El correo es obligatorio'
    });
    if (correoLimpio && !v.esEmail(correoLimpio)) errores.push('El correo no es válido');
    validarPass(errores, pass);
    if (errores.length > 0) return v.responderErrores(res, errores);

    const existe = await Usuario
      .findOne({ $or: [{ user: usuarioLimpio }, { correo: correoLimpio }] })
      .collation(SIN_MAYUSCULAS);
    if (existe) {
      return res.status(400).json({ mensaje: 'El usuario o correo ya se encuentra registrado' });
    }

    const nuevo = await Usuario.create({
      user: usuarioLimpio,
      correo: correoLimpio,
      pass: await bcrypt.hash(pass, 10),
      rol: 'Organizador'
    });

    
    res.status(200).json({
      mensaje: 'Usuario registrado',
      usuario: { id: nuevo._id, user: nuevo.user, correo: nuevo.correo }
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { correo, pass } = req.body || {};

    
    if (typeof correo !== 'string' || typeof pass !== 'string' || !correo.trim() || !pass) {
      return res.status(400).json({ mensaje: 'Escribe tu correo y tu contraseña' });
    }

    const usuario = await Usuario.findOne({ correo: correo.trim() }).collation(SIN_MAYUSCULAS);
    if (!usuario || !(await bcrypt.compare(pass, usuario.pass))) {
      return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: usuario._id, user: usuario.user },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      mensaje: 'Ingreso exitoso',
      token,
      usuario: { id: usuario._id, correo: usuario.correo, user: usuario.user }
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};

exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuarioId).select('-pass');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json({
      user: usuario.user,
      correo: usuario.correo,
      rol: usuario.rol,
      createdAt: usuario.createdAt
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};

exports.editar = async (req, res) => {
  try {
    const { user, pass, nuevaPass } = req.body || {};

    const usuario = await Usuario.findById(req.usuarioId);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const errores = [];
    let usuarioLimpio;
    if (user) usuarioLimpio = validarNombreUsuario(errores, user);
    if (nuevaPass) {
      if (typeof pass !== 'string' || !pass) errores.push('Escribe tu contraseña actual');
      validarPass(errores, nuevaPass, 'La nueva contraseña');
    }
    if (errores.length > 0) return v.responderErrores(res, errores);

    if (usuarioLimpio) {
      const existe = await Usuario
        .findOne({ user: usuarioLimpio, _id: { $ne: req.usuarioId } })
        .collation(SIN_MAYUSCULAS);
      if (existe) {
        return res.status(400).json({ mensaje: 'Ese nombre de usuario ya está en uso' });
      }
      usuario.user = usuarioLimpio;
    }

    if (nuevaPass) {
      const correcta = await bcrypt.compare(pass, usuario.pass);
      if (!correcta) {
        return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta' });
      }
      usuario.pass = await bcrypt.hash(nuevaPass, 10);
    }

    await usuario.save();

    res.status(200).json({ mensaje: 'Usuario actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};


// Recuperar cuenta

exports.solicitarRecuperacion = async (req, res) => {
  try {
    const { correo } = req.body || {};

    const errores = [];
    const correoLimpio = v.validarTexto(errores, correo, {
      etiqueta: 'El correo',
      max: 100,
      obligatorio: 'El correo es obligatorio'
    });
    if (correoLimpio && !v.esEmail(correoLimpio)) errores.push('El correo no es válido');
    if (errores.length > 0) return v.responderErrores(res, errores);

    const usuario = await Usuario.findOne({ correo: correoLimpio }).collation(SIN_MAYUSCULAS);

    if (usuario) {
      const tokenCrudo = crypto.randomBytes(32).toString('hex');

      usuario.resetTokenHash = hashToken(tokenCrudo);
      usuario.resetExpira = new Date(Date.now() + RECUPERACION_VIGENCIA_MS);
      await usuario.save();

      const link = `${req.protocol}://${req.get('host')}/restablecer?token=${tokenCrudo}`;

      
      try {
        await enviarCorreoRecuperacion(usuario.correo, usuario.user, link);
      } catch (errorCorreo) {
        console.error('No se pudo enviar el correo de recuperación:', errorCorreo);
      }
    }

    res.status(200).json({
      mensaje: 'Si ese correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa también spam.'
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};


exports.restablecerContrasena = async (req, res) => {
  try {
    const { token, nuevaPass } = req.body || {};

    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ mensaje: 'El enlace no es válido. Solicita uno nuevo.' });
    }

    const errores = [];
    validarPass(errores, nuevaPass, 'La nueva contraseña');
    if (errores.length > 0) return v.responderErrores(res, errores);

    const usuario = await Usuario.findOne({
      resetTokenHash: hashToken(token.trim()),
      resetExpira: { $gt: new Date() }
    }).select('+resetTokenHash +resetExpira');

    if (!usuario) {
      return res.status(400).json({ mensaje: 'El enlace no es válido o ya venció. Solicita uno nuevo.' });
    }

    usuario.pass = await bcrypt.hash(nuevaPass, 10);
    usuario.resetTokenHash = null;
    usuario.resetExpira = null;
    await usuario.save();

    res.status(200).json({ mensaje: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error del servidor', error: error.message });
  }
};