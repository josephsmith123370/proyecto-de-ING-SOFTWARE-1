/**
 * ============================================================
 * app.js - Punto de entrada del servidor
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Configuración de Express con:
 * - Middleware CORS para permitir peticiones del frontend
 * - Parser JSON para el body de las peticiones
 * - Rutas de la API RESTful
 * - Servir archivos estáticos del frontend
 * ============================================================
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from './config/supabase.js'
import usuariosRouter from './routes/usuarios.routes.js'
import adminRouter from './routes/admin.routes.js'
import operadorRouter from './routes/operador.routes.js'
import adminDashboardRouter from './routes/admin-dashboard.routes.js'
import ciudadanoRouter from './routes/ciudadano.routes.js'

// Cargar variables de entorno desde .env
dotenv.config()

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ===== Crear instancia de Express =====
const app = express()

// ==================== MIDDLEWARES ====================

// Permitir peticiones CORS desde cualquier origen (desarrollo)
app.use(cors())

// Parsear el body de las peticiones como JSON
app.use(express.json())

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend')))

// ==================== RUTAS DE LA API ====================

// Rutas de usuarios (registro y login)
app.use('/api/usuarios', usuariosRouter)

// Rutas de administrador (registro y login)
app.use('/api/admin', adminRouter)

// Rutas de operador (registro y login)
app.use('/api/operador', operadorRouter)

// Rutas del Dashboard Administrativo
app.use('/api/admin/dashboard', adminDashboardRouter)

// Rutas del Portal Ciudadano
app.use('/api/ciudadano', ciudadanoRouter)

// Ruta de verificación de la API
app.get('/api', (req, res) => {
    res.json({
        exito: true,
        mensaje: 'API Gestión de Residuos Wanchaq funcionando',
        version: '1.0.0'
    })
})

// Ruta de prueba de conexión con Supabase
app.get('/api/test', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, correo, rol')
            .limit(5)

        if (error) {
            return res.status(500).json({
                exito: false,
                mensaje: 'Error de conexión con Supabase',
                error
            })
        }

        res.json({
            exito: true,
            mensaje: 'Conexión con Supabase exitosa',
            total: data.length,
            usuarios: data
        })
    } catch (error) {
        res.status(500).json({
            exito: false,
            mensaje: error.message
        })
    }
})

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
    console.log(`📄 Frontend:  http://localhost:${PORT}/registro.html`)
    console.log(`🔑 Login:     http://localhost:${PORT}/login.html`)
    console.log(`🔗 API Base:  http://localhost:${PORT}/api`)
    console.log(`🔐 Admin:     http://localhost:${PORT}/admin-login.html`)
    console.log(`🔐 Admin:     http://localhost:${PORT}/admin-register.html`)
    console.log(`🚚 Operador:  http://localhost:${PORT}/operador-login.html`)
    console.log(`🚚 Operador:  http://localhost:${PORT}/operador-register.html`)
})