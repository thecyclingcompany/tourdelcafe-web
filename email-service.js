const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'info@tourdelcafe.org',
    pass: process.env.SMTP_PASS || ''
  }
});

function generarPlantillaHtml(nombre, ref, reto) {
  // Plantilla HTML empaquetada de forma segura
  const plantillaBase64 = 'PGRpdiBzdHlsZT0iZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBiYWNrZ3JvdW5kLWNvbG9yOiAjMWExNjE0OyBjb2xvcjogI2Y1ZjJlYjsgcGFkZGluZzogMzBweDsgYm9yZGVyLXJhZGl1czogOHB4OyBtYXgtd2lkdGg6IDYwMHB4OyBtYXJnaW46IDAgYXV0bzsiPjxoMSBzdHlsZT0iY29sb3I6ICNkNGEzNzM7IG1hcmdpbi10b3A6IDA7Ij7CoUluc2NyaXBjacOzbiBDb25maXJtYWRhITwvaDE+PHA+SG9sYSA8c3Ryb25nPnt7Tk9NQlJFfX08L3N0cm9uZz4sPC9wPjxwPlR1IGluc2NyaXBjacOzbiBwYXJhIGVsIDxzdHJvbmc+VG91ciBkZWwgQ2Fmw6kgR3JhbiBGb25kbyAyMDI3PC9zdHJvbmc+IGhhIHNpZG8gcHJvY2VzYWRhIHkgYXByb2JhZGEgZXhpdG9zYW1lbnRlLjwvcD48ZGl2IHN0eWxlPSJiYWNrZ3JvdW5kOiAjMmIyNTIyOyBwYWRkaW5nOiAxNXB4OyBib3JkZXItbGVmdDogNHB4IHNvbGlkICNkNGEzNzM7IG1hcmdpbjogMjBweCAwOyI+PHAgc3R5bGU9Im1hcmdpbjogNXB4IDA7Ij48c3Ryb25nPlJlZmVyZW5jaWEgZVBheWNvOjwvc3Ryb25nPiB7e1JFRn19PC9wPjxwIHN0eWxlPSJtYXJnaW46IDVweCAwOyI+PHN0cm9uZz5Nb2RhbGlkYWQgLyBSZXRvOjwvc3Ryb25nPiB7e1JFVE99fTwvcD48cCBzdHlsZT0ibWFyZ2luOiA1cHggMDsiPjxzdHJvbmc+RmVjaGEgZGVsIEV2ZW50bzo8L3N0cm9uZz4gRmVicmVybyAyMDI3IC0gUXVpbmTDrW8sIENvbG9tYmlhPC9wPjwvZGl2PjxwPkVuIGxhcyBwcsOjeGltYXMgc2VtYW5hcyB0ZSBlbnZpYXJlbW9zIG3DoXMgZGV0YWxsZXMgc29icmUgZWwgY3Jvbm9ncmFtYSBvZmljaWFsIHkgbGEgZW50cmVnYSBkZSBraXRzLjwvcD48cD5TaSB0aWVuZXMgcHJlZ3VudGFzLCBwdWVkZXMgcmVzcG9uZGVyIGRpcmVjdGFtZW50ZSBhIGVzdGUgY29ycmVvLjwvcD48cCBzdHlsZT0ibWFyZ2luLXRvcDogMzBweDsgY29sb3I6ICNhODlmOTE7IGZvbnQtc2l6ZTogMTRweDsiPkVsIGVxdWlwbyBkZSA8c3Ryb25nPlRoZSBDeWNsaW5nIENvbXBhbnk8L3N0cm9uZz48L3A+PC9kaXY+';
  const htmlDecodificado = Buffer.from(plantillaBase64, 'base64').toString('utf-8');

  return htmlDecodificado
    .replace('{{NOMBRE}}', nombre)
    .replace('{{REF}}', ref)
    .replace('{{RETO}}', reto);
}

async function sendWelcomeEmail(toEmail, participantName, orderRef, category) {
  try {
    if (!toEmail) {
      console.warn('[Email Warning] No se proporciono correo de destinatario.');
      return;
    }

    const nombre = participantName || 'Ciclista';
    const ref = orderRef || 'N/A';
    const reto = category || 'Gran Fondo';

    const mailOptions = {
      from: '"Tour del Café Gran Fondo" ',
      to: toEmail,
      replyTo: 'info@tourdelcafe.org',
      subject: '¡Bienvenido al Tour del Café Gran Fondo 2027! - Confirmación de Inscripción',
      html: generarPlantillaHtml(nombre, ref, reto)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Correo enviado exitosamente:', info.messageId);
  } catch (error) {
    console.error('[Email Error] Error enviando correo:', error);
  }
}

module.exports = { sendWelcomeEmail };
