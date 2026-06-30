/**
 * ============================================================
 * admin.routes.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Rutas para el registro y autenticación de administradores
 * ============================================================
 */

import { Router } from 'express'
import { registrarAdmin, loginAdmin, verifyOTPAdmin, resendOTPAdmin } from '../controllers/admin.controller.js'

const router = Router()

// POST /api/admin/registro - Registrar nuevo administrador
router.post('/registro', registrarAdmin)

// POST /api/admin/login - Iniciar sesión como administrador (Genera OTP)
router.post('/login', loginAdmin)

// POST /api/admin/verify-otp - Verificar OTP y obtener JWT
router.post('/verify-otp', verifyOTPAdmin)

// POST /api/admin/resend-otp - Reenviar código OTP
router.post('/resend-otp', resendOTPAdmin)

export default router
