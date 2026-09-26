/**
 * REGISTRATION SERVICE - TOUR DEL CAFÉ
 * Gestión nativa de inscripciones, validación estricta de categorías y edades,
 * tarifas dinámicas por etapas (Hora Colombia), asignación de dorsales y confirmaciones por email.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'inscripciones.json');
const PENDING_REGISTRATIONS_FILE = path.join(DATA_DIR, 'inscripciones-pendientes.json');
const EMAILS_LOG_FILE = path.join(DATA_DIR, 'emails-sent.json');

// Fecha de corte oficial para el cálculo de edad
const CUT_OFF_YEAR = 2027;

/**
 * Calendario oficial de etapas de precios (Hora Colombia UTC-5)
 * Formato ISO con offset -05:00
 */
const PRICING_STAGES = [
  {
    id: 'chapola',
    name: 'Etapa Chapola',
    startDate: '2026-09-28T00:00:00-05:00',
    endDate: '2026-10-25T23:59:59-05:00',
    prices: {
      macchiato: 490000,
      espresso: 490000
    },
    badge: 'Tarifa Especial de Apertura'
  },
  {
    id: 'almacigo',
    name: 'Etapa Almácigo',
    startDate: '2026-10-26T00:00:00-05:00',
    endDate: '2026-11-22T23:59:59-05:00',
    prices: {
      macchiato: 540000,
      espresso: 540000
    },
    badge: 'Segunda Etapa'
  },
  {
    id: 'floracion',
    name: 'Etapa Floración',
    startDate: '2026-11-23T00:00:00-05:00',
    endDate: '2026-12-20T23:59:59-05:00',
    prices: {
      macchiato: 590000,
      espresso: 590000
    },
    badge: 'Tercera Etapa'
  },
  {
    id: 'cosecha',
    name: 'Etapa Cosecha',
    startDate: '2026-12-21T00:00:00-05:00',
    endDate: '2027-01-24T23:59:59-05:00',
    prices: {
      macchiato: 650000,
      espresso: 650000
    },
    badge: 'Última Etapa Regular'
  }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[RegistrationService] Error leyendo ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  ensureDataDir();
  const tempFile = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`[RegistrationService] Error escribiendo ${filePath}:`, err.message);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

/**
 * Obtiene la etapa actual de precios según la fecha de Colombia
 */
function getCurrentPricingStage(now = new Date()) {
  const nowMs = now.getTime();
  const firstStageStart = new Date(PRICING_STAGES[0].startDate).getTime();

  // Si estamos antes del 28 de sep 2026, la etapa activa para pruebas y apertura es Chapola
  if (nowMs < firstStageStart) {
    return {
      current: PRICING_STAGES[0],
      isPreLaunch: true,
      allStages: PRICING_STAGES
    };
  }

  for (let i = 0; i < PRICING_STAGES.length; i++) {
    const stage = PRICING_STAGES[i];
    const start = new Date(stage.startDate).getTime();
    const end = new Date(stage.endDate).getTime();
    if (nowMs >= start && nowMs <= end) {
      return {
        current: stage,
        next: PRICING_STAGES[i + 1] || null,
        isPreLaunch: false,
        allStages: PRICING_STAGES
      };
    }
  }

  // Si ya pasó la última etapa
  return {
    current: PRICING_STAGES[PRICING_STAGES.length - 1],
    expired: true,
    allStages: PRICING_STAGES
  };
}

/**
 * Cálculo matemático estricto de edad cumplida al 31 de diciembre de 2027
 */
function calculateAgeAtCutOff(birthDateString) {
  if (!birthDateString) return null;
  const parts = birthDateString.split('-');
  if (parts.length < 3) return null;
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear) || birthYear < 1920 || birthYear > 2027) return null;
  
  // Al 31 de diciembre de 2027, la persona habrá cumplido (2027 - birthYear) años
  return CUT_OFF_YEAR - birthYear;
}

/**
 * Valida un grupo de participantes con respecto al reto y categoría seleccionada
 */
function validateRegistrationRules(route, categoryId, participants, teamName = null) {
  const errors = [];
  
  if (!['macchiato', 'espresso'].includes(route)) {
    errors.push('El recorrido seleccionado no es válido (Reto Macchiato o Reto Espresso).');
    return { valid: false, errors };
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    errors.push('Debe registrar al menos un participante.');
    return { valid: false, errors };
  }

  // Validaciones básicas de campos por participante
  participants.forEach((p, idx) => {
    const num = idx + 1;
    if (!p.fullName || p.fullName.trim().length < 3) errors.push(`Participante #${num}: Ingrese el nombre completo.`);
    if (!p.docType) errors.push(`Participante #${num}: Seleccione el tipo de documento.`);
    if (!p.docNumber || p.docNumber.trim().length < 4) errors.push(`Participante #${num}: Ingrese el número de documento.`);
    if (!p.birthDate) errors.push(`Participante #${num}: Ingrese la fecha de nacimiento.`);
    if (!p.gender || !['M', 'F'].includes(p.gender)) errors.push(`Participante #${num}: Seleccione el género (Masculino/Femenino).`);
    if (!p.bloodType) errors.push(`Participante #${num}: Ingrese el tipo de sangre y RH.`);
    if (!p.email || !p.email.includes('@')) errors.push(`Participante #${num}: Ingrese un correo electrónico válido.`);
    if (!p.phone || p.phone.trim().length < 7) errors.push(`Participante #${num}: Ingrese el número de WhatsApp.`);
    if (!p.jerseySize) errors.push(`Participante #${num}: Seleccione la talla de jersey.`);
    if (!p.emergencyContactName || !p.emergencyContactPhone) errors.push(`Participante #${num}: Ingrese el contacto de emergencia completo.`);
    if (!p.termsAccepted) errors.push(`Participante #${num}: Debe aceptar el reglamento y exoneración médica.`);

    const calculatedAge = calculateAgeAtCutOff(p.birthDate);
    if (calculatedAge === null || calculatedAge < 18) {
      errors.push(`Participante #${num}: La edad calculada al 31/12/2027 (${calculatedAge} años) debe ser mayor de edad.`);
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validaciones de Modalidad
  const isTeam = categoryId.startsWith('equipo-');
  const isCouple = categoryId.startsWith('pareja-');
  const isIndividual = !isTeam && !isCouple;

  // Validación de Nombre del Equipo para Equipos y Parejas Mixtas
  if (isTeam || isCouple) {
    const cleanTeam = (teamName || (participants[0] && participants[0].teamName) || '').toString().trim();
    if (!cleanTeam) {
      errors.push(isTeam ? 'Debe ingresar el Nombre del Equipo.' : 'Debe ingresar el Nombre del Equipo / Pareja.');
    }
  }

  // 1. Modalidad Individual
  if (isIndividual) {
    if (participants.length !== 1) {
      errors.push('La modalidad individual requiere exactamente 1 participante.');
      return { valid: false, errors };
    }
    const p = participants[0];
    const age = calculateAgeAtCutOff(p.birthDate);

    // Mapeo de categoría por edad y género
    const expectedGender = categoryId.startsWith('ind-m-') ? 'M' : (categoryId.startsWith('ind-f-') ? 'F' : null);
    if (expectedGender && p.gender !== expectedGender) {
      errors.push(`El género seleccionado (${p.gender === 'M' ? 'Masculino' : 'Femenino'}) no coincide con la categoría ${categoryId}.`);
    }

    if (categoryId.endsWith('19-30') && (age < 19 || age > 30)) {
      errors.push(`La edad calculada (${age} años) no pertenece al rango 19-30 años.`);
    } else if (categoryId.endsWith('31-39') && (age < 31 || age > 39)) {
      errors.push(`La edad calculada (${age} años) no pertenece al rango 31-39 años.`);
    } else if (categoryId.endsWith('40-49') && (age < 40 || age > 49)) {
      errors.push(`La edad calculada (${age} años) no pertenece al rango 40-49 años.`);
    } else if (categoryId.endsWith('50-59') && (age < 50 || age > 59)) {
      errors.push(`La edad calculada (${age} años) no pertenece al rango 50-59 años.`);
    } else if (categoryId.endsWith('60-mas') && age < 60) {
      errors.push(`La edad calculada (${age} años) no pertenece al rango 60+ años.`);
    }
  }

  // 2. Modalidad Parejas Mixtas (Corredor 1 = Mujer / F, Corredor 2 = Hombre / M)
  if (isCouple) {
    if (participants.length !== 2) {
      errors.push('La modalidad en Parejas Mixtas requiere exactamente 2 participantes.');
      return { valid: false, errors };
    }

    // Regla de género fija
    if (participants[0].gender !== 'F') {
      errors.push('En Parejas Mixtas, el Corredor 1 debe ser de género Femenino (Mujer).');
    }
    if (participants[1].gender !== 'M') {
      errors.push('En Parejas Mixtas, el Corredor 2 debe ser de género Masculino (Hombre).');
    }

    const age1 = calculateAgeAtCutOff(participants[0].birthDate);
    const age2 = calculateAgeAtCutOff(participants[1].birthDate);
    const combinedAge = age1 + age2;

    if (categoryId === 'pareja-sub90') {
      if (combinedAge >= 90) {
        errors.push(`La suma combinada de edades (${combinedAge} años) supera o iguala 90. Corresponde a la categoría "Parejas Mixtas B (90+)".`);
      }
    } else if (categoryId === 'pareja-90mas') {
      if (combinedAge < 90) {
        errors.push(`La suma combinada de edades (${combinedAge} años) es menor a 90. Corresponde a la categoría "Parejas Mixtas A (Sub-90)".`);
      }
    }
  }

  // 3. Modalidad Equipos de 4 (Solo Reto Macchiato)
  if (isTeam) {
    if (route !== 'macchiato') {
      errors.push('La modalidad por equipos de 4 corredores solo está disponible en el Reto Macchiato (127 km).');
      return { valid: false, errors };
    }

    if (participants.length !== 4) {
      errors.push('La modalidad por equipos requiere exactamente 4 participantes.');
      return { valid: false, errors };
    }

    const isMaleTeam = categoryId.includes('masc');
    const isFemaleTeam = categoryId.includes('fem');
    const expectedGender = isMaleTeam ? 'M' : 'F';

    const nonMatching = participants.filter(p => p.gender !== expectedGender);
    if (nonMatching.length > 0) {
      errors.push(`Todos los 4 integrantes del equipo deben ser de género ${expectedGender === 'M' ? 'Masculino' : 'Femenino'}.`);
    }

    const totalAge = participants.reduce((sum, p) => sum + calculateAgeAtCutOff(p.birthDate), 0);

    if (categoryId.endsWith('-a')) {
      // Equipo A: Suma de edades entre 72 y 159 años
      if (totalAge < 72 || totalAge > 159) {
        errors.push(`La suma combinada de edades (${totalAge} años) no está en el rango permitido de 72 a 159 años para Equipo A.`);
      }
    } else if (categoryId.endsWith('-b')) {
      // Equipo B: Suma de edades 160 años en adelante
      if (totalAge < 160) {
        errors.push(`La suma combinada de edades (${totalAge} años) debe ser de 160 años en adelante para Equipo B.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Guarda una orden de inscripción pendiente antes de invocar la pasarela de ePayco
 */
function savePendingRegistration(invoiceNumber, data) {
  ensureDataDir();
  const pending = readJsonSafe(PENDING_REGISTRATIONS_FILE, {});
  
  pending[invoiceNumber] = {
    ...data,
    createdAt: new Date().toISOString(),
    status: 'PENDING'
  };

  writeJsonAtomic(PENDING_REGISTRATIONS_FILE, pending);
  return pending[invoiceNumber];
}

/**
 * Obtiene la orden pendiente por número de factura
 */
function getPendingRegistration(invoiceNumber) {
  const pending = readJsonSafe(PENDING_REGISTRATIONS_FILE, {});
  return pending[invoiceNumber] || null;
}

/**
 * Asigna número de dorsal consecutivo único
 */
function generateDorsal(route, index) {
  const prefix = route === 'macchiato' ? 'MAC' : 'ESP';
  const padded = String(index).padStart(4, '0');
  return `TDC27-${prefix}-${padded}`;
}

/**
 * Procesa la confirmación aprobada de ePayco
 */
function processPaidRegistration(invoiceNumber, refPayco, paymentDetails = {}) {
  ensureDataDir();
  const registrations = readJsonSafe(REGISTRATIONS_FILE, []);
  
  // Evitar duplicados si el webhook reenvía la notificación
  const existing = registrations.find(r => r.invoiceNumber === invoiceNumber || r.refPayco === refPayco);
  if (existing) {
    console.log(`[RegistrationService] La inscripción ${invoiceNumber} (${refPayco}) ya fue procesada previamente.`);
    return { success: true, duplicate: true, registration: existing };
  }

  const pending = getPendingRegistration(invoiceNumber);
  if (!pending) {
    console.error(`[RegistrationService] No se encontró orden pendiente para invoice ${invoiceNumber}`);
    return { success: false, error: 'Orden de inscripción pendiente no encontrada.' };
  }

  // Consecutivo base de dorsales
  const currentTotal = registrations.reduce((acc, curr) => acc + (curr.participants ? curr.participants.length : 1), 0);
  let dorsalCounter = currentTotal + 101; // Comenzar en 101

  // Asignar dorsales e ID individual a cada corredor
  const finalizedParticipants = pending.participants.map((p, idx) => {
    const dorsal = generateDorsal(pending.route, dorsalCounter++);
    return {
      ...p,
      teamName: pending.teamName || p.teamName || null,
      registrationId: `${invoiceNumber}-P${idx + 1}`,
      dorsalNumber: dorsal,
      calculatedAge2027: calculateAgeAtCutOff(p.birthDate)
    };
  });

  const finalRecord = {
    invoiceNumber,
    refPayco,
    route: pending.route,
    routeName: pending.route === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)',
    category: pending.categoryId || pending.category,
    categoryName: pending.categoryName,
    teamName: pending.teamName || null,
    stage: pending.stage,
    unitPrice: pending.unitPrice,
    totalAmount: pending.totalAmount,
    baseAmount: pending.baseAmount || pending.totalAmount,
    discountPercent: pending.discountPercent || 0,
    discountAmount: pending.discountAmount || 0,
    couponCode: pending.couponCode || null,
    paymentType: 'EPAYCO',
    participants: finalizedParticipants,
    payerEmail: pending.payerEmail || finalizedParticipants[0].email,
    payerPhone: pending.payerPhone || finalizedParticipants[0].phone,
    paymentDate: paymentDetails.date || new Date().toISOString(),
    franchise: paymentDetails.franchise || 'ePayco',
    status: 'CONFIRMED'
  };

  registrations.push(finalRecord);
  writeJsonAtomic(REGISTRATIONS_FILE, registrations);

  // Eliminar o marcar de pendientes
  const allPending = readJsonSafe(PENDING_REGISTRATIONS_FILE, {});
  if (allPending[invoiceNumber]) {
    allPending[invoiceNumber].status = 'CONFIRMED';
    allPending[invoiceNumber].refPayco = refPayco;
    writeJsonAtomic(PENDING_REGISTRATIONS_FILE, allPending);
  }

  // Redimir cupón si se utilizó
  if (pending.couponCode) {
    try {
      const couponService = require('./coupon-service');
      couponService.redeemCoupon(pending.couponCode, invoiceNumber);
    } catch (e) {
      console.error('[RegistrationService] Error redimiendo cupón tras pago:', e.message);
    }
  }

  // Disparar envío de correo a los corredores registrados
  sendRegistrationEmails(finalRecord).catch(err => {
    console.error('[RegistrationService] Error enviando correos de inscripción:', err);
  });

  return { success: true, registration: finalRecord };
}

/**
 * Procesa una inscripción con cupón de cortesía 100% (sin ePayco)
 */
function processCourtesyRegistration(invoiceNumber, couponCode, customDetails = {}) {
  ensureDataDir();
  const registrations = readJsonSafe(REGISTRATIONS_FILE, []);

  // Evitar duplicados
  const existing = registrations.find(r => r.invoiceNumber === invoiceNumber);
  if (existing) {
    console.log(`[RegistrationService] La inscripción de cortesía ${invoiceNumber} ya fue procesada.`);
    return { success: true, duplicate: true, registration: existing };
  }

  const pending = getPendingRegistration(invoiceNumber);
  if (!pending) {
    console.error(`[RegistrationService] No se encontró orden pendiente para cortesía ${invoiceNumber}`);
    return { success: false, error: 'Orden de inscripción pendiente no encontrada.' };
  }

  // Consecutivo base de dorsales
  const currentTotal = registrations.reduce((acc, curr) => acc + (curr.participants ? curr.participants.length : 1), 0);
  let dorsalCounter = currentTotal + 101;

  // Asignar dorsales e ID individual a cada corredor
  const finalizedParticipants = pending.participants.map((p, idx) => {
    const dorsal = generateDorsal(pending.route, dorsalCounter++);
    return {
      ...p,
      teamName: pending.teamName || p.teamName || null,
      registrationId: `${invoiceNumber}-P${idx + 1}`,
      dorsalNumber: dorsal,
      calculatedAge2027: calculateAgeAtCutOff(p.birthDate)
    };
  });

  const refPayco = `CORTESIA-${(couponCode || '100').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const baseValue = pending.baseAmount || pending.totalAmount || (pending.unitPrice * pending.participants.length);

  const finalRecord = {
    invoiceNumber,
    refPayco,
    route: pending.route,
    routeName: pending.route === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)',
    category: pending.categoryId || pending.category,
    categoryName: pending.categoryName,
    teamName: pending.teamName || null,
    stage: pending.stage,
    unitPrice: pending.unitPrice,
    totalAmount: 0,
    baseAmount: baseValue,
    discountPercent: 100,
    discountAmount: baseValue,
    couponCode: couponCode || pending.couponCode || 'CORTESIA100',
    paymentType: 'COURTESY',
    participants: finalizedParticipants,
    payerEmail: pending.payerEmail || finalizedParticipants[0].email,
    payerPhone: pending.payerPhone || finalizedParticipants[0].phone,
    paymentDate: new Date().toISOString(),
    franchise: 'Cortesía 100%',
    status: 'CONFIRMED'
  };

  registrations.push(finalRecord);
  writeJsonAtomic(REGISTRATIONS_FILE, registrations);

  // Marcar orden pendiente
  const allPending = readJsonSafe(PENDING_REGISTRATIONS_FILE, {});
  if (allPending[invoiceNumber]) {
    allPending[invoiceNumber].status = 'CONFIRMED';
    allPending[invoiceNumber].refPayco = refPayco;
    writeJsonAtomic(PENDING_REGISTRATIONS_FILE, allPending);
  }

  // Redimir cupón
  if (couponCode) {
    try {
      const couponService = require('./coupon-service');
      couponService.redeemCoupon(couponCode, invoiceNumber);
    } catch (e) {
      console.error('[RegistrationService] Error redimiendo cupón de cortesía:', e.message);
    }
  }

  // Disparar envío de correo
  sendRegistrationEmails(finalRecord).catch(err => {
    console.error('[RegistrationService] Error enviando correos de cortesía:', err);
  });

  return { success: true, registration: finalRecord };
}

/**
 * Plantilla HTML de correo de confirmación de inscripción
 */
function buildEmailTemplate(registration, participant) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>¡Inscripción Confirmada! - Tour del Café Gran Fondo 2027</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #121212; color: #FAFAFA; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #1c1817; border-radius: 12px; border: 1px solid #332d2b; overflow: hidden; }
    .header { background: linear-gradient(135deg, #d35400 0%, #b84300 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: #FFFFFF; letter-spacing: 1px; }
    .header p { margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9); }
    .content { padding: 30px 24px; }
    .dorsal-box { background-color: #0f0e0d; border: 2px dashed #e67e22; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0; }
    .dorsal-number { font-size: 32px; font-weight: bold; color: #e67e22; letter-spacing: 2px; }
    .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .detail-table td { padding: 10px 0; border-bottom: 1px solid #2a2524; font-size: 14px; }
    .detail-label { color: rgba(250,250,250,0.6); }
    .detail-val { text-align: right; font-weight: 600; color: #FFFFFF; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: rgba(250,250,250,0.5); background-color: #121212; border-top: 1px solid #2a2524; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(211,84,0,0.25); color: #e67e22; border-radius: 4px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>TOUR DEL CAFÉ GRAN FONDO</h1>
      <p>World's Coffee & Cycling Festival</p>
    </div>
    <div class="content">
      <p style="font-size: 18px; margin-top: 0;">¡Hola, <strong>${participant.fullName}</strong>!</p>
      <p>Tu inscripción oficial ha sido confirmada con éxito. Ya eres parte del pelotón del festival de café y ciclismo más inmersivo del mundo en el Eje Cafetero.</p>
      
      <div class="dorsal-box">
        <div style="font-size: 12px; text-transform: uppercase; color: #a09893; margin-bottom: 4px;">Tu Dorsal Oficial</div>
        <div class="dorsal-number">${participant.dorsalNumber}</div>
        <div style="font-size: 13px; color: #FAFAFA; margin-top: 4px;">${registration.routeName}</div>
      </div>

      <table class="detail-table">
        <tr>
          <td class="detail-label">Categoría Oficial:</td>
          <td class="detail-val"><span class="badge">${registration.categoryName}</span></td>
        </tr>
        ${(registration.teamName || participant.teamName) ? `
        <tr>
          <td class="detail-label">Nombre del Equipo / Dupla:</td>
          <td class="detail-val"><strong style="color: #e67e22;">${registration.teamName || participant.teamName}</strong></td>
        </tr>
        ` : ''}
        <tr>
          <td class="detail-label">Documento:</td>
          <td class="detail-val">${participant.docType}: ${participant.docNumber}</td>
        </tr>
        <tr>
          <td class="detail-label">Talla de Jersey Seleccionada:</td>
          <td class="detail-val">${participant.jerseySize}</td>
        </tr>
        <tr>
          <td class="detail-label">Grupo Sanguíneo:</td>
          <td class="detail-val">${participant.bloodType}</td>
        </tr>
        <tr>
          <td class="detail-label">Referencia de Pago:</td>
          <td class="detail-val">${registration.refPayco}</td>
        </tr>
        <tr>
          <td class="detail-label">Factura / Consecutivo:</td>
          <td class="detail-val">${registration.invoiceNumber}</td>
        </tr>
      </table>

      <div style="margin-top: 25px; padding: 15px; background: rgba(61, 74, 62, 0.35); border-left: 4px solid #2ecc71; border-radius: 4px; font-size: 13px; line-height: 1.5;">
        <strong>Información Importante de Acreditación:</strong><br>
        La entrega de kits oficiales y acreditación se realizará en el Roaster's Lounge & Expo previo al evento. Debes presentar tu documento original de identidad y este comprobante.
      </div>
    </div>
    <div class="footer">
      © 2026-2027 Tour del Café • Eje Cafetero, Colombia.<br>
      Por consultas o soporte escríbenos a: <a href="mailto:soporte@tourdelcafe.org" style="color: #e67e22;">soporte@tourdelcafe.org</a>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Servicio de envío y registro de emails
 */
async function sendRegistrationEmails(registration) {
  ensureDataDir();
  const sentLogs = readJsonSafe(EMAILS_LOG_FILE, []);

  for (const p of registration.participants) {
    const emailData = {
      to: p.email,
      fullName: p.fullName,
      subject: `¡Inscripción Confirmada! Tour del Café 2027 - Dorsal ${p.dorsalNumber}`,
      dorsal: p.dorsalNumber,
      invoiceNumber: registration.invoiceNumber,
      refPayco: registration.refPayco,
      sentAt: new Date().toISOString()
    };

    // Intentar envío real con Nodemailer si las credenciales de entorno de Hostinger existen
    let dispatchedViaSmtp = false;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: (process.env.SMTP_PORT || '465') === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"Tour del Café Oficial" <${process.env.SMTP_USER}>`,
          to: p.email,
          subject: emailData.subject,
          html: buildEmailTemplate(registration, p)
        });
        dispatchedViaSmtp = true;
        console.log(`[RegistrationEmail] Enviado por SMTP con éxito a ${p.email}`);
      } catch (smtpErr) {
        console.warn(`[RegistrationEmail] No se pudo enviar por SMTP a ${p.email}:`, smtpErr.message);
      }
    }

    emailData.dispatchedViaSmtp = dispatchedViaSmtp;
    sentLogs.push(emailData);
    console.log(`[RegistrationService] Email registrado para ${p.fullName} (${p.email}) - Dorsal: ${p.dorsalNumber}`);
  }

  writeJsonAtomic(EMAILS_LOG_FILE, sentLogs);
}

/**
 * Consulta registro por referencia de ePayco o factura
 */
function findRegistration(refOrInvoice) {
  const registrations = readJsonSafe(REGISTRATIONS_FILE, []);
  return registrations.find(r => r.refPayco === refOrInvoice || r.invoiceNumber === refOrInvoice) || null;
}

/**
 * Obtener todos los registros confirmados (para consola administrativa)
 */
function getAllRegistrations() {
  return readJsonSafe(REGISTRATIONS_FILE, []);
}

module.exports = {
  PRICING_STAGES,
  getCurrentPricingStage,
  calculateAgeAtCutOff,
  validateRegistrationRules,
  savePendingRegistration,
  getPendingRegistration,
  processPaidRegistration,
  processCourtesyRegistration,
  findRegistration,
  getAllRegistrations
};

