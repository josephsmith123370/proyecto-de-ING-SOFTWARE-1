/**
 * ============================================================
 * registro.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Maneja el registro de nuevos ciudadanos:
 * - Validación de campos del formulario
 * - Indicador de fortaleza de contraseña
 * - Toggle de visibilidad de contraseña
 * - Envío de datos a la API con fetch
 * - Feedback visual al usuario
 * ============================================================
 */

// URL base de la API (ajustar según el entorno)
const API_URL = 'http://localhost:3000/api/usuarios'

// ==================== REFERENCIAS AL DOM ====================
const formRegistro = document.getElementById('formRegistro')
const inputNombre = document.getElementById('nombre')
const inputDni = document.getElementById('dni')
const inputCorreo = document.getElementById('correo')
const inputPassword = document.getElementById('password')
const btnRegistro = document.getElementById('btnRegistro')
const mensajeDiv = document.getElementById('mensaje')
const togglePasswordBtn = document.getElementById('togglePassword')
const strengthBars = [
    document.getElementById('str1'),
    document.getElementById('str2'),
    document.getElementById('str3'),
    document.getElementById('str4')
]
const strengthText = document.getElementById('strengthText')

// ==================== TOGGLE VISIBILIDAD CONTRASEÑA ====================
togglePasswordBtn.addEventListener('click', () => {
    // Alternar entre tipo password y text
    const isPassword = inputPassword.type === 'password'
    inputPassword.type = isPassword ? 'text' : 'password'

    // Cambiar el icono (ojo abierto / ojo cerrado)
    togglePasswordBtn.innerHTML = isPassword
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
           </svg>`
})

// ==================== INDICADOR DE FORTALEZA DE CONTRASEÑA ====================
inputPassword.addEventListener('input', () => {
    const password = inputPassword.value
    const strength = evaluarFortaleza(password)
    actualizarBarrasFortaleza(strength)
})

/**
 * Evalúa la fortaleza de una contraseña
 * @param {string} password - La contraseña a evaluar
 * @returns {number} Nivel de fortaleza (0-4)
 */
function evaluarFortaleza(password) {
    let score = 0

    if (password.length === 0) return 0
    if (password.length >= 6) score++     // Longitud mínima
    if (password.length >= 10) score++    // Longitud buena
    if (/[A-Z]/.test(password)) score++   // Mayúsculas
    if (/[0-9]/.test(password)) score++   // Números
    if (/[^A-Za-z0-9]/.test(password)) score++ // Caracteres especiales

    // Limitar el score máximo a 4
    return Math.min(score, 4)
}

/**
 * Actualiza las barras visuales del indicador de fortaleza
 * @param {number} strength - Nivel de fortaleza (0-4)
 */
function actualizarBarrasFortaleza(strength) {
    // Definir niveles con sus clases y textos
    const niveles = {
        0: { clase: '', texto: '' },
        1: { clase: 'weak', texto: 'Débil' },
        2: { clase: 'medium', texto: 'Regular' },
        3: { clase: 'strong', texto: 'Buena' },
        4: { clase: 'strong', texto: 'Fuerte' }
    }

    const nivel = niveles[strength]

    // Actualizar cada barra
    strengthBars.forEach((bar, index) => {
        bar.className = 'strength-bar' // Reset
        if (index < strength) {
            bar.classList.add('active', nivel.clase)
        }
    })

    // Actualizar texto
    strengthText.textContent = nivel.texto
    strengthText.style.color = strength <= 1
        ? 'var(--error)'
        : strength <= 2
            ? 'var(--warning)'
            : 'var(--success)'
}

// ==================== SOLO NÚMEROS EN DNI ====================
inputDni.addEventListener('input', (e) => {
    // Filtrar todo lo que no sea dígito
    e.target.value = e.target.value.replace(/\D/g, '')
})

// ==================== MOSTRAR MENSAJES DE FEEDBACK ====================

/**
 * Muestra un mensaje de éxito o error al usuario
 * @param {string} texto - El mensaje a mostrar
 * @param {'success' | 'error'} tipo - Tipo de mensaje
 */
function mostrarMensaje(texto, tipo) {
    // Icono según el tipo de mensaje
    const icono = tipo === 'success'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`

    mensajeDiv.innerHTML = `${icono}<span>${texto}</span>`
    mensajeDiv.className = `message show message-${tipo}`

    // Ocultar automáticamente después de 5 segundos
    setTimeout(() => {
        mensajeDiv.classList.remove('show')
    }, 5000)
}

// ==================== VALIDACIÓN DE CAMPOS ====================

/**
 * Valida todos los campos del formulario de registro
 * @returns {string | null} Mensaje de error o null si todo es válido
 */
function validarCampos() {
    const nombre = inputNombre.value.trim()
    const dni = inputDni.value.trim()
    const correo = inputCorreo.value.trim()
    const password = inputPassword.value

    // Validar campos vacíos
    if (!nombre || !dni || !correo || !password) {
        return 'Todos los campos son obligatorios'
    }

    // Validar longitud del nombre
    if (nombre.length < 3) {
        return 'El nombre debe tener al menos 3 caracteres'
    }

    // Validar DNI (exactamente 8 dígitos)
    if (!/^\d{8}$/.test(dni)) {
        return 'El DNI debe tener exactamente 8 dígitos'
    }

    // Validar formato de correo electrónico
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regexCorreo.test(correo)) {
        return 'Ingresa un correo electrónico válido'
    }

    // Validar longitud mínima de la contraseña
    if (password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres'
    }

    return null // Todo válido
}

// ==================== ENVÍO DEL FORMULARIO ====================
formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Validar campos antes de enviar
    const errorValidacion = validarCampos()
    if (errorValidacion) {
        mostrarMensaje(errorValidacion, 'error')
        return
    }

    // Activar estado de carga en el botón
    btnRegistro.classList.add('loading')
    btnRegistro.disabled = true

    try {
        // Enviar datos al endpoint de registro
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: inputNombre.value.trim(),
                dni: inputDni.value.trim(),
                correo: inputCorreo.value.trim(),
                password: inputPassword.value
            })
        })

        // Parsear la respuesta JSON
        const data = await response.json()

        if (response.ok) {
            // Registro exitoso
            mostrarMensaje('¡Cuenta creada exitosamente! Redirigiendo al login...', 'success')
            formRegistro.reset()
            actualizarBarrasFortaleza(0) // Resetear indicador de fortaleza

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html'
            }, 2000)
        } else {
            // Error del servidor (correo duplicado, etc.)
            mostrarMensaje(data.mensaje || 'Error al registrar usuario', 'error')
        }

    } catch (error) {
        // Error de conexión
        console.error('Error de registro:', error)
        mostrarMensaje('Error de conexión con el servidor', 'error')
    } finally {
        // Desactivar estado de carga
        btnRegistro.classList.remove('loading')
        btnRegistro.disabled = false
    }
})
