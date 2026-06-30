/**
 * ============================================================
 * login.js
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Maneja el inicio de sesión de ciudadanos:
 * - Validación de campos del formulario
 * - Toggle de visibilidad de contraseña
 * - Envío de credenciales a la API con fetch
 * - Almacenamiento del JWT en localStorage
 * - Redirección al dashboard del ciudadano
 * ============================================================
 */

// URL base de la API (ajustar según el entorno)
const API_URL = 'http://localhost:3000/api/usuarios'

// ==================== REFERENCIAS AL DOM ====================
const formLogin = document.getElementById('formLogin')
const inputCorreo = document.getElementById('correo')
const inputPassword = document.getElementById('password')
const btnLogin = document.getElementById('btnLogin')
const mensajeDiv = document.getElementById('mensaje')
const togglePasswordBtn = document.getElementById('togglePassword')

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
 * Valida los campos del formulario de login
 * @returns {string | null} Mensaje de error o null si todo es válido
 */
function validarCampos() {
    const correo = inputCorreo.value.trim()
    const password = inputPassword.value

    // Validar campos vacíos
    if (!correo || !password) {
        return 'Todos los campos son obligatorios'
    }

    // Validar formato de correo electrónico
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regexCorreo.test(correo)) {
        return 'Ingresa un correo electrónico válido'
    }

    return null // Todo válido
}

// ==================== ENVÍO DEL FORMULARIO ====================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Validar campos antes de enviar
    const errorValidacion = validarCampos()
    if (errorValidacion) {
        mostrarMensaje(errorValidacion, 'error')
        return
    }

    // Activar estado de carga en el botón
    btnLogin.classList.add('loading')
    btnLogin.disabled = true

    try {
        // Enviar credenciales al endpoint de login
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo: inputCorreo.value.trim(),
                password: inputPassword.value
            })
        })

        // Parsear la respuesta JSON
        const data = await response.json()

        if (response.ok) {
            // ===== LOGIN EXITOSO =====

            // Guardar JWT en localStorage
            localStorage.setItem('token', data.token)

            // Guardar datos del usuario en localStorage
            localStorage.setItem('usuario', JSON.stringify(data.usuario))

            // Mostrar mensaje de éxito
            mostrarMensaje(`¡Bienvenido, ${data.usuario.nombre}!`, 'success')

            // Redirigir al dashboard del ciudadano después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'dashboard-ciudadano.html'
            }, 1500)
        } else {
            // Error de autenticación (credenciales incorrectas)
            mostrarMensaje(data.mensaje || 'Credenciales incorrectas', 'error')
        }

    } catch (error) {
        // Error de conexión con el servidor
        console.error('Error de login:', error)
        mostrarMensaje('Error de conexión con el servidor', 'error')
    } finally {
        // Desactivar estado de carga
        btnLogin.classList.remove('loading')
        btnLogin.disabled = false
    }
})
