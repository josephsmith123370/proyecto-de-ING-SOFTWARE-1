/**
 * ============================================================
 * usuarios.controller.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Controlador de usuarios - Maneja registro y login
 * de ciudadanos con validación, encriptación y JWT.
 * ============================================================
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

// ==================== REGISTRO DE CIUDADANO ====================

/**
 * Registrar un nuevo ciudadano en el sistema
 * 
 * @route POST /api/usuarios/registro
 * @param {Object} req.body - { nombre, dni, correo, password }
 * @returns {Object} JSON con mensaje de éxito y datos del usuario
 */
export const registrarCiudadano = async (req, res) => {

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

        // ===== Validar formato del DNI (exactamente 8 dígitos) =====
        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos'
            })
        }

        // ===== Validar formato del correo electrónico =====
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!regexCorreo.test(correo)) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El formato del correo electrónico no es válido'
            })
        }

        // ===== Validar longitud mínima de la contraseña =====
        if (password.length < 6) {
            return res.status(400).json({
                exito: false,
                mensaje: 'La contraseña debe tener al menos 6 caracteres'
            })
        }

        // ===== Verificar si el correo ya está registrado =====
        const { data: existe } = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', correo)
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

        // ===== Encriptar la contraseña con bcrypt (10 rondas de salt) =====
        const password_hash = await bcrypt.hash(password, 10)

        // ===== Insertar nuevo usuario en Supabase =====
        const { data, error } = await supabase
            .from('usuarios')
            .insert([
                {
                    nombre: nombre.trim(),
                    dni,
                    correo: correo.trim().toLowerCase(),
                    password_hash,
                    rol: 'ciudadano'  // Se asigna automáticamente
                }
            ])
            .select()

        // Manejar error de inserción en la base de datos
        if (error) {
            console.error('Error de Supabase al registrar:', error)
            return res.status(400).json({
                exito: false,
                mensaje: 'Error al registrar usuario en la base de datos'
            })
        }

        // ===== Respuesta exitosa =====
        res.status(201).json({
            exito: true,
            mensaje: 'Usuario registrado correctamente',
            usuario: data[0]
        })

    } catch (error) {

        // Manejar errores inesperados del servidor
        console.error('Error en registrarCiudadano:', error)
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        })

    }

}

// ==================== LOGIN DE CIUDADANO ====================

/**
 * Iniciar sesión con correo y contraseña
 * 
 * @route POST /api/usuarios/login
 * @param {Object} req.body - { correo, password }
 * @returns {Object} JSON con token JWT y datos del usuario
 */
export const loginCiudadano = async (req, res) => {

    const { correo, password } = req.body

    try {

        // ===== Validación de campos vacíos =====
        if (!correo || !password) {
            return res.status(400).json({
                exito: false,
                mensaje: 'El correo y la contraseña son obligatorios'
            })
        }

        // ===== Buscar usuario por correo en la base de datos =====
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('correo', correo.trim().toLowerCase())
            .single()

        // Si no se encuentra el usuario
        if (error || !usuario) {
            return res.status(401).json({
                exito: false,
                mensaje: 'Credenciales incorrectas'
            })
        }

        // ===== Verificar si la cuenta está activa =====
        if (usuario.activo === false) {
            return res.status(403).json({
                exito: false,
                mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
            })
        }

        // ===== Verificar la contraseña con bcrypt.compare =====
        const valido = await bcrypt.compare(
            password,
            usuario.password_hash
        )

        if (!valido) {
            return res.status(401).json({
                exito: false,
                mensaje: 'Credenciales incorrectas'
            })
        }

        // ===== Generar JWT con duración de 8 horas =====
        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        )

        // ===== Respuesta exitosa con token y datos del usuario =====
        res.json({
            exito: true,
            mensaje: 'Inicio de sesión correcto',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
                puntos_ecologicos: usuario.puntos_ecologicos || 0
            }
        })

    } catch (error) {

        // Manejar errores inesperados del servidor
        console.error('Error en loginCiudadano:', error)
        res.status(500).json({
            exito: false,
            mensaje: 'Error interno del servidor'
        })

    }

}