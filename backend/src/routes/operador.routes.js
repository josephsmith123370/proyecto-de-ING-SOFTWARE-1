/**
 * ============================================================
 * operador.routes.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Rutas para el registro y autenticación de operadores
 * ============================================================
 */

import { Router } from 'express'
import { registrarOperador, loginOperador, verifyOTPOperador, resendOTPOperador } from '../controllers/operador.controller.js'

const router = Router()

// POST /api/operador/registro - Registrar nuevo operador
router.post('/registro', registrarOperador)

// POST /api/operador/login - Iniciar sesión como operador (Genera OTP)
router.post('/login', loginOperador)

// POST /api/operador/verify-otp - Verificar OTP y obtener JWT
router.post('/verify-otp', verifyOTPOperador)

// POST /api/operador/resend-otp - Reenviar código OTP
router.post('/resend-otp', resendOTPOperador)

export default router
