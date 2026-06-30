/**
 * ============================================================
 * usuarios.routes.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Define las rutas para la gestión de usuarios:
 * - POST /api/usuarios/registro → Registrar ciudadano
 * - POST /api/usuarios/login    → Iniciar sesión
 * ============================================================
 */

import { Router } from 'express'

import {
    registrarCiudadano,
    loginCiudadano
} from '../controllers/usuarios.controller.js'

// Crear instancia del router
const router = Router()

// ==================== RUTAS ====================

// Registro de nuevo ciudadano
router.post('/registro', registrarCiudadano)

// Inicio de sesión con correo y contraseña
router.post('/login', loginCiudadano)

export default router