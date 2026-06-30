/**
 * ============================================================
 * admin-dashboard.routes.js
 * Rutas para el Dashboard Administrativo (Centro de Operaciones)
 * ============================================================
 */

import express from 'express';
import {
    getStatsAdvanced,
    getUsuarios, updateUsuarioStatus, editarUsuario, restablecerPassword,
    getCamiones, createCamion, updateCamion, deleteCamion,
    getRutas, createRuta, updateRuta, deleteRuta,
    getGPSLocations,
    getRecolecciones,
    getIncidencias, updateIncidencia,
    getNotificaciones, createNotificacion,
    getReportes,
    getOperadoresZonas,
    crearOperador,
    crearAdmin,
    actualizarConfiguracion
} from '../controllers/admin-dashboard.controller.js';

const router = express.Router();

// Estadísticas generales y avanzadas (Centro de Operaciones)
router.get('/stats/advanced', getStatsAdvanced);

// Usuarios
router.get('/usuarios', getUsuarios);
router.put('/usuarios/:id/estado', updateUsuarioStatus);
router.put('/usuarios/:id', editarUsuario);
router.put('/usuarios/:id/password', restablecerPassword);

// Operadores
router.post('/operadores', crearOperador);

// Administradores
router.post('/administradores', crearAdmin);

// Configuración y Perfil
router.put('/configuracion/:id', actualizarConfiguracion);

// Camiones
router.get('/camiones', getCamiones);
router.post('/camiones', createCamion);
router.put('/camiones/:id', updateCamion);
router.delete('/camiones/:id', deleteCamion);

// Rutas
router.get('/rutas', getRutas);
router.post('/rutas', createRuta);
router.put('/rutas/:id', updateRuta);
router.delete('/rutas/:id', deleteRuta);

// GPS
router.get('/gps', getGPSLocations);

// Recolecciones
router.get('/recolecciones', getRecolecciones);

// Incidencias
router.get('/incidencias', getIncidencias);
router.put('/incidencias/:id', updateIncidencia);

// Notificaciones
router.get('/notificaciones', getNotificaciones);
router.post('/notificaciones', createNotificacion);

// Reportes
router.get('/reportes', getReportes);

// Utilidades (Dropdowns)
router.get('/utilidades', getOperadoresZonas);

export default router;
