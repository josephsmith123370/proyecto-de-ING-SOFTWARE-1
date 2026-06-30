import jwt from 'jsonwebtoken';

export const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                exito: false,
                mensaje: 'No autorizado. Token no proporcionado.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adjuntar datos del usuario a la request
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            exito: false,
            mensaje: 'Token inválido o expirado.'
        });
    }
};

export const esCiudadano = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'ciudadano') {
        next();
    } else {
        return res.status(403).json({
            exito: false,
            mensaje: 'Acceso denegado. Se requiere rol de ciudadano.'
        });
    }
};
