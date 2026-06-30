/**
 * ============================================================
 * dashboard-admin.js
 * Lógica Core del Dashboard Administrador - Smart City Wanchaq
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==================== SEGURIDAD Y ESTADO ====================
    const token = localStorage.getItem('adminToken');
    const userDataStr = localStorage.getItem('adminUser');
    
    if (!token || !userDataStr) {
        window.location.href = 'admin-login.html';
        return;
    }

    const userData = JSON.parse(userDataStr);
    if (userData.rol !== 'admin') {
        showToast('Acceso denegado. Se requieren privilegios de administrador.', 'error');
        localStorage.clear();
        setTimeout(() => window.location.href = 'admin-login.html', 2000);
        return;
    }

    const API_BASE = 'http://localhost:3000/api/admin/dashboard';
    
    const fetchAuth = async (url, options = {}) => {
        const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        try {
            const response = await fetch(url, { ...options, headers: { ...defaultHeaders, ...options.headers } });
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'admin-login.html';
                throw new Error('Sesión expirada');
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return { exito: false, mensaje: error.message || 'Error de conexión' };
        }
    };

    // ==================== SISTEMA DE TOASTS ====================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        
        let icon = 'fa-circle-info';
        if(type === 'success') icon = 'fa-circle-check';
        if(type === 'error') icon = 'fa-circle-xmark';
        if(type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <div class="toast__icon"><i class="fa-solid ${icon}"></i></div>
            <div class="toast__message">${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 350);
        }, 4000);
    }

    // ==================== NAVEGACIÓN Y SIDEBAR ====================
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobile-toggle');

    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if(item.classList.contains('nav-item--logout')) return;
            e.preventDefault();
            
            navItems.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            if(window.innerWidth <= 992) sidebar.classList.remove('show');

            cargarDatosSeccion(targetId);
        });
    });

    // ==================== SUB-TABS (Operaciones) ====================
    const subTabs = document.querySelectorAll('.sub-tab');
    const subPanes = document.querySelectorAll('.sub-pane');
    subTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            subTabs.forEach(b => b.classList.remove('active'));
            subPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            
            // Refrescar mapas si se hacen visibles
            if(btn.dataset.tab === 'op-gps') {
                setTimeout(() => { if(mapGPS) mapGPS.invalidateSize(); }, 100);
            }
        });
    });

    // ==================== SISTEMA DE MODALES ====================
    const modalOverlay = document.getElementById('modal-container');
    const modalCloseBtn = document.getElementById('modal-btn-close');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    function abrirModal(titulo, contenidoNodeOrHtml) {
        modalTitle.textContent = titulo;
        modalBody.innerHTML = '';
        if (typeof contenidoNodeOrHtml === 'string') {
            modalBody.innerHTML = contenidoNodeOrHtml;
        } else {
            modalBody.appendChild(contenidoNodeOrHtml);
        }
        modalOverlay.classList.add('show');
    }

    function cerrarModal() {
        modalOverlay.classList.remove('show');
    }

    modalCloseBtn.addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', (e) => {
        if(e.target === modalOverlay) cerrarModal();
    });

    // Utilidades Globales de BD (Dropdowns)
    let globalUtils = { operadores: [], zonas: [], camiones: [], tipos_residuos: [] };
    async function cargarUtilidadesGlobales() {
        const res = await fetchAuth(`${API_BASE}/utilidades`);
        if (res.exito) {
            globalUtils = res;
        }
    }

    // ==================== CARGA DE SECCIONES ====================
    function cargarDatosSeccion(sectionId) {
        switch(sectionId) {
            case 'sec-centro': cargarCentroMonitoreo(); break;
            case 'sec-operaciones': 
                cargarCamiones();
                cargarRutas();
                inicializarMapaGPS();
                cargarRecolecciones();
                break;
            case 'sec-incidencias': cargarIncidenciasKanban(); break;
            case 'sec-usuarios': cargarUsuarios('todos'); break;
            case 'sec-comunicaciones': cargarNotificaciones(); break;
            case 'sec-perfil': cargarPerfil(); break;
            case 'sec-configuracion': cargarConfiguracionInicial(); break;
        }
    }

    // ==================== 1. CENTRO DE OPERACIONES ====================
    let chartUsuarios, chartIncidencias, chartResiduos, chartZonas;
    let mapCentral = null;
    let centralMarkers = [];

    async function cargarCentroMonitoreo() {
        try {
            const statsData = await fetchAuth(`${API_BASE}/stats/advanced`);
            if (statsData.exito) {
                const s = statsData.stats;
                
                // Animar contadores
                animateValue('kpi-usuarios', 0, s.totalUsuarios, 1000);
                animateValue('kpi-camiones', 0, s.camionesActivos, 1000);
                animateValue('kpi-rutas', 0, s.rutasActivas, 1000);
                animateValue('kpi-incidencias-pendientes', 0, s.incidenciasPendientes, 1000);
                animateValue('kpi-kg', 0, s.kgRecolectados, 1500);

                // Alertas
                const listAlertas = document.getElementById('lista-alertas');
                listAlertas.innerHTML = '';
                if(s.alertas && s.alertas.length > 0) {
                    s.alertas.forEach(alerta => {
                        listAlertas.innerHTML += `
                            <li class="alert-item">
                                <div class="alert-item__icon"><i class="fa-solid ${alerta.icono || 'fa-bell'}"></i></div>
                                <div class="alert-item__text">${alerta.texto}</div>
                            </li>
                        `;
                    });
                } else {
                    listAlertas.innerHTML = `
                        <li class="alert-item alert-item--success">
                            <div class="alert-item__icon"><i class="fa-solid fa-check"></i></div>
                            <div class="alert-item__text">Todos los sistemas operando nominalmente</div>
                        </li>
                    `;
                }

                // Actividad
                const listAct = document.getElementById('lista-actividad');
                listAct.innerHTML = '';
                if(s.actividadReciente.length === 0) {
                    listAct.innerHTML = '<li class="empty-state">Sin actividad reciente</li>';
                }
                s.actividadReciente.forEach(act => {
                    let icon = 'fa-info';
                    if(act.tipo==='usuario') icon = 'fa-user';
                    if(act.tipo==='incidencia') icon = 'fa-triangle-exclamation';
                    if(act.tipo==='notificacion') icon = 'fa-bell';
                    
                    const time = new Date(act.fecha).toLocaleString('es-PE');
                    listAct.innerHTML += `
                        <li class="activity-item">
                            <div class="activity-item__icon"><i class="fa-solid ${icon}"></i></div>
                            <div class="activity-item__content">
                                <div class="activity-item__text">${act.texto}</div>
                                <div class="activity-item__time">${time}</div>
                            </div>
                        </li>
                    `;
                });
            }

            // Charts
            const reportesData = await fetchAuth(`${API_BASE}/reportes`);
            if (reportesData.exito) {
                renderizarGraficosBI(reportesData.reportes);
            }

            // Mapa Central
            if(!mapCentral) {
                mapCentral = L.map('map-central').setView([-13.5226, -71.9673], 13);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap &copy; CARTO'
                }).addTo(mapCentral);
            } else {
                mapCentral.invalidateSize();
            }
            
            // Llenar mapa central con GPS e Incidencias
            centralMarkers.forEach(m => mapCentral.removeLayer(m));
            centralMarkers = [];
            
            const gpsData = await fetchAuth(`${API_BASE}/gps`);
            if(gpsData.exito && gpsData.ubicaciones) {
                gpsData.ubicaciones.forEach(loc => {
                    const m = L.circleMarker([loc.latitud, loc.longitud], {
                        radius: 8, fillColor: '#10B981', color: '#fff', weight: 2, fillOpacity: 1
                    }).bindPopup(`<b>Camión:</b> ${loc.camion?.placa || '-'}`).addTo(mapCentral);
                    centralMarkers.push(m);
                });
            }

            const incData = await fetchAuth(`${API_BASE}/incidencias`);
            if(incData.exito && incData.incidencias) {
                incData.incidencias.filter(i => i.estado === 'pendiente' && i.latitud).forEach(i => {
                    const m = L.circleMarker([i.latitud, i.longitud], {
                        radius: 6, fillColor: '#EF4444', color: '#fff', weight: 1, fillOpacity: 0.8
                    }).bindPopup(`<b>Incidencia:</b> ${i.descripcion}`).addTo(mapCentral);
                    centralMarkers.push(m);
                });
            }

        } catch (e) { console.error('Error dashboard:', e); }
    }

    function animateValue(id, start, end, duration) {
        if (start === end) return;
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) { window.requestAnimationFrame(step); }
        };
        window.requestAnimationFrame(step);
    }

    function renderizarGraficosBI(rep) {
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.font.family = 'Inter';

        // 1. Usuarios
        let cC = 0, cO = 0, cA = 0;
        rep.usuarios.forEach(u => {
            if(u.rol === 'ciudadano') cC++;
            if(u.rol === 'operador') cO++;
            if(u.rol === 'admin') cA++;
        });
        const ctxUsr = document.getElementById('chart-usuarios').getContext('2d');
        if(chartUsuarios) chartUsuarios.destroy();
        chartUsuarios = new Chart(ctxUsr, {
            type: 'doughnut',
            data: {
                labels: ['Ciudadanos', 'Operadores', 'Admin'],
                datasets: [{ data: [cC, cO, cA], backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'], borderWidth: 0, cutout: '75%' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 2. Incidencias
        let pend = 0, proc = 0, resu = 0;
        rep.incidencias.forEach(i => {
            if(i.estado === 'pendiente') pend++;
            if(i.estado === 'en_proceso') proc++;
            if(i.estado === 'resuelto') resu++;
        });
        const ctxInc = document.getElementById('chart-incidencias').getContext('2d');
        if(chartIncidencias) chartIncidencias.destroy();
        chartIncidencias = new Chart(ctxInc, {
            type: 'pie',
            data: {
                labels: ['Pendientes', 'En Proceso', 'Resueltas'],
                datasets: [{ data: [pend, proc, resu], backgroundColor: ['#EF4444', '#3B82F6', '#10B981'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 3. Recolecciones por Tipo
        const resMap = {}, colMap = {};
        rep.recolecciones.forEach(r => {
            if(r.tipo_residuo) {
                const n = r.tipo_residuo.nombre;
                resMap[n] = (resMap[n] || 0) + (r.peso_kg || 0);
                colMap[n] = r.tipo_residuo.color_hex || '#3B82F6';
            }
        });
        const ctxRes = document.getElementById('chart-residuos').getContext('2d');
        if(chartResiduos) chartResiduos.destroy();
        chartResiduos = new Chart(ctxRes, {
            type: 'bar',
            data: {
                labels: Object.keys(resMap),
                datasets: [{ data: Object.values(resMap), backgroundColor: Object.values(colMap), borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
        });

        // 4. Recolecciones por Zona
        const zonMap = {};
        rep.recolecciones.forEach(r => {
            if(r.zona) {
                const n = r.zona.nombre;
                zonMap[n] = (zonMap[n] || 0) + (r.peso_kg || 0);
            }
        });
        const ctxZon = document.getElementById('chart-zonas').getContext('2d');
        if(chartZonas) chartZonas.destroy();
        chartZonas = new Chart(ctxZon, {
            type: 'polarArea',
            data: {
                labels: Object.keys(zonMap),
                datasets: [{ data: Object.values(zonMap), backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }

    // ==================== 2. OPERACIONES ====================
    
    // --- CAMIONES ---
    async function cargarCamiones() {
        const tbody = document.querySelector('#table-camiones tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="spinner"></div> Cargando camiones...</td></tr>';
        
        const data = await fetchAuth(`${API_BASE}/camiones`);
        tbody.innerHTML = '';
        if (data.exito && data.camiones.length > 0) {
            data.camiones.forEach(c => {
                let badge = 'badge--info';
                if(c.estado === 'activo') badge = 'badge--success';
                if(c.estado === 'inactivo') badge = 'badge--danger';
                if(c.estado === 'mantenimiento') badge = 'badge--warning';

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${c.placa}</strong></td>
                        <td>${c.capacidad} kg</td>
                        <td><span class="badge ${badge}">${c.estado}</span></td>
                        <td>${c.conductor?.nombre || '<span class="text-muted">Sin asignar</span>'}</td>
                        <td>${c.rutaAsignada}</td>
                        <td>
                            <button class="btn btn--icon" onclick='editarCamionUI(${JSON.stringify(c)})' title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn--icon" onclick='eliminarCamion(${c.id})' title="Eliminar"><i class="fa-solid fa-trash" style="color:var(--red-400);"></i></button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay camiones registrados</td></tr>';
        }
    }

    document.getElementById('btn-nuevo-camion').addEventListener('click', async () => {
        await cargarUtilidadesGlobales();
        const tpl = document.getElementById('tpl-form-camion').content.cloneNode(true);
        const sel = tpl.querySelector('#camion-conductor');
        globalUtils.operadores.forEach(o => { sel.innerHTML += `<option value="${o.id}">${o.nombre}</option>`; });
        
        abrirModal('Registrar Nuevo Camión', tpl);
        
        document.getElementById('form-camion').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                placa: document.getElementById('camion-placa').value,
                capacidad: document.getElementById('camion-cap').value,
                conductor_id: document.getElementById('camion-conductor').value || null,
                estado: document.getElementById('camion-estado').value
            };
            const res = await fetchAuth(`${API_BASE}/camiones`, { method: 'POST', body: JSON.stringify(payload) });
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarCamiones(); }
            else { showToast(res.mensaje, 'error'); }
        });
    });

    window.editarCamionUI = async (c) => {
        await cargarUtilidadesGlobales();
        const tpl = document.getElementById('tpl-form-camion').content.cloneNode(true);
        const sel = tpl.querySelector('#camion-conductor');
        globalUtils.operadores.forEach(o => { sel.innerHTML += `<option value="${o.id}">${o.nombre}</option>`; });
        
        abrirModal('Editar Camión', tpl);
        
        document.getElementById('camion-id').value = c.id;
        document.getElementById('camion-placa').value = c.placa;
        document.getElementById('camion-cap').value = c.capacidad;
        if(c.conductor_id) document.getElementById('camion-conductor').value = c.conductor_id;
        document.getElementById('camion-estado').value = c.estado;

        document.getElementById('form-camion').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                placa: document.getElementById('camion-placa').value,
                capacidad: document.getElementById('camion-cap').value,
                conductor_id: document.getElementById('camion-conductor').value || null,
                estado: document.getElementById('camion-estado').value
            };
            const res = await fetchAuth(`${API_BASE}/camiones/${c.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarCamiones(); }
            else { showToast(res.mensaje, 'error'); }
        });
    };

    window.eliminarCamion = async (id) => {
        if(confirm('¿Eliminar camión permanentemente?')) {
            const res = await fetchAuth(`${API_BASE}/camiones/${id}`, { method: 'DELETE' });
            if(res.exito) { showToast(res.mensaje, 'success'); cargarCamiones(); }
            else showToast(res.mensaje, 'error');
        }
    };

    // --- RUTAS ---
    async function cargarRutas() {
        const tbody = document.querySelector('#table-rutas tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><div class="spinner"></div> Cargando rutas...</td></tr>';
        
        const data = await fetchAuth(`${API_BASE}/rutas`);
        tbody.innerHTML = '';
        if (data.exito && data.rutas.length > 0) {
            data.rutas.forEach(r => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${r.zona?.nombre || '-'}</strong></td>
                        <td>${r.camion?.placa || '-'}</td>
                        <td>${r.camion?.conductor?.nombre || '-'}</td>
                        <td>${r.horario_inicio} - ${r.horario_fin}</td>
                        <td>${r.dia_semana || 'L-D'}</td>
                        <td>
                            <button class="btn btn--icon" onclick='editarRutaUI(${JSON.stringify(r)})' title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn--icon" onclick='eliminarRuta(${r.id})' title="Eliminar"><i class="fa-solid fa-trash" style="color:var(--red-400);"></i></button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay rutas planificadas</td></tr>';
        }
    }

    document.getElementById('btn-nueva-ruta').addEventListener('click', async () => {
        await cargarUtilidadesGlobales();
        const tpl = document.getElementById('tpl-form-ruta').content.cloneNode(true);
        
        const selZ = tpl.querySelector('#ruta-zona');
        globalUtils.zonas.forEach(z => { selZ.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
        
        const selC = tpl.querySelector('#ruta-camion');
        globalUtils.camiones.forEach(c => { selC.innerHTML += `<option value="${c.id}">${c.placa}</option>`; });
        
        abrirModal('Planificar Nueva Ruta', tpl);
        
        document.getElementById('form-ruta').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                zona_id: document.getElementById('ruta-zona').value,
                camion_id: document.getElementById('ruta-camion').value,
                horario_inicio: document.getElementById('ruta-inicio').value,
                horario_fin: document.getElementById('ruta-fin').value
            };
            const res = await fetchAuth(`${API_BASE}/rutas`, { method: 'POST', body: JSON.stringify(payload) });
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarRutas(); }
            else { showToast(res.mensaje, 'error'); }
        });
    });

    window.editarRutaUI = async (r) => {
        await cargarUtilidadesGlobales();
        const tpl = document.getElementById('tpl-form-ruta').content.cloneNode(true);
        
        const selZ = tpl.querySelector('#ruta-zona');
        globalUtils.zonas.forEach(z => { selZ.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
        
        const selC = tpl.querySelector('#ruta-camion');
        globalUtils.camiones.forEach(c => { selC.innerHTML += `<option value="${c.id}">${c.placa}</option>`; });
        
        abrirModal('Editar Ruta', tpl);
        
        document.getElementById('ruta-id').value = r.id;
        document.getElementById('ruta-zona').value = r.zona_id;
        document.getElementById('ruta-camion').value = r.camion_id;
        document.getElementById('ruta-inicio').value = r.horario_inicio;
        document.getElementById('ruta-fin').value = r.horario_fin;

        document.getElementById('form-ruta').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                zona_id: document.getElementById('ruta-zona').value,
                camion_id: document.getElementById('ruta-camion').value,
                horario_inicio: document.getElementById('ruta-inicio').value,
                horario_fin: document.getElementById('ruta-fin').value
            };
            const res = await fetchAuth(`${API_BASE}/rutas/${r.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarRutas(); }
            else { showToast(res.mensaje, 'error'); }
        });
    };

    window.eliminarRuta = async (id) => {
        if(confirm('¿Eliminar ruta permanentemente?')) {
            const res = await fetchAuth(`${API_BASE}/rutas/${id}`, { method: 'DELETE' });
            if(res.exito) { showToast(res.mensaje, 'success'); cargarRutas(); }
            else showToast(res.mensaje, 'error');
        }
    };

    // --- GPS ---
    let mapGPS = null;
    let markersGPS = {};
    let intervalGPS = null;

    async function inicializarMapaGPS() {
        if (!mapGPS) {
            mapGPS = L.map('map-gps-full').setView([-13.5226, -71.9673], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO'
            }).addTo(mapGPS);
        }
        cargarUbicacionesGPS();
        if(intervalGPS) clearInterval(intervalGPS);
        intervalGPS = setInterval(cargarUbicacionesGPS, 15000);
    }

    async function cargarUbicacionesGPS() {
        try {
            const data = await fetchAuth(`${API_BASE}/gps`);
            if (data.exito && data.ubicaciones) {
                document.getElementById('gps-total-camiones').textContent = data.ubicaciones.length;
                document.getElementById('gps-last-update').textContent = new Date().toLocaleTimeString();

                data.ubicaciones.forEach(loc => {
                    const latlng = [loc.latitud, loc.longitud];
                    if(markersGPS[loc.camion_id]) {
                        markersGPS[loc.camion_id].setLatLng(latlng);
                    } else {
                        const iconHtml = `<div style="background:var(--emerald-500); width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px rgba(16,185,129,0.8);"></div>`;
                        const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [20, 20] });
                        const marker = L.marker(latlng, {icon: customIcon}).addTo(mapGPS);
                        marker.bindPopup(`<b>Placa:</b> ${loc.camion?.placa || '-'}<br><b>Conductor:</b> ${loc.camion?.conductor?.nombre || '-'}`);
                        markersGPS[loc.camion_id] = marker;
                    }
                });
            }
        } catch (e) { console.error(e); }
    }

    // --- RECOLECCIONES ---
    let rawRecolecciones = [];
    async function cargarRecolecciones() {
        await cargarUtilidadesGlobales();
        
        // Llenar filtros
        const selZ = document.getElementById('filtro-zona');
        const selT = document.getElementById('filtro-tipo');
        if(selZ.options.length === 1) {
            globalUtils.zonas.forEach(z => selZ.innerHTML += `<option value="${z.id}">${z.nombre}</option>`);
        }
        if(selT.options.length === 1) {
            globalUtils.tipos_residuos.forEach(t => selT.innerHTML += `<option value="${t.id}">${t.nombre}</option>`);
        }

        const data = await fetchAuth(`${API_BASE}/recolecciones`);
        if(data.exito) {
            rawRecolecciones = data.recolecciones;
            renderTablaRecolecciones(rawRecolecciones);
        }
    }

    function renderTablaRecolecciones(datos) {
        const tbody = document.querySelector('#table-recolecciones tbody');
        tbody.innerHTML = '';
        if(datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay recolecciones con estos filtros</td></tr>';
            return;
        }
        datos.forEach(r => {
            const fecha = new Date(r.fecha_hora).toLocaleString('es-PE');
            const zona = r.ruta?.zonas?.nombre || '-';
            const tipo = r.tipo_residuo?.nombre || 'General';
            const color = r.tipo_residuo?.color_hex || '#3B82F6';
            
            tbody.innerHTML += `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${zona}</strong></td>
                    <td><span class="badge" style="background: ${color}20; border-color:${color}; color:${color}">${tipo}</span></td>
                    <td><strong style="color:var(--emerald-400);">${r.peso_kg}</strong></td>
                    <td>${r.usuario?.nombre || '-'}</td>
                </tr>
            `;
        });
    }

    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
        const zonaId = document.getElementById('filtro-zona').value;
        const tipoId = document.getElementById('filtro-tipo').value;
        
        let filtered = rawRecolecciones;
        if(zonaId) filtered = filtered.filter(r => r.ruta?.zona_id == zonaId);
        if(tipoId) filtered = filtered.filter(r => r.tipo_residuo?.id == tipoId);
        
        renderTablaRecolecciones(filtered);
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        if(rawRecolecciones.length === 0) return showToast('No hay datos para exportar', 'warning');
        
        let csv = 'Fecha,Hora,Zona,Tipo Residuo,Peso (kg),Operador\n';
        rawRecolecciones.forEach(r => {
            const d = new Date(r.fecha_hora);
            const fecha = d.toLocaleDateString('es-PE');
            const hora = d.toLocaleTimeString('es-PE');
            const zona = r.ruta?.zonas?.nombre || '';
            const tipo = r.tipo_residuo?.nombre || '';
            const peso = r.peso_kg || 0;
            const op = r.usuario?.nombre || '';
            csv += `${fecha},${hora},"${zona}","${tipo}",${peso},"${op}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `recolecciones_wanchaq_${new Date().getTime()}.csv`);
        a.click();
    });

    // ==================== 3. INCIDENCIAS (KANBAN) ====================
    async function cargarIncidenciasKanban() {
        const pCards = document.querySelector('#kanban-pendiente .kanban__cards');
        const prCards = document.querySelector('#kanban-en-proceso .kanban__cards');
        const rCards = document.querySelector('#kanban-resuelto .kanban__cards');
        
        pCards.innerHTML = '<div class="spinner" style="margin: 20px auto; display:block;"></div>';
        prCards.innerHTML = ''; rCards.innerHTML = '';

        const data = await fetchAuth(`${API_BASE}/incidencias`);
        if(data.exito) {
            pCards.innerHTML = '';
            
            let cP=0, cPr=0, cR=0;
            
            data.incidencias.forEach(i => {
                const date = new Date(i.created_at).toLocaleString('es-PE', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
                let btns = '';
                
                if(i.estado === 'pendiente') {
                    cP++;
                    btns = `<button class="btn btn--secondary btn--sm btn--full" onclick="cambiarEstadoIncidencia(${i.id}, 'en_proceso')">Marcar En Proceso <i class="fa-solid fa-arrow-right"></i></button>`;
                } else if(i.estado === 'en_proceso') {
                    cPr++;
                    btns = `
                        <button class="btn btn--secondary btn--sm" style="flex:1;" onclick="cambiarEstadoIncidencia(${i.id}, 'pendiente')"><i class="fa-solid fa-arrow-left"></i></button>
                        <button class="btn btn--primary btn--sm" style="flex:4;" onclick="cambiarEstadoIncidencia(${i.id}, 'resuelto')"><i class="fa-solid fa-check"></i> Finalizar</button>
                    `;
                } else {
                    cR++;
                    btns = `<button class="btn btn--secondary btn--sm btn--full" disabled><i class="fa-solid fa-check-double"></i> Completada</button>`;
                }

                const cardHtml = `
                    <div class="kanban-card">
                        <div class="kanban-card__header">
                            <span class="kanban-card__user"><i class="fa-solid fa-user"></i> ${i.usuario?.nombre || 'Anónimo'}</span>
                            <span class="kanban-card__zone">${i.zona?.nombre || 'Sin Zona'}</span>
                        </div>
                        <div class="kanban-card__desc">${i.descripcion}</div>
                        ${i.foto_url ? `<img src="${i.foto_url}" class="kanban-card__image" onclick="verImagen('${i.foto_url}')" style="cursor:pointer;">` : ''}
                        <div class="kanban-card__date"><i class="fa-regular fa-clock"></i> ${date}</div>
                        <div class="kanban-card__actions">${btns}</div>
                    </div>
                `;

                if(i.estado === 'pendiente') pCards.innerHTML += cardHtml;
                else if(i.estado === 'en_proceso') prCards.innerHTML += cardHtml;
                else rCards.innerHTML += cardHtml;
            });

            document.getElementById('count-pendiente').textContent = cP;
            document.getElementById('count-en-proceso').textContent = cPr;
            document.getElementById('count-resuelto').textContent = cR;
        }
    }

    window.cambiarEstadoIncidencia = async (id, estado) => {
        const res = await fetchAuth(`${API_BASE}/incidencias/${id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
        if(res.exito) { showToast('Estado actualizado', 'success'); cargarIncidenciasKanban(); }
        else showToast('Error al actualizar', 'error');
    };

    window.verImagen = (url) => {
        abrirModal('Imagen Adjunta', `<img src="${url}" style="width:100%; border-radius:12px;">`);
    };

    // ==================== 4. GESTIÓN DE USUARIOS ====================
    async function cargarUsuarios(rolFilter = 'todos') {
        const tbody = document.querySelector('#table-usuarios tbody');
        tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><div class="spinner"></div> Cargando directorio...</td></tr>';
        
        const data = await fetchAuth(`${API_BASE}/usuarios`);
        tbody.innerHTML = '';
        if (data.exito && data.usuarios.length > 0) {
            let filtrados = data.usuarios;
            if(rolFilter !== 'todos') filtrados = filtrados.filter(u => u.rol === rolFilter);

            filtrados.forEach(u => {
                const badgeStyle = u.activo ? 'badge--success' : 'badge--danger';
                const statusTxt = u.activo ? 'Activo' : 'Bloqueado';
                const rolBadge = u.rol === 'admin' ? 'badge--purple' : (u.rol === 'operador' ? 'badge--warning' : 'badge--info');
                
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${u.nombre}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${u.dni || 'Sin DNI'}</span></td>
                        <td>${u.correo}</td>
                        <td><span class="badge ${rolBadge}">${u.rol}</span></td>
                        <td>${u.zonas?.nombre || '-'}</td>
                        <td><span class="badge ${badgeStyle}">${statusTxt}</span></td>
                        <td>${u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('es-PE') : 'Nunca'}</td>
                        <td>
                            <button class="btn btn--icon" onclick='editarUsuarioUI(${JSON.stringify(u)})' title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn--icon" onclick='toggleUsuario(${u.id}, ${!u.activo})' title="${u.activo ? 'Bloquear' : 'Desbloquear'}"><i class="fa-solid ${u.activo ? 'fa-lock' : 'fa-unlock'}" style="color:${u.activo ? 'var(--red-400)' : 'var(--emerald-400)'};"></i></button>
                            <button class="btn btn--icon" onclick='resetPassUsuario(${u.id})' title="Restablecer Contraseña"><i class="fa-solid fa-key" style="color:var(--amber-400);"></i></button>
                        </td>
                    </tr>
                `;
            });
            if(filtrados.length === 0) tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay usuarios para este filtro</td></tr>';
        }
    }

    document.querySelectorAll('[data-role]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            cargarUsuarios(e.target.dataset.role);
        });
    });

    // Crear Operador / Admin
    document.getElementById('btn-crear-operador').addEventListener('click', () => abrirFormCrearUser('operador'));
    document.getElementById('btn-crear-admin').addEventListener('click', () => abrirFormCrearUser('admin'));

    async function abrirFormCrearUser(rol) {
        await cargarUtilidadesGlobales();
        const tpl = document.getElementById('tpl-form-usuario').content.cloneNode(true);
        
        tpl.querySelector('#usr-rol-type').value = rol;
        if(rol === 'operador') {
            tpl.querySelector('#grp-zona-operador').style.display = 'block';
            const selZ = tpl.querySelector('#usr-zona');
            selZ.innerHTML = '<option value="">Sin Zona Específica</option>';
            globalUtils.zonas.forEach(z => { selZ.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
        }
        
        abrirModal(`Registrar Nuevo ${rol === 'admin' ? 'Administrador' : 'Operador'}`, tpl);
        
        document.getElementById('form-usuario').addEventListener('submit', async (e) => {
            e.preventDefault();
            const r = document.getElementById('usr-rol-type').value;
            const payload = {
                nombre: document.getElementById('usr-nombre').value,
                dni: document.getElementById('usr-dni').value,
                correo: document.getElementById('usr-correo').value,
                password: document.getElementById('usr-pass').value
            };
            if(r === 'operador') payload.zona_id = document.getElementById('usr-zona').value || null;
            
            const endpoint = r === 'admin' ? 'administradores' : 'operadores';
            const res = await fetchAuth(`${API_BASE}/${endpoint}`, { method: 'POST', body: JSON.stringify(payload) });
            
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarUsuarios(document.querySelector('[data-role].active').dataset.role); }
            else { showToast(res.mensaje, 'error'); }
        });
    }

    window.editarUsuarioUI = async (u) => {
        const tpl = document.getElementById('tpl-form-editar-user').content.cloneNode(true);
        abrirModal('Editar Usuario', tpl);
        
        document.getElementById('ed-usr-id').value = u.id;
        document.getElementById('ed-usr-nombre').value = u.nombre;
        document.getElementById('ed-usr-correo').value = u.correo;
        document.getElementById('ed-usr-dni').value = u.dni;

        document.getElementById('form-editar-user').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                nombre: document.getElementById('ed-usr-nombre').value,
                correo: document.getElementById('ed-usr-correo').value,
                dni: document.getElementById('ed-usr-dni').value
            };
            const res = await fetchAuth(`${API_BASE}/usuarios/${u.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            if(res.exito) { showToast(res.mensaje, 'success'); cerrarModal(); cargarUsuarios(document.querySelector('[data-role].active').dataset.role); }
            else { showToast(res.mensaje, 'error'); }
        });
    };

    window.toggleUsuario = async (id, activar) => {
        if(!confirm(`¿Desea ${activar ? 'desbloquear' : 'bloquear'} este acceso?`)) return;
        const res = await fetchAuth(`${API_BASE}/usuarios/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo: activar }) });
        if(res.exito) { showToast('Estado cambiado', 'success'); cargarUsuarios(document.querySelector('[data-role].active').dataset.role); }
        else showToast(res.mensaje, 'error');
    };

    window.resetPassUsuario = async (id) => {
        if(!confirm('¿Restablecer contraseña del usuario? Se generará una nueva.')) return;
        const res = await fetchAuth(`${API_BASE}/usuarios/${id}/password`, { method: 'PUT' });
        if(res.exito) { 
            abrirModal('Contraseña Restablecida', `
                <div style="text-align:center;">
                    <i class="fa-solid fa-key" style="font-size:3rem; color:var(--amber-400); margin-bottom:15px;"></i>
                    <p style="margin-bottom:15px;">La nueva contraseña para <b>${res.usuario.correo}</b> es:</p>
                    <h2 style="color:var(--emerald-400); letter-spacing:2px; background:rgba(0,0,0,0.3); padding:15px; border-radius:10px;">${res.password_temporal}</h2>
                    <p style="color:var(--text-muted); font-size:0.8rem; margin-top:15px;">Asegúrese de copiarla. El usuario deberá cambiarla al iniciar sesión.</p>
                </div>
            `);
        } else { showToast(res.mensaje, 'error'); }
    };

    // ==================== 5. COMUNICACIONES ====================
    document.getElementById('form-notificacion').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            tipo_destinatario: document.getElementById('notif-destinatario').value,
            titulo: document.getElementById('notif-titulo').value,
            mensaje: document.getElementById('notif-mensaje').value
        };
        const res = await fetchAuth(`${API_BASE}/notificaciones`, { method: 'POST', body: JSON.stringify(payload) });
        if(res.exito) { 
            showToast('Notificación enviada con éxito', 'success'); 
            e.target.reset(); 
            cargarNotificaciones(); 
        } else { showToast(res.mensaje, 'error'); }
    });

    async function cargarNotificaciones() {
        const lista = document.getElementById('lista-notificaciones');
        lista.innerHTML = '<div class="spinner"></div>';
        const res = await fetchAuth(`${API_BASE}/notificaciones`);
        if(res.exito && res.notificaciones.length > 0) {
            lista.innerHTML = '';
            res.notificaciones.forEach(n => {
                const icon = n.tipo_destinatario === 'todos' ? 'fa-globe' : (n.tipo_destinatario === 'ciudadanos' ? 'fa-users' : 'fa-user-gear');
                lista.innerHTML += `
                    <div class="notif-item">
                        <div class="notif-item__icon"><i class="fa-solid ${icon}"></i></div>
                        <div class="notif-item__content">
                            <div class="notif-item__title">${n.titulo}</div>
                            <div class="notif-item__msg">${n.mensaje}</div>
                            <div class="notif-item__meta">Enviado a: ${n.tipo_destinatario.toUpperCase()} • ${new Date(n.created_at).toLocaleString('es-PE')}</div>
                        </div>
                    </div>
                `;
            });
        } else { lista.innerHTML = '<div class="empty-state">No hay notificaciones enviadas</div>'; }
    }

    // ==================== 6. MI PERFIL ====================
    function cargarPerfil() {
        document.getElementById('perfil-nombre').textContent = userData.nombre;
        document.getElementById('perfil-correo').textContent = userData.correo;
        // Fetch full info to show DNI
        fetchAuth(`${API_BASE}/usuarios`).then(res => {
            if(res.exito) {
                const me = res.usuarios.find(u => u.id === userData.id);
                if(me) {
                    document.getElementById('perfil-dni').textContent = me.dni || '-';
                    document.getElementById('perfil-registro').textContent = new Date(me.created_at).toLocaleDateString('es-PE');
                    document.getElementById('perfil-login').textContent = me.ultimo_login ? new Date(me.ultimo_login).toLocaleString('es-PE') : 'Actual';
                }
            }
        });
    }

    // ==================== 7. CONFIGURACIÓN ====================
    function cargarConfiguracionInicial() {
        document.getElementById('conf-nombre').value = userData.nombre;
        document.getElementById('conf-correo').value = userData.correo;
        document.getElementById('conf-animaciones').checked = localStorage.getItem('animaciones') !== 'false';
    }

    document.getElementById('form-configuracion').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Guardar preferencia visual
        const anim = document.getElementById('conf-animaciones').checked;
        localStorage.setItem('animaciones', anim);
        if(!anim) document.body.style.background = 'var(--bg-slate-900)';
        else document.body.style.background = ''; // Revert to mesh

        const payload = {
            nombre: document.getElementById('conf-nombre').value,
            correo: document.getElementById('conf-correo').value
        };
        const psw = document.getElementById('conf-password').value;
        if(psw) payload.password = psw;

        const res = await fetchAuth(`${API_BASE}/configuracion/${userData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        if(res.exito) {
            showToast('Configuración guardada. Inicie sesión nuevamente.', 'success');
            setTimeout(() => document.getElementById('btn-logout').click(), 2000);
        } else { showToast(res.mensaje, 'error'); }
    });

    // ==================== LOGOUT ====================
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'admin-login.html';
    });

    // Aplicar config de animaciones al cargar
    if(localStorage.getItem('animaciones') === 'false') {
        document.body.style.background = 'var(--bg-slate-900)';
    }

    // Init
    cargarCentroMonitoreo();
});
