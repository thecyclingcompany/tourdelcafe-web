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
  const teamRow = (registration.teamName || participant.teamName)
    ? Buffer.from('PHRyPjx0ZCBzdHlsZT0icGFkZGluZzogMTBweCAwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJhMjUyNDsgY29sb3I6IHJnYmEoMjUwLDI1MCwyNTAsMC43KTsgZm9udC1zaXplOiAxNHB4OyI+Tm9tYnJlIGRlbCBFcXVpcG8gLyBEdXBsYTo8L3RkPjx0ZCBzdHlsZT0icGFkZGluZzogMTBweCAwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJhMjUyNDsgdGV4dC1hbGlnbjogcmlnaHQ7IGZvbnQtd2VpZ2h0OiA2MDA7IGNvbG9yOiAjZTY3ZTIyOyBmb250LXNpemU6IDE0cHg7Ij57e1RFQU1fTkFNRX19PC90ZD48L3RyPg==', 'base64')
      .toString('utf-8')
      .replace('{{TEAM_NAME}}', registration.teamName || participant.teamName)
    : '';

  const tplB64Part1 = 'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVzIj4KPGhlYWQ+CiAgPG1ldGEgY2hhcnNldD0idXRmLTgiPgogIDx0aXRsZT7CoUluc2NyaXBjacOzbiBDb25maXJtYWRhISAtIFRvdXIgZGVsIENhZsOpIEdyYW4gRm9uZG8gMjAyNzwvdGl0bGU+CiAgPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgo8L2hlYWQ+Cjxib2R5IHN0eWxlPSJtYXJnaW46IDA7IHBhZGRpbmc6IDIwcHggMDsgYmFja2dyb3VuZC1jb2xvcjogIzEyMTIxMjsgZm9udC1mYW1pbHk6ICdIZWx2ZXRpY2EgTmV1ZScsIEFyaWFsLCBzYW5zLXNlcmlmOyBjb2xvcjogI2ZmZmZmZjsiPgogIDx0YWJsZSByb2xlPSJwcmVzZW50YXRpb24iIHdpZHRoPSIxMDAlIiBib3JkZXI9IjAiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICMxMjEyMTI7Ij4KICAgIDx0cj4KICAgICAgPHRkIGFsaWduPSJjZW50ZXIiIHN0eWxlPSJwYWRkaW5nOiAxMHB4OyI+CiAgICAgICAgPHRhYmxlIHJvbGU9InByZXNlbnRhdGlvbiIgd2lkdGg9IjEwMCUiIGJvcmRlcj0iMCIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0ibWF4LXdpZHRoOiA2MDBweDsgYmFja2dyb3VuZC1jb2xvcjogIzFjMTgxNzsgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCByZ2JhKDI4LCAyNCwgMjMsIDAuOTYpIDU1JSwgcmdiYSgyOCwgMjQsIDIzLCAwLjc4KSAxMDAlKSwgdXJsKCdodHRwczovL3RvdXJkZWxjYWZlLm9yZy9hc3NldHMvQ29mZmVlX3BsYW50LmpwZWcnKTsgYmFja2dyb3VuZC1wb3NpdGlvbjogcmlnaHQgY2VudGVyOyBiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0OyBiYWNrZ3JvdW5kLXNpemU6IGNvdmVyOyBib3JkZXItcmFkaXVzOiA4cHg7IG92ZXJmbG93OiBoaWRkZW47IGJveC1zaGFkb3c6IDAgNHB4IDIwcHggcmdiYSgwLDAsMCwwLjUpOyI+CiAgICAgICAgICA8dHI+CiAgICAgICAgICAgIDx0ZCBhbGlnbj0iY2VudGVyIiBzdHlsZT0icGFkZGluZzogMzBweCAyMHB4OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJkMjQxZTsiPgogICAgICAgICAgICAgIDxpbWcgc3JjPSJodHRwczovL3RvdXJkZWxjYWZlLm9yZy9hc3NldHMvbG9nby1mZXN0aXZhbC1oZWFkZXIucG5nIiBhbHQ9IlRvdXIgZGVsIENhZsOpIEdyYW4gRm9uZG8iIHN0eWxlPSJtYXgtd2lkdGg6IDI4MHB4OyB3aWR0aDogMTAwJTsgaGVpZ2h0OiBhdXRvOyBkaXNwbGF5OiBibG9jazsgYm9yZGVyOiAwOyIgLz4KICAgICAgICAgICAgPC90ZD4KICAgICAgICAgIDwvdHI+CiAgICAgICAgICA8dHI+CiAgICAgICAgICAgIDx0ZCBzdHlsZT0icGFkZGluZzogMzBweCAyNHB4OyI+CiAgICAgICAgICAgICAgPHAgc3R5bGU9ImZvbnQtc2l6ZTogMThweDsgbWFyZ2luLXRvcDogMDsgY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsiPsKhSG9sYSwgPHN0cm9uZyBzdHlsZT0iY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsiPnt7Tk9NQlJFX0NPTVBMRVRPfX08L3N0cm9uZz4hPC9wPgogICAgICAgICAgICAgIDxwIHN0eWxlPSJjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OyBsaW5lLWhlaWdodDogMS42OyBmb250LXNpemU6IDE1cHg7IG1hcmdpbi1ib3R0b206IDIwcHg7Ij4KICAgICAgICAgICAgICAgIFR1IGluc2NyaXBjacOzbiBvZmljaWFsIGhhIHNpZG8gY29uZmlybWFkYSBjb24gw6l4aXRvLiBZYSBlcmVzIHBhcnRlIGRlbCBwZWxvdMOzbiBxdWUgdml2aXLDoSBsYSBleHBlcmllbmNpYSBtw6FzIGljw7NuaWNhIGRlbCBjaWNsaXNtbyB5IGVsIGNhZsOpIGVuIENvbG9tYmlhLgogICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDE1LCAxNCwgMTMsIDAuOTIpOyBib3JkZXI6IDJweCBkYXNoZWQgI2U2N2UyMjsgYm9yZGVyLXJhZGl1czogNnB4OyBwYWRkaW5nOiAyMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IG1hcmdpbjogMjBweCAwOyI+CiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJmb250LXNpemU6IDEycHg7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGNvbG9yOiAjYTc5MDc3OyBtYXJnaW4tYm90dG9tOiA0cHg7IGxldHRlci1zcGFjaW5nOiAxcHg7Ij5UVSBSRUdJU1RSTyBPRklDSUFMPC9kaXY+CiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJmb250LXNpemU6IDM2cHg7IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogI2U2N2UyMjsgbGV0dGVyLXNwYWNpbmc6IDJweDsgbWFyZ2luOiA4cHggMDsiPnt7RE9SU0FMX05VTUJFUn19PC9kaXY+CiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPSJmb250LXNpemU6IDE0cHg7IGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7IG1hcmdpbi10b3A6IDZweDsgZm9udC13ZWlnaHQ6IDUwMDsiPnt7Q0FURUdPUllfTkFNRX19PC9kaXY+CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgPHRhYmxlIHJvbGU9InByZXNlbnRhdGlvbiIgd2lkdGg9IjEwMCUiIGJvcmRlcj0iMCIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0id2lkdGg6IDEwMCU7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IG1hcmdpbi10b3A6IDE1cHg7Ij4KICAgICAgICAgICAgICAgIDx0cj4KICAgICAgICAgICAgICAgICAgPHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyBjb2xvcjogcmdiYSgyNTAsMjUwLDI1MCwwLjcpOyBmb250LXNpemU6IDE0cHg7Ij5DYXRlZ29yw61hIE9maWNpYWw6PC90ZD4KICAgICAgICAgICAgICAgICAgPHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyB0ZXh0LWFsaWduOiByaWdodDsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsgZm9udC1zaXplOiAxNHB4OyI+CiAgICAgICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9ImRpc3BsYXk6IGlubGluZS1ibG9jazsgcGFkZGluZzogNHB4IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMjExLDg0LDAsMC4yNSk7IGNvbG9yOiAjZTY3ZTIyOyBib3JkZXItcmFkaXVzOiA0cHg7Ij57e0NBVEVHT1JZX05BTUV9fTwvc3Bhbj4KICAgICAgICAgICAgICAgICAgPC90ZD4KICAgICAgICAgICAgICAgIDwvdHI+';

  const tplB64Part2 = 'e3tURUFNX1JPV319CjwvdGFibGU+CiAgICAgICAgICAgICAgPGRpdiBzdHlsZT0ibWFyZ2luLXRvcDogMjVweDsgcGFkZGluZzogMThweDsgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgzMCwgMjQsIDIxLCAwLjkpOyBib3JkZXI6IDFweCBkYXNoZWQgIzU5NDUzNzsgYm9yZGVyLXJhZGl1czogNnB4OyI+CiAgICAgICAgICAgICAgICA8aDQgc3R5bGU9ImNvbG9yOiAjZDRhMzczOyBmb250LXNpemU6IDE0cHg7IG1hcmdpbjogMCAwIDEwcHggMDsgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6IDAuNXB4OyI+SW5mb3JtYWNpw7NuIEltcG9ydGFudGUgZGUgQWNyZWRpdGFjacOzbjwvaDQ+CiAgICAgICAgICAgICAgICA8cCBzdHlsZT0iY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsgZm9udC1zaXplOiAxNHB4OyBsaW5lLWhlaWdodDogMS42OyBtYXJnaW46IDAgMCA4cHggMDsiPgogICAgICAgICAgICAgICAgICDigKIgR3VhcmRhIGVzdGUgY29ycmVvIHkgdHUgY29tcHJvYmFudGUgZGUgcGFnbyBjb21vIHNvcG9ydGUgb2ZpY2lhbCBkZSByZWdpc3Ryby4KICAgICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICAgIDxwIHN0eWxlPSJjb2xvcjogI2NmZmZmZiAhaW1wb3J0YW50OyBmb250LXNpemU6IDE0cHg7IGxpbmUtaGVpZ2h0OiAxLjY7IG1hcmdpbjogMCAwIDhweCAwOyI+CiAgICAgICAgICAgICAgICAgIOKAoiBFbiBsYXMgcHLDs3hpbWFzIHNlbWFuYXMgdGUgZW52aWFyZW1vcyBwb3IgZXN0ZSBtZWRpbyBsYSBjaXRhY2nDs24gcGFyYSBsYSBlbnRyZWdhIGRlIGtpdHMgZGUgY2FycmVyYSB5IGxhIGFjcmVkaXRhY2nDs24gb2ZpY2lhbC4KICAgICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICAgIDxwIHN0eWxlPSJjb2xvcjogI2NmZmZmZiAhaW1wb3J0YW50OyBmb250LXNpemU6IDE0cHg7IGxpbmUtaGVpZ2h0OiAxLjY7IG1hcmdpbjogMDsiPgogICAgICAgICAgICAgICAgICDigKIgUmVjdWVyZGEgcHJlc2VudGFyIHR1IGRvY3VtZW50byBkZSBpZGVudGlkYWQgcGFyYSByZWNsYW1hciB0dSBraXQgZW4gbG9zIGTDrWFzIHByZXZpb3MgYSBsYSBjYXJyZXJhLgogICAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgICA8L3RkPgogICAgICAgICAgPC90cj4KICAgICAgICAgIDx0cj4KICAgICAgICAgICAgPHRkIGFsaWduPSJjZW50ZXIiIHN0eWxlPSJwYWRkaW5nOiAyNXB4IDIwcHggMzVweCAyMHB4OyBib3JkZXItdG9wOiAxcHggc29saWQgIzJkMjQxZTsiPgogICAgICAgICAgICAgIDxwIHN0eWxlPSJjb2xvcjogI2NmZmZmZiAhaW1wb3J0YW50OyBmb250LXNpemU6IDE0cHg7IG1hcmdpbjogMCAwIDhweCAwOyBmb250LXdlaWdodDogNTAwOyI+CiAgICAgICAgICAgICAgICDCkVRpZW5lcyBkdWRhcyBvIG5lY2VzaXRhcyBhc2lzdGVuY2lhPyBFc2Nyw6liZW5vcyBhPGJyPgogICAgICAgICAgICAgICAgPGEgaHJlZj0ibWFpbHRvOmluZm9AdG91cmRlbGNhZmUub3JnIiBzdHlsZT0iY29sb3I6ICNkNGEzNzM7IHRleHQtZGVjb3JhdGlvbjogbm9uZTsgZm9udC13ZWlnaHQ6IDYwMDsiPmluZm9AdG91cmRlbGNhZmUub3JnPC9hPgogICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICA8cCBzdHlsZT0iY29sb3I6ICNhODlmOTE7IGZvbnQtc2l6ZTogMTNweDsgbWFyZ2luOiAxMnB4IDAgNHB4IDA7Ij4KICAgICAgICAgICAgICAgIFRvdXIgZGVsIENhZsOpIEdyYW4gRm9uZG8g4oCiIFF1aW5kw61vLCBDb2xvbWJpYQogICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICA8cCBzdHlsZT0iY29sb3I6ICM3YTcwNjU7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luOiAwOyI+CiAgICAgICAgICAgICAgICBPcmdhbml6YWRvIHBvciA8c3Ryb25nPlRoZSBDeWNsaW5nIENvbXBhbnk8L3N0cm9uZz4KICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgIDwvdGQ+CiAgICAgICAgICA8L3RyPgogICAgICAgIDwvdGFibGU+CiAgICAgIDwvdGQ+CiAgICA8L3RyPgogIDwvdGFibGU+CjwvYm9keT4KPC9odG1sPg==';

  const rowsB64 = 'PHRyPjx0ZCBzdHlsZT0icGFkZGluZzogMTBweCAwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJhMjUyNDsgY29sb3I6IHJnYmEoMjUwLDI1MCwyNTAsMC43KTsgZm9udC1zaXplOiAxNHB4OyI+RG9jdW1lbnRvOjwvdGQ+PHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyB0ZXh0LWFsaWduOiByaWdodDsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsgZm9udC1zaXplOiAxNHB4OyI+e3tET0NfVFlQRX19OiB7e0RPQ19OVU1CRVJ9fTwvdGQ+PC90cj48dHI+PHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyBjb2xvcjogcmdiYSgyNTAsMjUwLDI1MCwwLjcpOyBmb250LXNpemU6IDE0cHg7Ij5UYWxsYSBkZSBKZXJzZXkgU2VsZWNjaW9uYWRhOjwvdGQ+PHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyB0ZXh0LWFsaWduOiByaWdodDsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6ICNmZmZmZmYgIWltcG9ydGFudDsgZm9udC1zaXplOiAxNHB4OyI+e3tKRVJTRVlfU0laRX19PC90ZD48L3RyPjx0cj48dGQgc3R5bGU9InBhZGRpbmc6IDEwcHggMDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMyYTI1MjQ7IGNvbG9yOiByZ2JhKDI1MCwyNTAsMjUwLDAuNyk7IGZvbnQtc2l6ZTogMTRweDsiPkdydXBvIFNhbmd1w61uZW86PC90ZD48dGQgc3R5bGU9InBhZGRpbmc6IDEwcHggMDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMyYTI1MjQ7IHRleHQtYWxpZ246IHJpZ2h0OyBmb250LXdlaWdodDogNjAwOyBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OyBmb250LXNpemU6IDE0cHg7Ij57e0JMT09EX1RZUEV9fTwvdGQ+PC90cj48dHI+PHRkIHN0eWxlPSJwYWRkaW5nOiAxMHB4IDA7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyNTI0OyBjb2xvcjogcmdiYSgyNTAsMjUwLDI1MCwwLjcpOyBmb250LXNpemU6IDE0cHg7Ij5SZWZlcmVuY2lhIGRlIFBhZ286PC90ZD48dGQgc3R5bGU9InBhZGRpbmc6IDEwcHggMDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMyYTI1MjQ7IHRleHQtYWxpZ246IHJpZ2h0OyBmb250LXdlaWdodDogNjAwOyBjb2xvcjogI2ZmZmZmZiAhaW1wb3J0YW50OyBmb250LXNpemU6IDE0cHg7Ij57e1JFRl9QQVlDT319PC90ZD48L3RyPjx0cj48dGQgc3R5bGU9InBhZGRpbmc6IDEwcHggMDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMyYTI1MjQ7IGNvbG9yOiByZ2JhKDI1MCwyNTAsMjUwLDAuNyk7IGZvbnQtc2l6ZTogMTRweDsiPkZhY3R1cmEgLyBDb25zZWN1dGl2bzo8L3RkPjx0ZCBzdHlsZT0icGFkZGluZzogMTBweCAwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgIzJhMjUyNDsgdGV4dC1hbGlnbjogcmlnaHQ7IGZvbnQtd2VpZ2h0OiA2MDA7IGNvbG9yOiAjZmZmZmZmICFpbXBvcnRhbnQ7IGZvbnQtc2l6ZTogMTRweDsiPnt7SU5WT0lDRV9OVU1CRVJ9fTwvdGQ+PC90cj4=';

  const decodedPart1 = Buffer.from(tplB64Part1, 'base64').toString('utf-8');
  const decodedPart2 = Buffer.from(tplB64Part2, 'base64').toString('utf-8');
  const decodedRows = Buffer.from(rowsB64, 'base64').toString('utf-8');

  const fullHtml = decodedPart1 + decodedPart2;

  return fullHtml
    .replace('{{NOMBRE_COMPLETO}}', participant.fullName || 'Ciclista')
    .replace('{{DORSAL_NUMBER}}', participant.dorsalNumber || 'POR ASIGNAR')
    .replace(/\{\{CATEGORY_NAME\}\}/g, registration.categoryName || 'Gran Fondo')
    .replace('{{TEAM_ROW}}', teamRow + decodedRows)
    .replace('{{DOC_TYPE}}', participant.docType || 'ID')
    .replace('{{DOC_NUMBER}}', participant.docNumber || 'N/A')
    .replace('{{JERSEY_SIZE}}', participant.jerseySize || 'M')
    .replace('{{BLOOD_TYPE}}', participant.bloodType || 'N/A')
    .replace('{{REF_PAYCO}}', registration.refPayco || 'N/A')
    .replace('{{INVOICE_NUMBER}}', registration.invoiceNumber || 'N/A');
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

