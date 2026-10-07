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
    name: 'Chapola',
    startDate: '2026-09-28T00:00:00-05:00',
    endDate: '2026-10-25T23:59:59-05:00',
    prices: {
      macchiato: 490000,
      espresso: 490000,
      standard: 490000,
      vip: 490000
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
      espresso: 540000,
      standard: 540000,
      vip: 540000
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
      try { fs.unlinkSync(tempFile); } catch (e) { }
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
  const isGenesis = ['standard', 'vip'].includes(route) || (categoryId && categoryId.startsWith('genesis-'));

  if (!['macchiato', 'espresso', 'standard', 'vip'].includes(route) && !isGenesis) {
    errors.push('El evento o recorrido seleccionado no es válido.');
    return { valid: false, errors };
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    errors.push('Debe registrar al menos un participante.');
    return { valid: false, errors };
  }

  // Validaciones básicas de campos por participante
  participants.forEach((p, idx) => {
    const num = idx + 1;
    const nombres = (p.nombres || '').trim();
    const apellidos = (p.apellidos || '').trim();

    // Desagregar automáticamente si viene fullName por retrocompatibilidad
    if ((!nombres || !apellidos) && p.fullName) {
      const parts = p.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        if (!nombres) p.nombres = parts.slice(0, -1).join(' ');
        if (!apellidos) p.apellidos = parts.slice(-1).join(' ');
      } else {
        if (!nombres) p.nombres = parts[0] || '';
        if (!apellidos) p.apellidos = '';
      }
    }
    // Asegurar fullName consolidado siempre
    if (!p.fullName && (p.nombres || p.apellidos)) {
      p.fullName = `${p.nombres || ''} ${p.apellidos || ''}`.trim();
    }

    if (!p.nombres || p.nombres.trim().length < 2) errors.push(`Participante #${num}: Ingrese los nombres.`);
    if (!p.apellidos || p.apellidos.trim().length < 2) errors.push(`Participante #${num}: Ingrese los apellidos.`);
    if (!p.docType) errors.push(`Participante #${num}: Seleccione el tipo de documento.`);
    if (!p.docNumber || p.docNumber.trim().length < 4) errors.push(`Participante #${num}: Ingrese el número de documento.`);
    if (!p.birthDate) errors.push(`Participante #${num}: Ingrese la fecha de nacimiento.`);
    if (!p.gender || !['M', 'F'].includes(p.gender)) errors.push(`Participante #${num}: Seleccione el género (Masculino/Femenino).`);
    if (!p.bloodType) errors.push(`Participante #${num}: Ingrese el tipo de sangre y RH.`);
    if (!p.email || !p.email.includes('@')) errors.push(`Participante #${num}: Ingrese un correo electrónico válido.`);
    if (!p.phone || p.phone.trim().length < 7) errors.push(`Participante #${num}: Ingrese el número de WhatsApp.`);

    // En Genesis: VIP o Standard con jersey requieren talla
    if (isGenesis) {
      const isVip = route === 'vip' || categoryId === 'genesis-vip';
      const hasJersey = p.hasJersey || p.jerseyPrice > 0 || isVip;
      if (hasJersey && (!p.jerseySize || p.jerseySize === 'No incluido')) {
        errors.push(`Participante #${num}: Seleccione la talla de Jersey oficial.`);
      }
    } else {
      if (!p.jerseySize) errors.push(`Participante #${num}: Seleccione la talla de jersey.`);
    }

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

  // Si es Genesis Coffee Ride, validación completada para 1 corredor
  if (isGenesis) {
    if (participants.length !== 1) {
      errors.push('La inscripción individual de Genesis Coffee Ride requiere exactamente 1 participante.');
      return { valid: false, errors };
    }
    return { valid: true, errors: [] };
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
  let prefix = 'GEN';
  if (route === 'macchiato') prefix = 'MAC';
  else if (route === 'espresso') prefix = 'ESP';
  else if (route === 'vip') prefix = 'VIP';
  else if (route === 'standard') prefix = 'STD';
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

  const isGenesis = ['standard', 'vip'].includes(pending.route) || (pending.categoryId && pending.categoryId.startsWith('genesis-'));
  const routeDisplayName = isGenesis
    ? `Genesis Coffee Ride - ${pending.categoryName || (pending.route === 'vip' ? 'Experiencia VIP' : 'Inscripción Standard')}`
    : (pending.route === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)');

  const finalRecord = {
    invoiceNumber,
    refPayco,
    event: pending.event || (isGenesis ? 'coffee-ride' : (pending.route === 'junior' ? 'junior' : 'gran-fondo')),
    route: pending.route,
    routeName: routeDisplayName,
    category: pending.categoryId || pending.category,
    categoryName: pending.categoryName || (pending.route === 'vip' ? 'Experiencia VIP' : 'Inscripción Standard'),
    teamName: pending.teamName || null,
    hasJersey: pending.hasJersey || false,
    jerseyPrice: pending.jerseyPrice || 0,
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

  const isGenesis = ['standard', 'vip'].includes(pending.route) || (pending.categoryId && pending.categoryId.startsWith('genesis-'));
  const routeDisplayName = isGenesis
    ? `Genesis Coffee Ride - ${pending.categoryName || (pending.route === 'vip' ? 'Experiencia VIP' : 'Inscripción Standard')}`
    : (pending.route === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)');

  const finalRecord = {
    invoiceNumber,
    refPayco,
    event: pending.event || (isGenesis ? 'coffee-ride' : (pending.route === 'junior' ? 'junior' : 'gran-fondo')),
    route: pending.route,
    routeName: routeDisplayName,
    category: pending.categoryId || pending.category,
    categoryName: pending.categoryName || (pending.route === 'vip' ? 'Experiencia VIP' : 'Inscripción Standard'),
    teamName: pending.teamName || null,
    hasJersey: pending.hasJersey || false,
    jerseyPrice: pending.jerseyPrice || 0,
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
  const isGenesis = ['standard', 'vip'].includes(registration.route) ||
    (registration.category && registration.category.startsWith('genesis-')) ||
    (registration.routeName && registration.routeName.includes('Genesis')) ||
    (registration.categoryName && registration.categoryName.includes('VIP'));

  const eventTitle = isGenesis ? 'Genesis Coffee Ride 2027' : 'Tour del Café Gran Fondo 2027';
  const categoryLabel = isGenesis ? 'Tipo de Inscripción:' : 'Categoría Oficial:';
  const categoryDisplay = registration.categoryName || (registration.route === 'vip' ? 'Experiencia VIP' : 'Inscripción Standard');
  const jerseySizeDisplay = participant.jerseySize || (registration.hasJersey ? 'Seleccionada' : 'No incluido');

  const teamRow = (registration.teamName || participant.teamName)
    ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Nombre del Equipo / Dupla:</td><td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #e67e22; font-size: 14px;">${registration.teamName || participant.teamName}</td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>¡Inscripción Confirmada! - ${eventTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px 0; background-color: #121212; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121212;">
    <tr>
      <td align="center" style="padding: 10px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1c1817; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding: 30px 20px; border-bottom: 1px solid #2d241e; background: #151312;">
              <img src="https://tourdelcafe.org/assets/logo-festival-header.png" alt="Tour del Café" style="max-width: 260px; width: 100%; height: auto; display: block; border: 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 24px;">
              <p style="font-size: 18px; margin-top: 0; color: #ffffff !important;">¡Hola, <strong>${participant.fullName || 'Ciclista'}</strong>!</p>
              <p style="color: #e0dcd9; line-height: 1.6; font-size: 15px; margin-bottom: 20px;">
                ${isGenesis
                  ? 'Tu inscripción oficial para el <strong>Genesis Coffee Ride</strong> ha sido confirmada con éxito. Ya eres parte del grupo selecto que vivirá el hito fundacional del movimiento <em>World\'s First Coffee &amp; Cycling Festival</em> en el Quindío.'
                  : 'Tu inscripción oficial para el <strong>Tour del Café Gran Fondo 2027</strong> ha sido confirmada con éxito. Ya eres parte del pelotón que vivirá la experiencia más icónica del ciclismo y el café en Colombia.'}
              </p>
              <div style="background-color: rgba(15, 14, 13, 0.92); border: 2px dashed #e67e22; border-radius: 6px; padding: 20px; text-align: center; margin: 20px 0;">
                <div style="font-size: 12px; text-transform: uppercase; color: #a79077; margin-bottom: 4px; letter-spacing: 1px;">TU REGISTRO OFICIAL</div>
                <div style="font-size: 34px; font-weight: bold; color: #e67e22; letter-spacing: 2px; margin: 8px 0;">${participant.dorsalNumber || 'POR ASIGNAR'}</div>
                <div style="font-size: 15px; color: #ffffff !important; margin-top: 6px; font-weight: 600;">${categoryDisplay}</div>
              </div>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">${categoryLabel}</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(211,84,0,0.25); color: #e67e22; border-radius: 4px;">${categoryDisplay}</span>
                  </td>
                </tr>
                ${teamRow}
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Documento:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">${participant.docType || 'ID'}: ${participant.docNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Talla de Jersey Oficial:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">${jerseySizeDisplay}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Grupo Sanguíneo:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">${participant.bloodType || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Referencia de Pago:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">${registration.refPayco || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; color: rgba(250,250,250,0.7); font-size: 14px;">Factura / Consecutivo:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2a2524; text-align: right; font-weight: 600; color: #ffffff !important; font-size: 14px;">${registration.invoiceNumber || 'N/A'}</td>
                </tr>
              </table>
              <div style="margin-top: 25px; padding: 18px; background-color: rgba(30, 24, 21, 0.9); border: 1px dashed #594537; border-radius: 6px;">
                <h4 style="color: #d4a373; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Información Importante de Acreditación</h4>
                <p style="color: #ffffff !important; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">• Guarda este correo y tu comprobante de pago como soporte oficial de registro.</p>
                <p style="color: #cfffff !important; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">• Te enviaremos por este medio la citación para la entrega de kits y la acreditación oficial.</p>
                <p style="color: #cfffff !important; font-size: 14px; line-height: 1.6; margin: 0;">• Recuerda presentar tu documento de identidad para reclamar tu kit en los días previos al evento.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 25px 20px 35px 20px; border-top: 1px solid #2d241e; background: #151312;">
              <p style="color: #ffffff !important; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">
                ¿Tienes dudas o necesitas asistencia? Escríbenos a<br>
                <a href="mailto:info@tourdelcafe.org" style="color: #d4a373; text-decoration: none; font-weight: 600;">info@tourdelcafe.org</a>
              </p>
              <p style="color: #a89f91; font-size: 13px; margin: 12px 0 4px 0;">
                ${isGenesis ? 'Genesis Coffee Ride • Quindío, Colombia • Febrero 2027' : 'Tour del Café Gran Fondo • Quindío, Colombia • 2027'}
              </p>
              <p style="color: #7a7065; font-size: 12px; margin: 0;">
                Organizado por <strong>The Cycling Company</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

  const isGenesis = ['standard', 'vip'].includes(registration.route) ||
    (registration.category && registration.category.startsWith('genesis-')) ||
    (registration.routeName && registration.routeName.includes('Genesis'));

  const eventTitle = isGenesis ? 'Genesis Coffee Ride 2027' : 'Tour del Café 2027';

  for (const p of registration.participants) {
    const emailData = {
      to: p.email,
      fullName: p.fullName,
      subject: `¡Inscripción Confirmada! ${eventTitle} - Dorsal ${p.dorsalNumber}`,
      dorsal: p.dorsalNumber,
      invoiceNumber: registration.invoiceNumber,
      refPayco: registration.refPayco,
      sentAt: new Date().toISOString()
    };

    // Envío real con Nodemailer desde info@tourdelcafe.org
    let dispatchedViaSmtp = false;
    const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const smtpUser = process.env.SMTP_USER || 'info@tourdelcafe.org';
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '465', 10),
          secure: (process.env.SMTP_PORT || '465') === '465',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const fromSender = isGenesis
          ? `"Genesis Coffee Ride - Tour del Café" <${smtpUser}>`
          : `"Tour del Café Gran Fondo" <${smtpUser}>`;

        await transporter.sendMail({
          from: fromSender,
          to: p.email,
          replyTo: 'info@tourdelcafe.org',
          subject: emailData.subject,
          html: buildEmailTemplate(registration, p)
        });
        dispatchedViaSmtp = true;
        console.log(`[RegistrationEmail] Enviado por SMTP con éxito a ${p.email} desde ${smtpUser}`);
      } catch (smtpErr) {
        console.warn(`[RegistrationEmail] No se pudo enviar por SMTP a ${p.email}:`, smtpErr.message);
      }
    } else {
      console.log(`[RegistrationEmail Simulación] Credenciales SMTP no configuradas. Email preparado para ${p.email} desde ${smtpUser}`);
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

