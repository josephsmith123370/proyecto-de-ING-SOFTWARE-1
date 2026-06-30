/**
 * ============================================================
 * operador-login.js
 * Lógica del panel de acceso de operadores (OTP y JWT)
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===== ELEMENTOS DEL DOM (LOGIN) =====
    const formLogin = document.getElementById('form-operador-login')
    const btnTogglePassword = document.getElementById('btn-toggle-password')
    const inputPassword = document.getElementById('password')
    const mensajeError = document.getElementById('mensaje-error')
    const textoError = document.getElementById('texto-error')
    const btnSubmit = document.getElementById('btn-submit')
    const btnText = btnSubmit.querySelector('span')
    const btnIcon = btnSubmit.querySelector('.fa-arrow-right-to-bracket')
    const spinner = btnSubmit.querySelector('.spinner')

    // ===== ELEMENTOS DEL DOM (OTP MODAL) =====
    const otpModal = document.getElementById('otp-modal')
    const btnVerifyOTP = document.getElementById('btn-verify-otp')
    const btnResendOTP = document.getElementById('btn-resend-otp')
    const otpBoxes = document.querySelectorAll('.otp-box')
    const modalMensaje = document.getElementById('modal-mensaje')
    const modalTexto = document.getElementById('modal-texto')

    // ===== CONFIGURACIÓN =====
    const API_LOGIN = 'http://localhost:3000/api/operador/login'
    const API_VERIFY = 'http://localhost:3000/api/operador/verify-otp'
    const API_RESEND = 'http://localhost:3000/api/operador/resend-otp'

    // Estado global
    let operadorCorreoActual = null;

    // ===== EVENTOS =====

    // Alternar visibilidad de contraseña
    if (btnTogglePassword && inputPassword) {
        btnTogglePassword.addEventListener('click', () => {
            const tipoActual = inputPassword.getAttribute('type')
            const icono = btnTogglePassword.querySelector('i')

            if (tipoActual === 'password') {
                inputPassword.setAttribute('type', 'text')
                icono.classList.remove('fa-eye')
                icono.classList.add('fa-eye-slash')
            } else {
                inputPassword.setAttribute('type', 'password')
                icono.classList.remove('fa-eye-slash')
                icono.classList.add('fa-eye')
            }
        })
    }

    // Enviar formulario
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault()

            // Ocultar errores previos
            ocultarError()

            // Mostrar estado de carga
            setLoadingState(true)

            // Obtener valores
            const correo = document.getElementById('correo').value.trim()
            const password = inputPassword.value

            try {
                // Realizar petición a la API
                const respuesta = await fetch(API_LOGIN, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        correo,
                        password
                    })
                })

                const datos = await respuesta.json()

                if (datos.exito && datos.requireOTP) {
                    // Mostrar modal OTP
                    operadorCorreoActual = datos.correo
                    otpModal.style.display = 'flex'
                    setLoadingState(false)
                } else if (datos.exito && !datos.requireOTP) {
                    iniciarSesion(datos.token, datos.usuario)
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

    // ===== EVENTOS OTP =====

    // Lógica de cajas OTP (Apple-style)
    otpBoxes.forEach((box, index) => {
        // Auto-avance
        box.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < otpBoxes.length - 1) {
                    otpBoxes[index + 1].focus()
                }
            }
        })

        // Retroceso con Backspace
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '') {
                if (index > 0) {
                    otpBoxes[index - 1].focus()
                }
            }
        })

        // Soporte para pegar código
        box.addEventListener('paste', (e) => {
            e.preventDefault()
            const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '')
            if (pastedData) {
                pastedData.split('').forEach((char, i) => {
                    if (i < otpBoxes.length) {
                        otpBoxes[i].value = char
                        if (i < otpBoxes.length - 1) otpBoxes[i + 1].focus()
                        else otpBoxes[i].blur()
                    }
                })
            }
        })
    })

    function obtenerCodigoOTP() {
        let codigo = ''
        otpBoxes.forEach(box => codigo += box.value)
        return codigo
    }

    // Verificar OTP
    if (btnVerifyOTP) {
        btnVerifyOTP.addEventListener('click', async () => {
            const codigo_otp = obtenerCodigoOTP()
            if (codigo_otp.length !== 6) {
                mostrarErrorModal('Ingrese un código de 6 dígitos')
                return
            }

            setLoadingModal(true)
            ocultarErrorModal()

            try {
                const respuesta = await fetch(API_VERIFY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: operadorCorreoActual, codigo_otp })
                })
                const datos = await respuesta.json()

                if (datos.exito) {
                    iniciarSesion(datos.token, datos.usuario, btnVerifyOTP)
                } else {
                    mostrarErrorModal(datos.mensaje)
                    setLoadingModal(false)
                }
            } catch (error) {
                mostrarErrorModal('Error al verificar código')
                setLoadingModal(false)
            }
        })
    }

    // Reenviar OTP
    if (btnResendOTP) {
        btnResendOTP.addEventListener('click', async () => {
            btnResendOTP.disabled = true
            btnResendOTP.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando...'

            try {
                const respuesta = await fetch(API_RESEND, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: operadorCorreoActual })
                })
                const datos = await respuesta.json()

                if (datos.exito) {
                    // Iniciar cooldown visual de 30 segundos
                    let segundos = 30
                    const timer = setInterval(() => {
                        segundos--
                        btnResendOTP.innerHTML = `<i class="fa-solid fa-clock"></i> Espere ${segundos}s`
                        if (segundos <= 0) {
                            clearInterval(timer)
                            btnResendOTP.disabled = false
                            btnResendOTP.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reenviar código'
                        }
                    }, 1000)
                } else {
                    mostrarErrorModal(datos.mensaje)
                    btnResendOTP.disabled = false
                    btnResendOTP.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reenviar código'
                }
            } catch (error) {
                mostrarErrorModal('Error al reenviar código')
                btnResendOTP.disabled = false
                btnResendOTP.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Reenviar código'
            }
        })
    }

    // ===== FUNCIONES AUXILIARES =====

    function mostrarError(mensaje) {
        textoError.textContent = mensaje
        mensajeError.style.display = 'flex'

        // Reiniciar la animación (truco para reflow)
        mensajeError.style.animation = 'none'
        mensajeError.offsetHeight // trigger reflow
        mensajeError.style.animation = null
    }

    function ocultarError() {
        mensajeError.style.display = 'none'
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            btnSubmit.disabled = true
            btnText.textContent = 'Verificando credenciales...'
            btnIcon.style.display = 'none'
            spinner.style.display = 'inline-block'
        } else {
            btnSubmit.disabled = false
            btnText.textContent = 'Acceder como Operador'
            btnIcon.style.display = 'inline-block'
            spinner.style.display = 'none'
        }
    }

    function mostrarErrorModal(mensaje) {
        modalTexto.textContent = mensaje
        modalMensaje.style.display = 'flex'
        modalMensaje.style.animation = 'none'
        modalMensaje.offsetHeight
        modalMensaje.style.animation = null
    }

    function ocultarErrorModal() {
        modalMensaje.style.display = 'none'
    }

    function setLoadingModal(isLoading) {
        const btnTextModal = btnVerifyOTP.querySelector('span')
        const btnIconModal = btnVerifyOTP.querySelector('.fa-check')
        const spinnerModal = btnVerifyOTP.querySelector('.spinner')

        if (isLoading) {
            btnVerifyOTP.disabled = true
            btnTextModal.textContent = 'Verificando...'
            btnIconModal.style.display = 'none'
            spinnerModal.style.display = 'inline-block'
        } else {
            btnVerifyOTP.disabled = false
            btnTextModal.textContent = 'Verificar Acceso'
            btnIconModal.style.display = 'inline-block'
            spinnerModal.style.display = 'none'
        }
    }

    function iniciarSesion(token, usuario, buttonElement = btnSubmit) {
        localStorage.setItem('operadorToken', token)
        localStorage.setItem('operadorUser', JSON.stringify(usuario))

        buttonElement.style.background = 'linear-gradient(135deg, #059669, #10B981)'

        const btnSpan = buttonElement.querySelector('span')
        if (btnSpan) btnSpan.textContent = 'Acceso Concedido'

        const icon = buttonElement.querySelector('i:not(.fa-spin)')
        if (icon) icon.className = 'fa-solid fa-check'

        const spin = buttonElement.querySelector('.spinner')
        if (spin) spin.style.display = 'none'

        setTimeout(() => {
            window.location.href = 'dashboard-operador.html'
        }, 1000)
    }
})
