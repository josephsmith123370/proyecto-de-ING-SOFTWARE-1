/**
 * ============================================================
 * admin-dashboard.controller.js
 * Controlador para el Dashboard Administrativo Inteligente
 * Centro de Operaciones Municipal - Wanchaq
 * ============================================================
 */

import { supabase } from '../config/supabase.js'
import bcrypt from 'bcrypt'

// ==================== DASHBOARD PRINCIPAL (ESTADÍSTICAS AVANZADAS) ====================
export const getStatsAdvanced = async (req, res) => {
    try {
        const stats = {
            totalUsuarios: 0,
            totalCiudadanos: 0,
            totalOperadores: 0,
            totalAdmin: 0,
            camionesActivos: 0,
            camionesInactivos: 0,
            rutasActivas: 0,
            rutasProgramadas: 0,
            incidenciasPendientes: 0,
            incidenciasEnProceso: 0,
            incidenciasResueltas: 0,
            notificacionesEnviadas: 0,
            kgRecolectados: 0,
            actividadReciente: [],
            operadoresInactivos: 0,
            alertas: []
        };

        // 1. Usuarios por Rol
        const { data: usuarios } = await supabase.from('usuarios').select('rol, activo, id');
        if (usuarios) {
            stats.totalUsuarios = usuarios.length;
            stats.totalCiudadanos = usuarios.filter(u => u.rol === 'ciudadano').length;
            stats.totalOperadores = usuarios.filter(u => u.rol === 'operador').length;
            stats.totalAdmin = usuarios.filter(u => u.rol === 'admin').length;
            stats.operadoresInactivos = usuarios.filter(u => u.rol === 'operador' && !u.activo).length;
            if (stats.operadoresInactivos > 0) {
                stats.alertas.push({ tipo: 'operador', texto: `Hay ${stats.operadoresInactivos} operadores inactivos`, icono: 'fa-user-lock' });
            }
        }

        // 2. Camiones
        const { data: camiones } = await supabase.from('camiones').select('estado, id, placa');
        if (camiones) {
            stats.camionesActivos = camiones.filter(c => c.estado === 'activo').length;
            stats.camionesInactivos = camiones.filter(c => c.estado !== 'activo').length;
            if (stats.camionesInactivos > 0) {
                stats.alertas.push({ tipo: 'camion', texto: `${stats.camionesInactivos} camiones inactivos en la flota`, icono: 'fa-truck-ramp-box' });
            }
        }

        // 3. Rutas
        const currentHour = new Date().toTimeString().substring(0, 5);
        const { data: rutas } = await supabase.from('rutas').select('id, horario_inicio, horario_fin');
        if (rutas) {
            stats.rutasProgramadas = rutas.length;
            stats.rutasActivas = rutas.filter(r => r.horario_inicio <= currentHour && r.horario_fin >= currentHour).length;
            if (stats.rutasProgramadas > 0 && stats.rutasActivas === 0) {
                stats.alertas.push({ tipo: 'ruta', texto: 'No hay rutas ejecutándose en este momento', icono: 'fa-route' });
            }
        }

        // 4. Incidencias
        const { data: incidencias } = await supabase.from('incidencias').select('estado, id');
        if (incidencias) {
            stats.incidenciasPendientes = incidencias.filter(i => i.estado === 'pendiente').length;
            stats.incidenciasEnProceso = incidencias.filter(i => i.estado === 'en_proceso').length;
            stats.incidenciasResueltas = incidencias.filter(i => i.estado === 'resuelto').length;
            if (stats.incidenciasPendientes > 0) {
                stats.alertas.push({ tipo: 'incidencia', texto: `${stats.incidenciasPendientes} incidencias pendientes de revisión`, icono: 'fa-triangle-exclamation' });
            }
        }

        // 5. Notificaciones
        const { count: notificacionesCount } = await supabase.from('notificaciones').select('*', { count: 'exact', head: true });
        stats.notificacionesEnviadas = notificacionesCount || 0;

        // 6. Kg Recolectados (total)
        const { data: recolecciones } = await supabase.from('recolecciones').select('peso_kg');
        if (recolecciones) {
            stats.kgRecolectados = recolecciones.reduce((sum, r) => sum + (r.peso_kg || 0), 0);
        }

        // 7. Actividad Reciente
        const { data: recUsuarios } = await supabase.from('usuarios').select('id, nombre, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: recIncidencias } = await supabase.from('incidencias').select('id, descripcion, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: recNotif } = await supabase.from('notificaciones').select('id, titulo, created_at').order('created_at', { ascending: false }).limit(3);
        
        let actividades = [];
        if(recUsuarios) recUsuarios.forEach(u => actividades.push({ tipo: 'usuario', texto: `Nuevo usuario: ${u.nombre}`, fecha: u.created_at }));
        if(recIncidencias) recIncidencias.forEach(i => actividades.push({ tipo: 'incidencia', texto: `Incidencia: ${i.descripcion?.substring(0, 40) || 'Sin descripción'}`, fecha: i.created_at }));
        if(recNotif) recNotif.forEach(n => actividades.push({ tipo: 'notificacion', texto: `Notificación: ${n.titulo}`, fecha: n.created_at }));

        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        stats.actividadReciente = actividades.slice(0, 8);

        res.json({ exito: true, stats });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener estadísticas', error: error.message });
    }
}

// ==================== USUARIOS ====================
export const getUsuarios = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, dni, correo, rol, activo, ultimo_login, created_at, zona_id, zonas(nombre)')
            .in('rol', ['admin', 'operador', 'ciudadano'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, usuarios: data });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener usuarios', error: error.message });
    }
}

export const updateUsuarioStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        const { data, error } = await supabase
            .from('usuarios')
            .update({ activo })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Estado actualizado', usuario: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar usuario', error: error.message });
    }
}

export const editarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, dni, zona_id } = req.body;

        let updates = {};
        if (nombre) updates.nombre = nombre;
        if (correo) updates.correo = correo;
        if (dni) updates.dni = dni;
        if (zona_id !== undefined) updates.zona_id = zona_id || null;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ exito: false, mensaje: 'No hay datos para actualizar' });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', id)
            .select('id, nombre, dni, correo, rol, activo, zona_id');

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Usuario actualizado', usuario: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al editar usuario', error: error.message });
    }
}

export const restablecerPassword = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Generar contraseña temporal
        const tempPassword = 'Wanchaq' + Math.floor(1000 + Math.random() * 9000);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const { data, error } = await supabase
            .from('usuarios')
            .update({ password_hash: hashedPassword })
            .eq('id', id)
            .select('id, nombre, correo');

        if (error) throw error;
        
        res.json({ 
            exito: true, 
            mensaje: 'Contraseña restablecida', 
            password_temporal: tempPassword,
            usuario: data[0] 
        });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al restablecer contraseña', error: error.message });
    }
}

// ==================== OPERADORES ====================
export const crearOperador = async (req, res) => {
    try {
        const { nombre, dni, correo, password, zona_id } = req.body;
        
        // Verificar correo existente
        const { data: usuarioExistente } = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', correo)
            .maybeSingle();

        if (usuarioExistente) {
            return res.status(400).json({ exito: false, mensaje: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nombre, dni, correo,
                password_hash: hashedPassword,
                rol: 'operador',
                activo: true,
                zona_id: zona_id || null
            }])
            .select();

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Operador creado exitosamente', usuario: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al crear operador', error: error.message });
    }
}

// ==================== ADMINISTRADORES ====================
export const crearAdmin = async (req, res) => {
    try {
        const { nombre, dni, correo, password } = req.body;

        if (!nombre || !dni || !correo || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
        }

        // Verificar correo existente
        const { data: existe } = await supabase
            .from('usuarios')
            .select('id')
            .eq('correo', correo.trim().toLowerCase())
            .maybeSingle();

        if (existe) {
            return res.status(400).json({ exito: false, mensaje: 'El correo ya está registrado' });
        }

        // Verificar DNI
        const { data: dniExiste } = await supabase
            .from('usuarios')
            .select('id')
            .eq('dni', dni)
            .maybeSingle();

        if (dniExiste) {
            return res.status(400).json({ exito: false, mensaje: 'El DNI ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nombre: nombre.trim(),
                dni,
                correo: correo.trim().toLowerCase(),
                password_hash: hashedPassword,
                rol: 'admin',
                activo: true
            }])
            .select();

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Administrador creado exitosamente', usuario: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al crear administrador', error: error.message });
    }
}

// ==================== CONFIGURACIÓN Y PERFIL ====================
export const actualizarConfiguracion = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, password } = req.body;

        let updates = {};
        if (nombre) updates.nombre = nombre;
        if (correo) updates.correo = correo;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ exito: false, mensaje: 'No hay datos para actualizar' });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Configuración actualizada', usuario: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar configuración', error: error.message });
    }
}

// ==================== CAMIONES ====================
export const getCamiones = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('camiones')
            .select(`*, conductor:usuarios(id, nombre), rutas(zona_id, zonas(nombre))`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const camionesFormat = data.map(c => {
            const rutaAsignada = c.rutas && c.rutas.length > 0 && c.rutas[0].zonas ? c.rutas[0].zonas.nombre : 'Sin asignar';
            return { ...c, rutaAsignada };
        });

        res.json({ exito: true, camiones: camionesFormat });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener camiones', error: error.message });
    }
}

export const createCamion = async (req, res) => {
    try {
        const { placa, capacidad, conductor_id, estado } = req.body;
        const { data, error } = await supabase.from('camiones').insert([{ placa, capacidad, conductor_id: conductor_id || null, estado: estado || 'activo' }]).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Camión registrado', camion: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al registrar camión', error: error.message });
    }
}

export const updateCamion = async (req, res) => {
    try {
        const { id } = req.params;
        const { placa, capacidad, conductor_id, estado } = req.body;
        let updates = {};
        if (placa !== undefined) updates.placa = placa;
        if (capacidad !== undefined) updates.capacidad = capacidad;
        if (conductor_id !== undefined) updates.conductor_id = conductor_id || null;
        if (estado !== undefined) updates.estado = estado;

        const { data, error } = await supabase.from('camiones').update(updates).eq('id', id).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Camión actualizado', camion: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar camión', error: error.message });
    }
}

export const deleteCamion = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('camiones').delete().eq('id', id);
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Camión eliminado' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar camión', error: error.message });
    }
}

// ==================== RUTAS ====================
export const getRutas = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rutas')
            .select(`*, zona:zonas(id, nombre), camion:camiones(id, placa, conductor:usuarios(id, nombre))`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, rutas: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener rutas', error: error.message });
    }
}

export const createRuta = async (req, res) => {
    try {
        const { zona_id, camion_id, horario_inicio, horario_fin, dia_semana } = req.body;
        const insertData = { zona_id, camion_id, horario_inicio, horario_fin };
        if (dia_semana !== undefined) insertData.dia_semana = dia_semana;
        
        const { data, error } = await supabase.from('rutas').insert([insertData]).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Ruta creada', ruta: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al crear ruta', error: error.message });
    }
}

export const updateRuta = async (req, res) => {
    try {
        const { id } = req.params;
        const { zona_id, camion_id, horario_inicio, horario_fin, dia_semana } = req.body;
        let updates = {};
        if (zona_id !== undefined) updates.zona_id = zona_id;
        if (camion_id !== undefined) updates.camion_id = camion_id;
        if (horario_inicio !== undefined) updates.horario_inicio = horario_inicio;
        if (horario_fin !== undefined) updates.horario_fin = horario_fin;
        if (dia_semana !== undefined) updates.dia_semana = dia_semana;

        const { data, error } = await supabase.from('rutas').update(updates).eq('id', id).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Ruta actualizada', ruta: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar ruta', error: error.message });
    }
}

export const deleteRuta = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('rutas').delete().eq('id', id);
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Ruta eliminada' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar ruta', error: error.message });
    }
}

// ==================== GPS ====================
export const getGPSLocations = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tracking_gps')
            .select(`*, camion:camiones(placa, conductor:usuarios(nombre))`)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        
        // Solo última posición por camión
        const latestLocations = [];
        const seenCamiones = new Set();
        
        if (data) {
            data.forEach(loc => {
                if (!seenCamiones.has(loc.camion_id)) {
                    seenCamiones.add(loc.camion_id);
                    latestLocations.push(loc);
                }
            });
        }

        res.json({ exito: true, ubicaciones: latestLocations });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener GPS', error: error.message });
    }
}

// ==================== RECOLECCIONES ====================
export const getRecolecciones = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('recolecciones')
            .select(`*, usuario:usuarios(nombre), tipo_residuo:tipos_residuos(id, nombre, color_hex), ruta:rutas(zona_id, zonas(nombre))`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, recolecciones: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener recolecciones', error: error.message });
    }
}

// ==================== INCIDENCIAS ====================
export const getIncidencias = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('incidencias')
            .select(`*, usuario:usuarios(nombre), zona:zonas(nombre)`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, incidencias: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener incidencias', error: error.message });
    }
}

export const updateIncidencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const { data, error } = await supabase.from('incidencias').update({ estado }).eq('id', id).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Incidencia actualizada', incidencia: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar incidencia', error: error.message });
    }
}

// ==================== NOTIFICACIONES ====================
export const getNotificaciones = async (req, res) => {
    try {
        const { data, error } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ exito: true, notificaciones: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener notificaciones', error: error.message });
    }
}

export const createNotificacion = async (req, res) => {
    try {
        const { titulo, mensaje, tipo_destinatario, usuario_id } = req.body;
        
        const insertData = { titulo, mensaje, tipo_destinatario };
        if (usuario_id) insertData.usuario_id = usuario_id;

        const { data, error } = await supabase.from('notificaciones').insert([insertData]).select();
        if (error) throw error;
        res.json({ exito: true, mensaje: 'Notificación enviada', notificacion: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al crear notificación', error: error.message });
    }
}

// ==================== REPORTES (BI) ====================
export const getReportes = async (req, res) => {
    try {
        const { data: recs } = await supabase.from('recolecciones').select(`
            fecha_hora,
            peso_kg,
            tipo_residuo:tipos_residuos(nombre, color_hex),
            zona:zonas(nombre),
            ruta:rutas(zona_id, zonas(nombre))
        `);
        const { data: incs } = await supabase.from('incidencias').select('estado, created_at');
        const { data: usrs } = await supabase.from('usuarios').select('rol');

        res.json({ exito: true, reportes: { recolecciones: recs||[], incidencias: incs||[], usuarios: usrs||[] } });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener reportes', error: error.message });
    }
}

// ==================== UTILIDADES (DROPDOWNS) ====================
export const getOperadoresZonas = async (req, res) => {
    try {
        const { data: operadores } = await supabase.from('usuarios').select('id, nombre').eq('rol', 'operador');
        const { data: zonas } = await supabase.from('zonas').select('id, nombre');
        const { data: camiones } = await supabase.from('camiones').select('id, placa');
        const { data: tipos_residuos } = await supabase.from('tipos_residuos').select('id, nombre');
        res.json({ exito: true, operadores: operadores||[], zonas: zonas||[], camiones: camiones||[], tipos_residuos: tipos_residuos||[] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: 'Error al obtener utilidades', error: error.message });
    }
}
