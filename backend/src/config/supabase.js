/**
 * ============================================================
 * supabase.js - Configuración del cliente de Supabase
 * Sistema de Gestión Inteligente de Residuos Sólidos - Wanchaq
 * 
 * Crea y exporta una instancia del cliente de Supabase
 * usando las credenciales almacenadas en las variables
 * de entorno (.env).
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

// Crear cliente de Supabase con URL y clave anónima
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
)