const jwt = require('jsonwebtoken');

const autenticar = (req, res, next) => {
    try {

        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ mensaje: 'No autorizado, falta el token' });
        }

        const verificado = jwt.verify(token, process.env.JWT_SECRET);


        req.usuarioId = verificado.id;

        next(); 
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
};

module.exports = autenticar;
