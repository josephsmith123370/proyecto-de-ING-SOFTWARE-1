/**
 * ============================================================
 * operador-register.js
 * Lógica de validación y registro de operadores
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    const formRegistro = document.getElementById('form-operador-register')
    const btnSubmit = document.getElementById('btn-submit')
    const btnText = btnSubmit.querySelector('span')
    const btnIcon = btnSubmit.querySelector('.fa-user-plus')
    const spinner = btnSubmit.querySelector('.spinner')
    
    const mensajeError = document.getElementById('mensaje-error')
    const textoError = document.getElementById('texto-error')
    const mensajeExito = document.getElementById('mensaje-exito')
    const textoExito = document.getElementById('texto-exito')

    const API_REGISTRO = 'http://localhost:3000/api/operador/registro'

    // Botones para mostrar/ocultar contraseña
    const btnsTogglePwd = document.querySelectorAll('.btn-toggle-pwd')
    btnsTogglePwd.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling
            const icono = this.querySelector('i')
            
            if (input.type === 'password') {
                input.type = 'text'
                icono.classList.remove('fa-eye')
                icono.classList.add('fa-eye-slash')
            } else {
                input.type = 'password'
                icono.classList.remove('fa-eye-slash')
                icono.classList.add('fa-eye')
            }
        })
    })

    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault()
            
            ocultarMensajes()
            setLoadingState(true)

            const nombre = document.getElementById('nombre').value.trim()
            const dni = document.getElementById('dni').value.trim()
            const correo = document.getElementById('correo').value.trim()
            const password = document.getElementById('password').value
            const confirm_password = document.getElementById('confirm_password').value

            // Validaciones locales
            if (password !== confirm_password) {
                mostrarError('Las contraseñas no coinciden')
                setLoadingState(false)
                return
            }

            if (password.length < 6) {
                mostrarError('La contraseña debe tener al menos 6 caracteres')
                setLoadingState(false)
                return
            }

            try {
                const respuesta = await fetch(API_REGISTRO, {
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
                    mostrarExito(datos.mensaje)
                    formRegistro.reset()
                    
                    // Redirigir al login después de 2 segundos
                    setTimeout(() => {
                        window.location.href = 'operador-login.html'
                    }, 2000)
                } else {
                    mostrarError(datos.mensaje)
                }

            } catch (error) {
                console.error('Error:', error)
                mostrarError('Error de conexión con el servidor')
            } finally {
                setLoadingState(false)
            }
        })
    }

    function mostrarError(mensaje) {
        textoError.textContent = mensaje
        mensajeError.style.display = 'flex'
        
        mensajeError.style.animation = 'none'
        mensajeError.offsetHeight
        mensajeError.style.animation = null
    }

    function mostrarExito(mensaje) {
        textoExito.textContent = mensaje
        mensajeExito.style.display = 'flex'
        
        mensajeExito.style.animation = 'none'
        mensajeExito.offsetHeight
        mensajeExito.style.animation = null
    }

    function ocultarMensajes() {
        mensajeError.style.display = 'none'
        mensajeExito.style.display = 'none'
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            btnSubmit.disabled = true
            btnText.textContent = 'Registrando...'
            btnIcon.style.display = 'none'
            spinner.style.display = 'inline-block'
        } else {
            btnSubmit.disabled = false
            btnText.textContent = 'Registrar Operador'
            btnIcon.style.display = 'inline-block'
            spinner.style.display = 'none'
        }
    }
})
