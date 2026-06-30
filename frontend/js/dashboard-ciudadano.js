/**
 * Lógica SPA - Portal Ciudadano Wanchaq
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Verificación de Autenticación
    // ==========================================
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const API_BASE = 'http://localhost:3000/api/ciudadano';

    // ==========================================
    // 2. Navegación SPA
    // ==========================================
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item:not(.btn-logout)');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            pageTitle.textContent = item.querySelector('span').textContent;

            sections.forEach(sec => sec.classList.remove('active'));

            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Ejecutar cargas bajo demanda según sección
                if (targetId === 'sec-recoleccion') loadRecoleccion();
                if (targetId === 'sec-seguimiento') {
                    initMapIfNeeded();
                    loadTracking();
                }
                if (targetId === 'sec-mis-incidencias') loadIncidencias();
                if (targetId === 'sec-notificaciones') loadNotificaciones();
                if (targetId === 'sec-perfil') loadPerfil();
            }

            if (window.innerWidth <= 992) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Mobile Sidebar
    document.getElementById('openSidebarBtn').addEventListener('click', () => sidebar.classList.add('open'));
    document.getElementById('closeSidebarBtn').addEventListener('click', () => sidebar.classList.remove('open'));

    // Logout
    document.getElementById('btnLogoutMenu').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });

    // ==========================================
    // 3. Funciones Globales
    // ==========================================

    async function fetchAPI(endpoint, options = {}) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...options.headers } });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                throw new Error('Sesión expirada');
            }
            return await res.json();
        } catch (error) {
            console.error('Error Fetch API:', error);
            return { exito: false, mensaje: error.message };
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const emptyState = (icon, message) => `
        <div class="empty-state">
            <i class="fa-solid ${icon}"></i>
            <h3>${message}</h3>
        </div>
    `;

    // ==========================================
    // 4. Carga de Inicio (Dashboard)
    // ==========================================
    async function loadDashboard() {
        const res = await fetchAPI('/dashboard');
        if (res.exito) {
            const data = res.datos;
            const usr = data.usuario;
            
            // Navbar
            document.getElementById('userName').textContent = usr.nombre;
            document.getElementById('userAvatar').textContent = usr.nombre.charAt(0).toUpperCase();
            
            // Hero Banner
            document.getElementById('welcomeTitle').textContent = `Hola, ${usr.nombre.split(' ')[0]}`;
            const zonaName = data.zona ? data.zona.nombre : 'Sin asignar';
            document.getElementById('welcomeMeta').textContent = `Zona: ${zonaName} | Registrado el: ${formatDate(usr.created_at)}`;
            
            // Stats
            document.getElementById('dashIncidents').textContent = data.incidencias_pendientes;
            document.getElementById('dashNotifications').textContent = data.notificaciones_nuevas;

            // Load Recoleccion Info for Dashboard Cards
            const recRes = await fetchAPI('/recoleccion');
            if (recRes.exito && recRes.datos && recRes.datos.rutas && recRes.datos.rutas.length > 0) {
                const ruta = recRes.datos.rutas[0];
                document.getElementById('dashNextCollection').textContent = `${ruta.dia_semana} ${ruta.horario_inicio}`;
                document.getElementById('dashTruckStatus').textContent = ruta.camiones?.activo ? 'Activo' : 'Inactivo';
            } else {
                document.getElementById('dashNextCollection').textContent = 'No programado';
                document.getElementById('dashTruckStatus').textContent = 'N/A';
            }
        }
    }

    // ==========================================
    // 5. Sección: Mi Recolección
    // ==========================================
    async function loadRecoleccion() {
        const container = document.getElementById('recoleccionContent');
        const res = await fetchAPI('/recoleccion');
        
        if (res.exito && res.datos) {
            const { zona, rutas } = res.datos;
            if (!rutas || rutas.length === 0) {
                container.innerHTML = emptyState('fa-calendar-xmark', 'No hay rutas asignadas a tu zona aún.');
                return;
            }

            let html = `<h3>Zona Asignada: ${zona.nombre}</h3><hr>`;
            rutas.forEach(r => {
                html += `
                    <div class="info-block">
                        <p><strong>Día de Recolección:</strong> ${r.dia_semana}</p>
                        <p><strong>Horario:</strong> ${r.horario_inicio} a ${r.horario_fin}</p>
                        <p><strong>Camión Asignado:</strong> ${r.camiones ? r.camiones.placa : 'Sin camión'} (Capacidad: ${r.camiones ? r.camiones.capacidad_kg + 'kg' : '-'})</p>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = emptyState('fa-circle-exclamation', res.mensaje || 'Error al cargar.');
        }
    }

    // ==========================================
    // 6. Sección: Seguimiento (Leaflet)
    // ==========================================
    let map = null;
    let truckMarker = null;
    let trackingInterval = null;

    function initMapIfNeeded() {
        if (!map) {
            // Coordenadas Wanchaq (default)
            map = L.map('map').setView([-13.5226, -71.9673], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Ícono del camión
            const truckIcon = L.divIcon({
                html: '<div style="background-color:#1565C0;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.3);border:2px solid white;"><i class="fa-solid fa-truck" style="font-size:18px;"></i></div>',
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            truckMarker = L.marker([-13.5226, -71.9673], { icon: truckIcon, opacity: 0 }).addTo(map);
        }
        setTimeout(() => map.invalidateSize(), 300); // Repaint
    }

    async function loadTracking() {
        const badge = document.getElementById('trackingStatus');
        const updateMap = async () => {
            const res = await fetchAPI('/tracking');
            if (res.exito && res.datos) {
                const pos = res.datos;
                badge.textContent = `Última actualización: ${new Date(pos.fecha_hora).toLocaleTimeString()}`;
                badge.style.backgroundColor = 'var(--wanchaq-green-main)';
                
                truckMarker.setLatLng([pos.latitud, pos.longitud]);
                truckMarker.setOpacity(1);
                map.panTo([pos.latitud, pos.longitud]);
            } else {
                badge.textContent = 'Camión sin conexión GPS';
                badge.style.backgroundColor = 'var(--text-muted)';
                if(truckMarker) truckMarker.setOpacity(0);
            }
        };

        updateMap();
        if (trackingInterval) clearInterval(trackingInterval);
        trackingInterval = setInterval(updateMap, 30000); // 30 segundos
    }

    // Limpiar intervalo si salimos de la pestaña
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.getAttribute('data-target') !== 'sec-seguimiento') {
                if (trackingInterval) clearInterval(trackingInterval);
            }
        });
    });

    // ==========================================
    // 7. Sección: Reportar Incidencia
    // ==========================================
    const formReporte = document.getElementById('formReporte');
    formReporte.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formReporte.querySelector('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        const data = {
            descripcion: document.getElementById('descripcionReporte').value,
            foto_url: document.getElementById('fotoReporte').value || null,
            latitud: document.getElementById('latitudReporte').value ? parseFloat(document.getElementById('latitudReporte').value) : null,
            longitud: document.getElementById('longitudReporte').value ? parseFloat(document.getElementById('longitudReporte').value) : null
        };

        const res = await fetchAPI('/incidencias', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        btn.innerHTML = originalHtml;
        btn.disabled = false;

        if (res.exito) {
            alert('Incidencia reportada con éxito.');
            formReporte.reset();
            document.querySelector('.menu-item[data-target="sec-mis-incidencias"]').click();
        } else {
            alert(res.mensaje);
        }
    });

    // ==========================================
    // 8. Sección: Mis Incidencias
    // ==========================================
    async function loadIncidencias() {
        const container = document.getElementById('incidenciasContent');
        const res = await fetchAPI('/incidencias');
        
        if (res.exito && res.datos) {
            if (res.datos.length === 0) {
                container.innerHTML = emptyState('fa-clipboard-check', 'No has reportado ninguna incidencia.');
                return;
            }

            let html = `
                <table class="modern-table">
                    <thead><tr><th>Descripción</th><th>Fecha</th><th>Estado</th></tr></thead>
                    <tbody>
            `;
            res.datos.forEach(inc => {
                let badgeClass = inc.estado === 'pendiente' ? 'pendiente' : (inc.estado === 'en_proceso' ? 'en_proceso' : 'resuelto');
                let estadoFormat = inc.estado.replace('_', ' ').toUpperCase();
                html += `
                    <tr>
                        <td>${inc.descripcion.substring(0, 50)}${inc.descripcion.length > 50 ? '...' : ''}</td>
                        <td>${formatDate(inc.created_at)}</td>
                        <td><span class="status-badge ${badgeClass}">${estadoFormat}</span></td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        } else {
            container.innerHTML = emptyState('fa-circle-exclamation', 'Error al cargar incidencias.');
        }
    }

    // ==========================================
    // 9. Sección: Notificaciones
    // ==========================================
    async function loadNotificaciones() {
        const container = document.getElementById('notificacionesContent');
        const res = await fetchAPI('/notificaciones');
        
        if (res.exito && res.datos) {
            if (res.datos.length === 0) {
                container.innerHTML = emptyState('fa-bell-slash', 'No tienes notificaciones.');
                return;
            }

            let html = '';
            res.datos.forEach(n => {
                html += `
                    <div class="notification-card glass-card ${!n.leido ? 'unread' : ''}" id="notif-${n.id}">
                        <div class="notif-icon ${!n.leido ? 'blue' : 'green'}"><i class="fa-solid ${!n.leido ? 'fa-bell' : 'fa-check'}"></i></div>
                        <div class="notif-content" style="flex:1;">
                            <h4>${n.titulo}</h4>
                            <p>${n.mensaje}</p>
                            <span class="notif-time">${formatDate(n.created_at)}</span>
                            ${!n.leido ? `<button class="btn-read" onclick="marcarLeida('${n.id}')">Marcar como leída</button>` : ''}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = emptyState('fa-circle-exclamation', 'Error al cargar notificaciones.');
        }
    }

    // Global function for onclick
    window.marcarLeida = async (id) => {
        const res = await fetchAPI(`/notificaciones/${id}/leida`, { method: 'PUT' });
        if (res.exito) {
            const card = document.getElementById(`notif-${id}`);
            card.classList.remove('unread');
            const icon = card.querySelector('.notif-icon');
            icon.classList.remove('blue');
            icon.classList.add('green');
            icon.innerHTML = '<i class="fa-solid fa-check"></i>';
            card.querySelector('.btn-read').remove();
            
            // Recargar count
            loadDashboard();
        }
    };

    // ==========================================
    // 10. Sección: Mi Perfil
    // ==========================================
    async function loadPerfil() {
        const res = await fetchAPI('/perfil');
        if (res.exito && res.datos) {
            const p = res.datos;
            document.getElementById('inputProfileName').value = p.nombre;
            document.getElementById('inputProfileDni').value = p.dni;
            document.getElementById('inputProfileZona').value = p.zonas ? p.zonas.nombre : 'Sin zona';
            document.getElementById('inputProfileEmail').value = p.correo;
        }
    }

    const formPerfil = document.getElementById('formPerfil');
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formPerfil.querySelector('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
        btn.disabled = true;

        const correo = document.getElementById('inputProfileEmail').value;
        const password = document.getElementById('inputProfilePassword').value;

        const data = { correo };
        if (password) data.password = password;

        const res = await fetchAPI('/perfil', {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        btn.innerHTML = originalHtml;
        btn.disabled = false;

        if (res.exito) {
            alert('Perfil actualizado correctamente.');
            document.getElementById('inputProfilePassword').value = '';
            
            // Actualizar localStorage
            const localUser = JSON.parse(localStorage.getItem('usuario'));
            localUser.correo = correo;
            localStorage.setItem('usuario', JSON.stringify(localUser));

        } else {
            alert(res.mensaje);
        }
    });

    // Iniciar con el Dashboard
    loadDashboard();
});
