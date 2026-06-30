/**
 * ============================================================
 * email.service.js
 * Servicio para envío de correos mediante Nodemailer
 * ============================================================
 */

import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// Configurar el transporte SMTP
// Se espera que SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS estén en el .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true para 465, false para otros
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
})

/**
 * Enviar un correo con el código OTP al administrador
 * 
 * @param {string} correoDestino - Correo institucional del administrador
 * @param {string} otp - Código numérico de 6 dígitos
 * @returns {Promise<boolean>} - True si se envió correctamente, False en caso contrario
 */
export const enviarCorreoOTP = async (correoDestino, otp) => {
    try {
        // Validación básica: si no hay credenciales, imprimir en consola para desarrollo
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('⚠️ No hay credenciales SMTP configuradas. El código OTP es:', otp)
            // Para propósitos de demostración universitaria, si falla Nodemailer, se asume enviado
            return true;
        }

        const mailOptions = {
            from: `"Gestión de Residuos Wanchaq" <${process.env.SMTP_USER}>`,
            to: correoDestino,
            subject: 'Código de Verificación Administrativa (OTP) - Wanchaq',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #2E7D32; color: #ffffff; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-size: 24px;">Municipalidad de Wanchaq</h2>
                        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Sistema Inteligente de Gestión de Residuos Sólidos</p>
                    </div>
                    
                    <div style="padding: 30px; background-color: #ffffff; color: #333333;">
                        <h3 style="margin-top: 0; color: #1E1E1E;">Verificación de Seguridad</h3>
                        <p style="line-height: 1.6;">Hola,</p>
                        <p style="line-height: 1.6;">Se ha solicitado acceso al panel administrativo con este correo. Por favor, utiliza el siguiente código de verificación de 6 dígitos para completar tu inicio de sesión:</p>
                        
                        <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; border-left: 5px solid #66BB6A;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1565C0;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 13px; color: #666666; line-height: 1.5;">
                            <em>Este código expirará en 5 minutos y es válido para un solo uso.</em><br>
                            Si no solicitaste este acceso, puedes ignorar este correo o contactar al equipo de soporte de la municipalidad.
                        </p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 12px; color: #999999;">&copy; ${new Date().getFullYear()} Municipalidad Distrital de Wanchaq. Todos los derechos reservados.</p>
                    </div>
                </div>
            `
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('✅ Correo OTP enviado:', info.messageId)
        return true

    } catch (error) {
        console.error('❌ Error al enviar el correo OTP:', error)
        return false
    }
}
