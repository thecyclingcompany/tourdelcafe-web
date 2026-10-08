const nodemailer = require('nodemailer');

// 1. Configuración de transporte SMTP Hostinger
const smtpUser = process.env.SMTP_USER || 'info@tourdelcafe.org';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: smtpUser,
    pass: process.env.SMTP_PASS || ''
  }
});

/**
 * Normaliza la modalidad del Genesis Coffee Ride a 'Standard' o 'Experiencia VIP'
 */
function normalizarModalidadGenesis(modality) {
  if (!modality) return 'Standard';
  const str = modality.toString().trim().toLowerCase();
  if (str.includes('vip')) {
    return 'Experiencia VIP';
  }
  return 'Standard';
}

/**
 * Template HTML premium para confirmación de Genesis Coffee Ride
 */
function generarPlantillaGenesisHtml(nombre, orderRef, modalidad) {
  const modLabel = normalizarModalidadGenesis(modalidad);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Inscripción Confirmada! - Genesis Coffee Ride</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0e0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #0f0e0d; padding: 40px 15px; min-height: 100%;">
    <div style="background-color: #1a1614; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(212, 163, 115, 0.25); overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.6);">
      
      <!-- Encabezado con identidad de marca -->
      <div style="background: linear-gradient(135deg, #2c1f19 0%, #171311 100%); padding: 36px 28px; text-align: center; border-bottom: 2px solid #d4a373;">
        <span style="display: inline-block; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #d4a373; font-weight: 700; margin-bottom: 8px;">The Cycling Company presenta</span>
        <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 800; letter-spacing: 0.5px;">¡Inscripción Confirmada!</h1>
        <p style="color: #c9b09a; font-size: 15px; margin: 0; font-weight: 500;">Genesis Coffee Ride • Quindío, Colombia</p>
      </div>

      <!-- Contenido Principal -->
      <div style="padding: 35px 30px; color: #eae5dc; line-height: 1.6; font-size: 15px;">
        <p style="margin-top: 0; font-size: 17px; color: #ffffff;">Hola <strong>${nombre}</strong>,</p>
        
        <p>Tu registro al <strong>Genesis Coffee Ride</strong> fue aprobado exitosamente. ¡Estamos listos para vivir una experiencia inolvidable en las mejores rutas del Eje Cafetero!</p>

        <!-- Resumen de la Orden -->
        <div style="background-color: #241d19; border: 1px solid rgba(212, 163, 115, 0.25); border-left: 4px solid #d4a373; border-radius: 8px; padding: 22px; margin: 25px 0;">
          <h3 style="color: #d4a373; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 16px 0; font-weight: 700;">Resumen de la orden</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 7px 0; color: #a89f91; width: 45%;"><strong>Referencia ePayco:</strong></td>
              <td style="padding: 7px 0; color: #ffffff; font-weight: 700; font-family: monospace; font-size: 15px;">${orderRef}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #a89f91;"><strong>Experiencia / Categoría:</strong></td>
              <td style="padding: 7px 0; color: #d4a373; font-weight: 700; font-size: 15px;">${modLabel}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #a89f91;"><strong>Estado:</strong></td>
              <td style="padding: 7px 0; color: #4ade80; font-weight: 600;">Pago Aprobado / Confirmado</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #a89f91;"><strong>Lugar:</strong></td>
              <td style="padding: 7px 0; color: #eae5dc;">Quindío, Colombia</td>
            </tr>
          </table>
        </div>

        <p>Próximamente recibirás detalles de logística, agenda oficial del evento, cronograma de salida y entrega de kits oficiales para que tengas todo listo para tu rodada.</p>

        <p>Si tienes alguna duda o inquietud con respecto a tu participación, puedes responder directamente a este correo electrónico (<strong style="color: #d4a373;">info@tourdelcafe.org</strong>) y nuestro equipo te atenderá con gusto.</p>

        <!-- Cierre y Firma Obligatoria -->
        <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <p style="margin: 0; color: #d4a373; font-size: 15px; font-weight: 700;">El equipo de The Cycling Company.</p>
          <p style="margin: 4px 0 0 0; color: #8c827a; font-size: 12px;">Tour del Café • Genesis Coffee Ride • Quindío, Colombia</p>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
}

/**
 * Template HTML para el Tour del Café Gran Fondo
 */
function generarPlantillaGranFondoHtml(nombre, ref, reto) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>¡Inscripción Confirmada! - Tour del Café Gran Fondo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0e0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb;">
  <div style="background-color: #0f0e0d; padding: 40px 15px;">
    <div style="background-color: #1a1614; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(212, 163, 115, 0.25); overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.6);">
      
      <div style="background: linear-gradient(135deg, #2c1f19 0%, #171311 100%); padding: 36px 28px; text-align: center; border-bottom: 2px solid #d4a373;">
        <span style="display: inline-block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #d4a373; font-weight: 700; margin-bottom: 8px;">The Cycling Company</span>
        <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 800;">¡Inscripción Confirmada!</h1>
        <p style="color: #c9b09a; font-size: 15px; margin: 0;">Tour del Café Gran Fondo 2027</p>
      </div>

      <div style="padding: 35px 30px; color: #eae5dc; line-height: 1.6; font-size: 15px;">
        <p style="margin-top: 0; font-size: 17px; color: #ffffff;">Hola <strong>${nombre}</strong>,</p>
        <p>Tu inscripción para el <strong>Tour del Café Gran Fondo 2027</strong> ha sido procesada y aprobada exitosamente.</p>

        <div style="background-color: #241d19; border: 1px solid rgba(212, 163, 115, 0.25); border-left: 4px solid #d4a373; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #d4a373; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 14px 0; font-weight: 700;">Resumen de la orden</h3>
          <p style="margin: 6px 0;"><strong style="color: #a89f91;">Referencia ePayco:</strong> <span style="color: #ffffff; font-family: monospace; font-weight: 700;">${ref}</span></p>
          <p style="margin: 6px 0;"><strong style="color: #a89f91;">Modalidad / Reto:</strong> <span style="color: #d4a373; font-weight: 700;">${reto}</span></p>
          <p style="margin: 6px 0;"><strong style="color: #a89f91;">Fecha del Evento:</strong> Febrero 2027 - Quindío, Colombia</p>
        </div>

        <p>En las próximas semanas te enviaremos más detalles sobre el cronograma oficial y la entrega de kits.</p>
        <p>Si tienes preguntas, puedes responder directamente a este correo.</p>

        <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <p style="margin: 0; color: #d4a373; font-size: 15px; font-weight: 700;">El equipo de The Cycling Company.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Enviar correo de bienvenida y confirmación para Genesis Coffee Ride
 * Soporta argumentos posicionales o un objeto único { toEmail, participantName, orderRef, modality }
 */
async function sendGenesisWelcomeEmail(toEmail, participantName, orderRef, modality) {
  let email = toEmail;
  let nombre = participantName;
  let ref = orderRef;
  let mod = modality;

  // Si se pasa como un único objeto con propiedades
  if (typeof toEmail === 'object' && toEmail !== null) {
    email = toEmail.toEmail || toEmail.email || toEmail.to;
    nombre = toEmail.participantName || toEmail.name || toEmail.fullName;
    ref = toEmail.orderRef || toEmail.ref || toEmail.refPayco;
    mod = toEmail.modality || toEmail.category || toEmail.route;
  }

  try {
    if (!email) {
      console.warn('[Genesis Email Warning] No se proporcionó correo de destinatario.');
      return { success: false, error: 'Correo de destinatario faltante' };
    }

    const cleanNombre = (nombre || 'Ciclista').toString().trim();
    const cleanRef = (ref || 'N/A').toString().trim();
    const cleanModality = normalizarModalidadGenesis(mod);
    const fromSender = `"Genesis Coffee Ride" <${smtpUser}>`;

    const mailOptions = {
      from: fromSender,
      to: email.toString().trim(),
      replyTo: 'info@tourdelcafe.org',
      subject: '¡Bienvenido al Genesis Coffee Ride! - Confirmación de Inscripción',
      html: generarPlantillaGenesisHtml(cleanNombre, cleanRef, cleanModality)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Genesis Email Success] Correo de confirmación enviado exitosamente a ${email} | Ref: ${cleanRef} | Modalidad: ${cleanModality} | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, modality: cleanModality };
  } catch (error) {
    console.error(`[Genesis Email Error] Error enviando correo Genesis a ${email || 'destinatario'}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar correo de bienvenida para Tour del Café Gran Fondo
 */
async function sendWelcomeEmail(toEmail, participantName, orderRef, category) {
  try {
    if (!toEmail) {
      console.warn('[Email Warning] No se proporcionó correo de destinatario.');
      return { success: false, error: 'Correo de destinatario faltante' };
    }

    const nombre = participantName || 'Ciclista';
    const ref = orderRef || 'N/A';
    const reto = category || 'Gran Fondo';
    const fromSender = `"Tour del Café Gran Fondo" <${smtpUser}>`;

    const mailOptions = {
      from: fromSender,
      to: toEmail.toString().trim(),
      replyTo: 'info@tourdelcafe.org',
      subject: '¡Bienvenido al Tour del Café Gran Fondo 2027! - Confirmación de Inscripción',
      html: generarPlantillaGranFondoHtml(nombre, ref, reto)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Correo enviado exitosamente:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Error] Error enviando correo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Función unificada y modular para enviar confirmación según el evento
 */
async function sendConfirmationEmail({ event, toEmail, participantName, orderRef, modality, category }) {
  const isGenesis = (event && (event.includes('genesis') || event.includes('coffee-ride'))) ||
    (modality && ['standard', 'vip'].some(m => modality.toString().toLowerCase().includes(m))) ||
    (category && category.toString().toLowerCase().includes('genesis'));

  if (isGenesis) {
    return await sendGenesisWelcomeEmail({
      toEmail,
      participantName,
      orderRef,
      modality: modality || category
    });
  }

  return await sendWelcomeEmail(toEmail, participantName, orderRef, category || modality);
}

module.exports = {
  transporter,
  sendGenesisWelcomeEmail,
  sendWelcomeEmail,
  sendConfirmationEmail,
  generarPlantillaGenesisHtml,
  normalizarModalidadGenesis
};
