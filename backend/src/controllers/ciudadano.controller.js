import { supabase } from '../config/supabase.js';
import bcrypt from 'bcrypt';

export const getDashboardInfo = async (req, res) => {
    try {
        const userId = req.usuario.id;

        // User info
        const { data: usuario, error: errorUsuario } = await supabase
            .from('usuarios')
            .select('nombre, correo, zona_id, created_at')
            .eq('id', userId)
            .single();

        if (errorUsuario) throw errorUsuario;

        let zona = null;
        if (usuario.zona_id) {
            const { data: zonaData } = await supabase
                .from('zonas')
                .select('nombre')
                .eq('id', usuario.zona_id)
                .single();
            zona = zonaData;
        }

        // Incidencias
        const { count: countIncidencias, error: errInc } = await supabase
            .from('incidencias')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', userId)
            .neq('estado', 'resuelto');

        // Notificaciones
        const { count: countNotificaciones, error: errNotif } = await supabase
            .from('notificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('usuario_id', userId)
            .eq('leido', false);

        res.json({
            exito: true,
            datos: {
                usuario,
                zona,
                incidencias_pendientes: countIncidencias || 0,
                notificaciones_nuevas: countNotificaciones || 0
            }
        });

    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const getRecoleccionInfo = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { data: user } = await supabase.from('usuarios').select('zona_id').eq('id', userId).single();
        
        if (!user || !user.zona_id) {
            return res.json({ exito: true, datos: null, mensaje: 'No tienes una zona asignada' });
        }

        const { data: zona } = await supabase.from('zonas').select('*').eq('id', user.zona_id).single();
        const { data: rutas } = await supabase.from('rutas').select('*, camiones(*)').eq('zona_id', user.zona_id);

        res.json({ exito: true, datos: { zona, rutas } });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const getTrackingInfo = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { data: user } = await supabase.from('usuarios').select('zona_id').eq('id', userId).single();
        
        if (!user || !user.zona_id) {
            return res.json({ exito: true, datos: null });
        }

        // Obtener ruta asignada a la zona
        const { data: ruta } = await supabase.from('rutas').select('id, camion_id').eq('zona_id', user.zona_id).limit(1).single();
        
        if (!ruta) {
            return res.json({ exito: true, datos: null });
        }

        // Obtener último tracking gps para la ruta
        const { data: tracking } = await supabase
            .from('tracking_gps')
            .select('latitud, longitud, fecha_hora')
            .eq('ruta_id', ruta.id)
            .order('fecha_hora', { ascending: false })
            .limit(1)
            .single();

        res.json({ exito: true, datos: tracking || null });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const reportarIncidencia = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { descripcion, foto_url, latitud, longitud } = req.body;

        const { data: user } = await supabase.from('usuarios').select('zona_id').eq('id', userId).single();

        const { data, error } = await supabase
            .from('incidencias')
            .insert([{
                usuario_id: userId,
                zona_id: user?.zona_id || null,
                descripcion,
                foto_url: foto_url || null,
                latitud,
                longitud,
                estado: 'pendiente'
            }])
            .select();

        if (error) throw error;
        
        res.json({ exito: true, mensaje: 'Incidencia reportada correctamente', datos: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const getMisIncidencias = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { data, error } = await supabase
            .from('incidencias')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, datos: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const getNotificaciones = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ exito: true, datos: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const marcarNotificacionLeida = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('notificaciones')
            .update({ leido: true })
            .eq('id', id)
            .eq('usuario_id', userId)
            .select();

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Notificación marcada como leída' });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const getPerfil = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, dni, correo, rol, zona_id, ultimo_login, created_at, zonas(nombre)')
            .eq('id', userId)
            .single();

        if (error) throw error;
        res.json({ exito: true, datos: data });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};

export const updatePerfil = async (req, res) => {
    try {
        const userId = req.usuario.id;
        const { correo, password } = req.body;
        
        const updates = {};
        if (correo) updates.correo = correo;
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return res.json({ exito: true, mensaje: 'No hay cambios para actualizar' });
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', userId)
            .select('id, nombre, dni, correo, rol, zona_id');

        if (error) throw error;
        res.json({ exito: true, mensaje: 'Perfil actualizado', datos: data[0] });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: error.message });
    }
};
