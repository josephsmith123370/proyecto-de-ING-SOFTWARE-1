/**
 * ============================================================
 * dashboard-operador.js
 * Lógica SPA y manejo de sesión para el Dashboard de Operador
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // ===== VERIFICACIÓN DE SESIÓN =====
    const token = localStorage.getItem('operadorToken')
    const userDataStr = localStorage.getItem('operadorUser')

    // Si no hay token o datos de usuario, redirigir al login
    if (!token || !userDataStr) {
        window.location.href = 'operador-login.html'
        return
    }

    let usuario = {}
    try {
        usuario = JSON.parse(userDataStr)
    } catch (e) {
        console.error('Error parseando datos de usuario:', e)
        window.location.href = 'operador-login.html'
        return
    }

    // Verificar que el rol sea operador
    if (usuario.rol !== 'operador') {
        alert('Acceso denegado: No tienes rol de operador.')
        window.location.href = 'index.html' // o login
        return
    }

    // ===== POBLAR DATOS DE USUARIO EN LA UI =====
    
    // Obtener inicial para los avatares
    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'O'
    
    // Navbar
    const userAvatar = document.getElementById('userAvatar')
    const userName = document.getElementById('userName')
    if (userAvatar) userAvatar.textContent = inicial
    if (userName) userName.textContent = usuario.nombre.split(' ')[0] // Mostrar solo primer nombre

    // Título de bienvenida
    const welcomeTitle = document.getElementById('welcomeTitle')
    if (welcomeTitle) welcomeTitle.textContent = `¡Buen turno, ${usuario.nombre.split(' ')[0]}!`

    // Sección Mi Perfil
    const profileAvatar = document.getElementById('profileAvatar')
    const profileName = document.getElementById('profileName')
    
    const inputProfileName = document.getElementById('inputProfileName')
    const inputProfileDni = document.getElementById('inputProfileDni')
    const inputProfileEmail = document.getElementById('inputProfileEmail')

    if (profileAvatar) profileAvatar.textContent = inicial
    if (profileName) profileName.textContent = usuario.nombre
    
    if (inputProfileName) inputProfileName.value = usuario.nombre
    if (inputProfileDni) inputProfileDni.value = usuario.dni || 'No registrado'
    if (inputProfileEmail) inputProfileEmail.value = usuario.correo


    // ===== NAVEGACIÓN SPA (Single Page Application) =====
    
    const menuItems = document.querySelectorAll('.menu-item')
    const sections = document.querySelectorAll('.dashboard-section')
    const pageTitle = document.getElementById('pageTitle')
    
    // Nombres de secciones para el título del Navbar
    const sectionTitles = {
        'sec-inicio': 'Dashboard Operador',
        'sec-ruta': 'Mi Ruta',
        'sec-camion': 'Mi Camión',
        'sec-recolecciones': 'Registrar Recolecciones',
        'sec-incidencias': 'Reportar Incidencias',
        'sec-notificaciones': 'Notificaciones',
        'sec-perfil': 'Mi Perfil'
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 1. Quitar active de todos los items
            menuItems.forEach(m => m.classList.remove('active'))
            
            // 2. Poner active al item clickeado
            item.classList.add('active')
            
            // 3. Ocultar todas las secciones
            sections.forEach(sec => sec.classList.remove('active'))
            
            // 4. Mostrar la sección correspondiente
            const targetId = item.getAttribute('data-target')
            const targetSection = document.getElementById(targetId)
            
            if (targetSection) {
                targetSection.classList.add('active')
                
                // Actualizar título de la página en el navbar
                if (pageTitle && sectionTitles[targetId]) {
                    pageTitle.textContent = sectionTitles[targetId]
                }
            }

            // En móviles, cerrar el sidebar al seleccionar una opción
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active')
            }
        })
    })

    // ===== CONTROL DEL SIDEBAR (MÓVIL) =====
    
    const sidebar = document.getElementById('sidebar')
    const openSidebarBtn = document.getElementById('openSidebarBtn')
    const closeSidebarBtn = document.getElementById('closeSidebarBtn')

    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('active')
        })
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('active')
        })
    }

    // Cerrar sidebar al hacer clic fuera de él en móviles
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                e.target !== openSidebarBtn && 
                !openSidebarBtn.contains(e.target)) {
                sidebar.classList.remove('active')
            }
        }
    })

    // ===== CERRAR SESIÓN =====
    
    const btnLogout = document.getElementById('btnLogout')
    
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                // Eliminar datos de localStorage
                localStorage.removeItem('operadorToken')
                localStorage.removeItem('operadorUser')
                
                // Redirigir al login
                window.location.href = 'operador-login.html'
            }
        })
    }

})
