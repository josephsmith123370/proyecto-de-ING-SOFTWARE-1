/**
 * ============================================================
 * admin-register.js
 * Lógica del panel de registro administrativo
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===== ELEMENTOS DEL DOM =====
    const formRegister = document.getElementById('form-admin-register')
    const btnsTogglePassword = document.querySelectorAll('.btn-toggle-pwd')
    const mensajeError = document.getElementById('mensaje-error')
    const textoError = document.getElementById('texto-error')
    const mensajeExito = document.getElementById('mensaje-exito')
    const btnSubmit = document.getElementById('btn-submit')
    const btnText = btnSubmit.querySelector('span')
    const btnIcon = btnSubmit.querySelector('.fa-user-plus')
    const spinner = btnSubmit.querySelector('.spinner')

    // ===== CONFIGURACIÓN =====
    const API_URL = 'http://localhost:3000/api/admin/registro'

    // ===== EVENTOS =====

    // Alternar visibilidad de contraseñas
    btnsTogglePassword.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wrapper = e.currentTarget.closest('.input-wrapper')
            const input = wrapper.querySelector('input')
            const icono = btn.querySelector('i')

            if (input.getAttribute('type') === 'password') {
                input.setAttribute('type', 'text')
                icono.classList.remove('fa-eye')
                icono.classList.add('fa-eye-slash')
            } else {
                input.setAttribute('type', 'password')
                icono.classList.remove('fa-eye-slash')
                icono.classList.add('fa-eye')
            }
        })
    })

    // Enviar formulario
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault()
            
            ocultarMensajes()
            
            // Obtener valores
            const nombre = document.getElementById('nombre').value.trim()
            const dni = document.getElementById('dni').value.trim()
            const correo = document.getElementById('correo').value.trim()
            const password = document.getElementById('password').value
            const confirmPassword = document.getElementById('confirm_password').value

            // Validaciones Front-end
            if (password !== confirmPassword) {
                mostrarError('Las contraseñas no coinciden')
                return
            }

            if (password.length < 6) {
                mostrarError('La contraseña debe tener al menos 6 caracteres')
                return
            }

            // Mostrar estado de carga
            setLoadingState(true)

            try {
                // Realizar petición a la API
                const respuesta = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nombre,
                        dni,
                        correo,
                        password
                    })
                })

                const datos = await respuesta.json()

                if (datos.exito) {
                    mostrarExito('Administrador registrado correctamente. Redirigiendo...')
                    formRegister.reset()
                    
                    // Redirigir al login
                    setTimeout(() => {
                        window.location.href = 'admin-login.html'
                    }, 2000)

                } else {
                    mostrarError(datos.mensaje)
                    setLoadingState(false)
                }

            } catch (error) {
                console.error('Error en la petición:', error)
                mostrarError('Error de conexión con el servidor')
                setLoadingState(false)
            }
        })
    }

    // ===== FUNCIONES AUXILIARES =====

    function mostrarError(mensaje) {
        textoError.textContent = mensaje
        mensajeError.style.display = 'flex'
        mensajeExito.style.display = 'none'
        
        mensajeError.style.animation = 'none'
        mensajeError.offsetHeight // reflow
        mensajeError.style.animation = null
    }

    function mostrarExito(mensaje) {
        document.getElementById('texto-exito').textContent = mensaje
        mensajeExito.style.display = 'flex'
        mensajeError.style.display = 'none'
        setLoadingState(false)
        btnSubmit.style.display = 'none' // Ocultar botón durante redirección
    }

    function ocultarMensajes() {
        mensajeError.style.display = 'none'
        mensajeExito.style.display = 'none'
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            btnSubmit.disabled = true
            btnText.textContent = 'Procesando registro...'
            btnIcon.style.display = 'none'
            spinner.style.display = 'inline-block'
        } else {
            btnSubmit.disabled = false
            btnText.textContent = 'Crear Administrador'
            btnIcon.style.display = 'inline-block'
            spinner.style.display = 'none'
        }
    }
})
