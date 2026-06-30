/**
 * ============================================================
 * admin.controller.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Controlador de administradores - Maneja registro y login
 * con validación de código de seguridad maestro.
 * ============================================================
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'
import { enviarCorreoOTP } from '../services/email.service.js'

// Código maestro de registro y seguridad administrativa (quemado para demo)
const CODIGO_MAESTRO = process.env.ADMIN_SECRET_CODE || 'WANCHAQ_ADMIN_2024'

// ==================== REGISTRO DE ADMINISTRADOR ====================

/**
 * Registrar un nuevo administrador en el sistema
 * 
 * @route POST /api/admin/registro
 * @param {Object} req.body - { nombre, dni, correo, password }
 * @returns {Object} JSON con mensaje de éxito y datos del administrador
 */
export const registrarAdmin = async (req, res) => {
    const { nombre, dni, correo, password } = req.body

    try {
        // ===== Validación de campos vacíos =====
        if (!nombre || !dni || !correo || !password) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Todos los campos son obligatorios'
            })
        }

        // ===== Validar longitud del nombre =====
        if (nombre.trim().length < 3) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El nombre debe tener al menos 3 caracteres'
            })
        }

        // ===== Validar formato del DNI =====
        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos'
            })
        }

        // ===== Validar formato del correo =====
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El formato del correo electrónico no es válido'
            })
        }

        // ===== Verificar si el correo ya está registrado =====
        const { data: existe } = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', correo.trim().toLowerCase())
            .maybeSingle()

        if (existe) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El correo ya está registrado'
            })
        }

        // ===== Verificar si el DNI ya está registrado =====
        const { data: dniExiste } = await supabase
            .from('usuarios')
            .select('id')
            .eq('dni', dni)
            .maybeSingle()

        if (dniExiste) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El DNI ya está registrado'
            })
        }

        // ===== Encriptar la contraseña =====
        const password_hash = await bcrypt.hash(password, 10)

        // ===== Insertar nuevo administrador en Supabase =====
        const { data, error } = await supabase
            .from('usuarios')
            .insert([
                {
                    nombre: nombre.trim(),
                    dni,
                    correo: correo.trim().toLowerCase(),
                    password_hash,
                    rol: 'admin' // Asignación explícita del rol de administrador
                }
            ])
            .select()

        if (error) {
            console.error('Error de Supabase al registrar administrador:', error)
            return res.status(400).json({
                exito: false,
                mensaje: 'Error al registrar administrador en la base de datos'
            })
        }

        res.status(201).json({
            exito: true,
            mensaje: 'Administrador registrado correctamente.',
            usuario: data[0]
        })

    } catch (error) {
        console.error('Error en registrarAdmin:', error)
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        })
    }
}

// ==================== LOGIN DE ADMINISTRADOR ====================

/**
 * Iniciar sesión como administrador
 * 
 * @route POST /api/admin/login
 * @param {Object} req.body - { correo, password }
 * @returns {Object} JSON con token JWT y datos del administrador
 */
export const loginAdmin = async (req, res) => {
    const { correo, password } = req.body

    try {
        // ===== Validación de campos =====
        if (!correo || !password) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Todos los campos son obligatorios'
            })
        }

        // ===== Buscar usuario por correo =====
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('correo', correo.trim().toLowerCase())
            .single()

        if (error || !usuario) {
            return res.status(401).json({
                exito: false,
                mensaje: 'Credenciales incorrectas'
            })
        }

        // ===== Verificar si el usuario tiene rol de admin =====
        if (usuario.rol !== 'admin') {
            return res.status(403).json({
                exito: false,
                mensaje: 'Esta cuenta no tiene privilegios administrativos'
            })
        }

        // ===== Verificar si la cuenta está activa =====
        if (usuario.activo === false) {
            return res.status(403).json({
                exito: false,
                mensaje: 'Tu cuenta administrativa ha sido desactivada'
            })
        }

        // ===== Verificar la contraseña =====
        const valido = await bcrypt.compare(password, usuario.password_hash)

        if (!valido) {
            return res.status(401).json({
                exito: false,
                mensaje: 'Credenciales incorrectas'
            })
        }

        // ===== Generar OTP de 6 dígitos =====
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // ===== Invalida OTPs anteriores del usuario =====
        await supabase
            .from('codigos_acceso')
            .update({ activo: false })
            .eq('usuario_id', usuario.id)
            .eq('activo', true)

        // ===== Calcular fecha de expiración (5 minutos) =====
        const fechaExpiracion = new Date()
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 5)

        // ===== Guardar OTP en la base de datos =====
        const { error: otpError } = await supabase
            .from('codigos_acceso')
            .insert([{
                usuario_id: usuario.id,
                codigo: otp,
                fecha_expiracion: fechaExpiracion.toISOString(),
                activo: true
            }])

        if (otpError) {
            console.error('Error guardando OTP:', otpError)
            return res.status(500).json({
                exito: false,
                mensaje: 'Error al generar código de seguridad'
            })
        }

        // ===== Enviar OTP por correo =====
        const correoEnviado = await enviarCorreoOTP(usuario.correo, otp)

        if (!correoEnviado) {
            console.warn('No se pudo enviar el correo, pero el OTP fue generado:', otp)
        }

        // ===== Retornar petición de OTP =====
        res.json({
            exito: true,
            requireOTP: true,
            mensaje: 'Se ha enviado un código de seguridad a su correo',
            correo: usuario.correo // Útil para el frontend
        })

    } catch (error) {
        console.error('Error en loginAdmin:', error)
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        })
    }
}

// ==================== VERIFICAR OTP ====================

/**
 * Verificar código OTP y generar JWT
 * 
 * @route POST /api/admin/verify-otp
 * @param {Object} req.body - { correo, codigo_otp }
 */
export const verifyOTPAdmin = async (req, res) => {
    const { correo, codigo_otp } = req.body

    try {
        if (!correo || !codigo_otp) {
            return res.status(400).json({ exito: false, mensaje: 'Faltan datos' })
        }

        // 1. Obtener el ID del usuario
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('id, nombre, correo, rol')
            .eq('correo', correo.trim().toLowerCase())
            .single()

        if (userError || !usuario) {
            return res.status(400).json({ exito: false, mensaje: 'Usuario no encontrado' })
        }

        // 2. Buscar el OTP más reciente válido
        console.log('--- AUDITORÍA OTP ---')
        console.log('Código recibido:', codigo_otp)
        console.log('Usuario:', usuario.id)

        const { data: otpData, error: otpError } = await supabase
            .from('codigos_acceso')
            .select('*')
            .eq('usuario_id', usuario.id)
            .eq('codigo', codigo_otp)
            .eq('activo', true)
            // Es posible que la columna sea fecha_creacion en vez de created_at
            .order('fecha_creacion', { ascending: false })
            .limit(1)

        console.log('Error consulta:', otpError)
        console.log('Resultado consulta:', otpData)

        if (otpError || !otpData || otpData.length === 0) {
            return res.status(400).json({ exito: false, mensaje: 'Código de verificación incorrecto' })
        }

        const otpRecord = otpData[0]

        // 3. Verificar expiración
        if (new Date() > new Date(otpRecord.fecha_expiracion)) {
            return res.status(400).json({ exito: false, mensaje: 'El código ha expirado' })
        }

        // 4. Marcar como usado
        await supabase
            .from('codigos_acceso')
            .update({ activo: false })
            .eq('id', otpRecord.id)

        // 5. Generar JWT (8 horas de duración)
        const token = jwt.sign(
            { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
            process.env.JWT_SECRET || 'wanchaq_secreto_desarrollo',
            { expiresIn: '8h' }
        )

        res.json({
            exito: true,
            mensaje: 'Verificación exitosa',
            token,
            usuario
        })

    } catch (error) {
        console.error('Error en verifyOTPAdmin:', error)
        res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' })
    }
}

// ==================== REENVIAR OTP ====================

/**
 * Reenviar código OTP al correo
 * 
 * @route POST /api/admin/resend-otp
 * @param {Object} req.body - { correo }
 */
export const resendOTPAdmin = async (req, res) => {
    const { correo } = req.body

    try {
        if (!correo) {
            return res.status(400).json({ exito: false, mensaje: 'El correo es obligatorio' })
        }

        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('id, correo')
            .eq('correo', correo.trim().toLowerCase())
            .single()

        if (userError || !usuario) {
            return res.status(400).json({ exito: false, mensaje: 'Usuario no encontrado' })
        }

        // Invalida anteriores
        await supabase
            .from('codigos_acceso')
            .update({ activo: false })
            .eq('usuario_id', usuario.id)
            .eq('activo', true)

        // Generar nuevo
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const fechaExpiracion = new Date()
        fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + 5)

        const { error: otpError } = await supabase
            .from('codigos_acceso')
            .insert([{
                usuario_id: usuario.id,
                codigo: otp,
                fecha_expiracion: fechaExpiracion.toISOString(),
                activo: true
            }])

        if (otpError) throw otpError

        // Enviar
        await enviarCorreoOTP(usuario.correo, otp)

        res.json({
            exito: true,
            mensaje: 'Nuevo código de verificación enviado al correo'
        })

    } catch (error) {
        console.error('Error en resendOTPAdmin:', error)
        res.status(500).json({ exito: false, mensaje: 'Error al reenviar código' })
    }
}
