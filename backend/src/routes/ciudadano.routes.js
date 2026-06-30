import express from 'express';
import { verificarToken, esCiudadano } from '../middlewares/auth.middleware.js';
import {
    getDashboardInfo,
    getRecoleccionInfo,
    getTrackingInfo,
    reportarIncidencia,
    getMisIncidencias,
    getNotificaciones,
    marcarNotificacionLeida,
    getPerfil,
    updatePerfil
} from '../controllers/ciudadano.controller.js';

const router = express.Router();

// Aplicar middleware a todas las rutas de este router
router.use(verificarToken, esCiudadano);

router.get('/dashboard', getDashboardInfo);
router.get('/recoleccion', getRecoleccionInfo);
router.get('/tracking', getTrackingInfo);

router.post('/incidencias', reportarIncidencia);
router.get('/incidencias', getMisIncidencias);

router.get('/notificaciones', getNotificaciones);
router.put('/notificaciones/:id/leida', marcarNotificacionLeida);

router.get('/perfil', getPerfil);
router.put('/perfil', updatePerfil);

export default router;
