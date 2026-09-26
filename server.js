const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');
const inventoryService = require('./inventory-service');
const registrationService = require('./registration-service');
const couponService = require('./coupon-service');

const port = process.env.PORT || 8080;
const root = __dirname;

// Credenciales administrativas seguras (variables de entorno en Hostinger o fallback)
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'mitico_admin_2027';
const ADMIN_SECRET = process.env.ADMIN_KEY || 'mitico_admin_2027';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

/**
 * Helper para responder en formato JSON con headers CORS
 */
function sendJson(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

/**
 * Helper para leer y parsear el body de peticiones POST
 */
function parseRequestBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => {
      if (!raw) return resolve({});
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          return resolve(JSON.parse(raw));
        } catch (e) {
          return resolve({});
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          return resolve(querystring.parse(raw));
        } catch (e) {
          return resolve({});
        }
      } else {
        try {
          return resolve(JSON.parse(raw));
        } catch (e) {
          return resolve(querystring.parse(raw));
        }
      }
    });
  });
}

/**
 * Generador de tokens de sesión firmados criptográficamente (HMAC SHA-256)
 */
function createSessionToken(username) {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 horas de vigencia
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/**
 * Valida la firma y expiración del token de sesión
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Helper para extraer cookies del header
 */
function getCookie(req, name) {
  const cookieHeader = req.headers['cookie'];
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Valida autenticación administrativa en múltiples capas (Cookie, Bearer, x-admin-key, Query)
 */
function checkAdminAuth(req, parsedUrl) {
  // 1. Cookie HttpOnly de sesión
  const cookieToken = getCookie(req, 'admin_session_token');
  if (cookieToken && verifySessionToken(cookieToken)) {
    return true;
  }

  // 2. Header Authorization Bearer
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === ADMIN_SECRET || verifySessionToken(token)) {
      return true;
    }
  }

  // 3. Header x-admin-key
  const headerKey = req.headers['x-admin-key'];
  if (headerKey && (headerKey === ADMIN_SECRET || verifySessionToken(headerKey))) {
    return true;
  }

  // 4. Query param key (para exportaciones directas o webhooks seguros)
  const queryKey = parsedUrl.query ? querystring.parse(parsedUrl.query).key : null;
  if (queryKey && (queryKey === ADMIN_SECRET || verifySessionToken(queryKey))) {
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url);
  const cleanUrl = parsedUrl.pathname;
  const decodedUrl = decodeURIComponent(cleanUrl);

  // Manejo de preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key, Authorization'
    });
    res.end();
    return;
  }

  // ==========================================
  // CAPA API: CONTROL DE INVENTARIO Y EPAYCO
  // ==========================================

  // 1. GET /api/inventory/public: Disponibilidad pública para la tienda en vivo
  if (req.method === 'GET' && decodedUrl === '/api/inventory/public') {
    try {
      const publicStock = inventoryService.getPublicStock();
      return sendJson(res, 200, { success: true, ...publicStock });
    } catch (err) {
      console.error('[API] Error en /api/inventory/public:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. POST /api/inventory/validate-cart: Validación pre-checkout de items
  if (req.method === 'POST' && decodedUrl === '/api/inventory/validate-cart') {
    try {
      const body = await parseRequestBody(req);
      const items = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : []);
      const validation = inventoryService.validateCartStock(items);
      return sendJson(res, 200, { success: true, ...validation });
    } catch (err) {
      console.error('[API] Error en /api/inventory/validate-cart:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /api/orders/prepare: Guarda orden pendiente con items antes de invocar ePayco
  if (req.method === 'POST' && decodedUrl === '/api/orders/prepare') {
    try {
      const body = await parseRequestBody(req);
      const { invoiceNumber, items, customer } = body;
      if (!invoiceNumber || !items) {
        return sendJson(res, 400, { success: false, error: 'invoiceNumber e items requeridos' });
      }

      inventoryService.savePendingOrder(invoiceNumber, { items, customer });
      return sendJson(res, 200, { success: true, message: 'Orden pendiente registrada', invoiceNumber });
    } catch (err) {
      console.error('[API] Error en /api/orders/prepare:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ==========================================
  // CAPA API: INSCRIPCIONES TOUR DEL CAFÉ
  // ==========================================

  // A. GET /api/inscripciones/etapas: Obtiene etapa tarifaria activa (Hora Colombia)
  if (req.method === 'GET' && decodedUrl === '/api/inscripciones/etapas') {
    try {
      const stageData = registrationService.getCurrentPricingStage();
      return sendJson(res, 200, { success: true, ...stageData });
    } catch (err) {
      console.error('[API] Error en /api/inscripciones/etapas:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // B. POST /api/inscripciones/preparar: Valida datos y registra orden pendiente antes de ePayco (con soporte de cupones)
  if (req.method === 'POST' && decodedUrl === '/api/inscripciones/preparar') {
    try {
      const body = await parseRequestBody(req);
      const { route, categoryId, categoryName, teamName, participants, payerEmail, payerPhone, couponCode } = body;

      // 1. Validación matemática y de reglas
      const validation = registrationService.validateRegistrationRules(route, categoryId, participants, teamName);
      if (!validation.valid) {
        return sendJson(res, 400, { success: false, errors: validation.errors });
      }

      // 2. Determinar etapa activa y valor total
      const stageInfo = registrationService.getCurrentPricingStage();
      const unitPrice = stageInfo.current.prices[route] || 490000;
      const baseTotal = unitPrice * participants.length;
      let finalTotal = baseTotal;
      let appliedCoupon = null;

      // Validación opcional de cupón
      if (couponCode) {
        const couponCheck = couponService.validateCoupon(couponCode, baseTotal);
        if (couponCheck.valid) {
          appliedCoupon = couponCheck;
          finalTotal = couponCheck.finalAmount;
        } else {
          return sendJson(res, 400, { success: false, error: couponCheck.error });
        }
      }

      // 3. Sanitizar y desagregar nombres/apellidos por participante
      const sanitizedParticipants = (participants || []).map(p => {
        const nombres = (p.nombres || '').trim();
        const apellidos = (p.apellidos || '').trim();
        const fullName = (p.fullName || `${nombres} ${apellidos}`).trim();
        return {
          ...p,
          nombres: nombres || (fullName ? fullName.split(/\s+/).slice(0, -1).join(' ') : ''),
          apellidos: apellidos || (fullName ? fullName.split(/\s+/).slice(-1).join(' ') : ''),
          fullName
        };
      });

      // 4. Generar número de factura único para inscripciones
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const invoiceNumber = `TDC-INS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

      // 5. Guardar orden pendiente
      const savedPending = registrationService.savePendingRegistration(invoiceNumber, {
        route,
        categoryId,
        categoryName,
        teamName: teamName ? String(teamName).trim() : null,
        stage: stageInfo.current.id,
        stageName: stageInfo.current.name,
        unitPrice,
        baseAmount: baseTotal,
        discountPercent: appliedCoupon ? appliedCoupon.discountPercent : 0,
        discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        totalAmount: finalTotal,
        participants: sanitizedParticipants,
        payerEmail: payerEmail || sanitizedParticipants[0].email,
        payerPhone: payerPhone || sanitizedParticipants[0].phone
      });

      return sendJson(res, 200, {
        success: true,
        invoiceNumber,
        unitPrice,
        baseAmount: baseTotal,
        discountPercent: appliedCoupon ? appliedCoupon.discountPercent : 0,
        discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        totalAmount: finalTotal,
        isCourtesy: finalTotal === 0,
        stage: stageInfo.current,
        message: 'Orden de inscripción pendiente registrada correctamente'
      });
    } catch (err) {
      console.error('[API] Error en /api/inscripciones/preparar:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // B2. POST /api/inscripciones/completar-cortesia: Confirmación directa para cortesías 100% (sin ePayco)
  if (req.method === 'POST' && decodedUrl === '/api/inscripciones/completar-cortesia') {
    try {
      const body = await parseRequestBody(req);
      const { invoiceNumber, couponCode, route, categoryId, categoryName, teamName, participants, payerEmail, payerPhone } = body;

      if (!couponCode) {
        return sendJson(res, 400, { success: false, error: 'Código de cupón de cortesía requerido.' });
      }

      const coupon = couponService.getCoupon(couponCode);
      if (!coupon || !coupon.active || coupon.discountPercent !== 100) {
        return sendJson(res, 400, { success: false, error: 'El cupón no es válido para cortesía del 100%.' });
      }

      let targetInvoice = invoiceNumber;

      // Caso 1: Orden pendiente preexistente
      if (targetInvoice && registrationService.getPendingRegistration(targetInvoice)) {
        const result = registrationService.processCourtesyRegistration(targetInvoice, coupon.code);
        return sendJson(res, 200, { success: true, ...result });
      }

      // Caso 2: Registro directo
      if (!route || !categoryId || !participants || !participants.length) {
        return sendJson(res, 400, { success: false, error: 'Datos de participantes incompletos para cortesía.' });
      }

      const validation = registrationService.validateRegistrationRules(route, categoryId, participants, teamName);
      if (!validation.valid) {
        return sendJson(res, 400, { success: false, errors: validation.errors });
      }

      const stageInfo = registrationService.getCurrentPricingStage();
      const unitPrice = stageInfo.current.prices[route] || 490000;
      const baseTotal = unitPrice * participants.length;
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      targetInvoice = `TDC-INS-COR-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

      const sanitizedParticipants = (participants || []).map(p => {
        const nombres = (p.nombres || '').trim();
        const apellidos = (p.apellidos || '').trim();
        const fullName = (p.fullName || `${nombres} ${apellidos}`).trim();
        return {
          ...p,
          nombres: nombres || (fullName ? fullName.split(/\s+/).slice(0, -1).join(' ') : ''),
          apellidos: apellidos || (fullName ? fullName.split(/\s+/).slice(-1).join(' ') : ''),
          fullName
        };
      });

      registrationService.savePendingRegistration(targetInvoice, {
        route,
        categoryId,
        categoryName,
        teamName: teamName ? String(teamName).trim() : null,
        stage: stageInfo.current.id,
        stageName: stageInfo.current.name,
        unitPrice,
        baseAmount: baseTotal,
        discountPercent: 100,
        discountAmount: baseTotal,
        couponCode: coupon.code,
        totalAmount: 0,
        participants: sanitizedParticipants,
        payerEmail: payerEmail || sanitizedParticipants[0].email,
        payerPhone: payerPhone || sanitizedParticipants[0].phone
      });

      const result = registrationService.processCourtesyRegistration(targetInvoice, coupon.code);
      return sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      console.error('[API] Error en /api/inscripciones/completar-cortesia:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // B3. POST /api/coupons/validate: Validación pública de cupones para el checkout
  if (req.method === 'POST' && decodedUrl === '/api/coupons/validate') {
    try {
      const body = await parseRequestBody(req);
      const { code, totalAmount } = body;
      const result = couponService.validateCoupon(code, totalAmount);
      if (!result.valid) {
        return sendJson(res, 400, { success: false, error: result.error });
      }
      return sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      console.error('[API] Error en /api/coupons/validate:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // C. GET /api/inscripciones/consultar: Consulta estado de inscripción y dorsales
  if (req.method === 'GET' && decodedUrl === '/api/inscripciones/consultar') {
    try {
      const query = parsedUrl.query ? querystring.parse(parsedUrl.query) : {};
      const refOrInvoice = query.ref || query.invoice;
      if (!refOrInvoice) {
        return sendJson(res, 400, { success: false, error: 'Parámetro ref o invoice requerido' });
      }

      const confirmed = registrationService.findRegistration(refOrInvoice);
      if (confirmed) {
        return sendJson(res, 200, { success: true, status: 'CONFIRMED', registration: confirmed });
      }

      const pending = registrationService.getPendingRegistration(refOrInvoice);
      if (pending) {
        return sendJson(res, 200, { success: true, status: 'PENDING', registration: pending });
      }

      return sendJson(res, 404, { success: false, error: 'Inscripción no encontrada' });
    } catch (err) {
      console.error('[API] Error en /api/inscripciones/consultar:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. POST /api/epayco-webhook y /api/epayco/confirmacion: Webhook de confirmación ePayco
  if (req.method === 'POST' && (decodedUrl === '/api/epayco-webhook' || decodedUrl === '/api/epayco/confirmacion')) {
    try {
      const body = await parseRequestBody(req);
      console.log('[ePayco Webhook Received]', JSON.stringify(body, null, 2));

      // Extraer campos de ePayco
      const refPayco = body.x_ref_payco || body.ref_payco;
      const invoiceNumber = body.x_id_invoice || body.x_invoice || body.invoice;
      const codResponse = (body.x_cod_response || body.cod_response || '').toString();
      const transactionState = (body.x_transaction_state || body.transaction_state || '').toString().toLowerCase();

      // Verificar si la transacción fue Aprobada / Aceptada
      // ePayco: x_cod_response = 1 (Aceptada), 2 (Rechazada), 3 (Pendiente), 4 (Fallida)
      const isApproved = codResponse === '1' || ['aceptada', 'aprobada', 'approved', '1'].includes(transactionState);

      if (!isApproved) {
        console.log(`[ePayco Webhook] Transacción ${refPayco} estado no aprobado: ${transactionState} (cod: ${codResponse}).`);
        return sendJson(res, 200, { 
          status: 'ignored', 
          message: `Transacción con estado "${transactionState || codResponse}".`,
          ref: refPayco 
        });
      }

      // DISCRIMINACIÓN: ¿Es una orden de Inscripción o de Tienda?
      const isRegistration = (invoiceNumber && invoiceNumber.startsWith('TDC-INS')) ||
                             Boolean(registrationService.getPendingRegistration(invoiceNumber));

      if (isRegistration) {
        console.log(`[ePayco Webhook] Procesando confirmación de INSCRIPCIÓN: ${invoiceNumber} (Ref: ${refPayco})`);
        const regResult = registrationService.processPaidRegistration(invoiceNumber, refPayco, {
          date: body.x_transaction_date,
          franchise: body.x_franchise || body.x_bank_name
        });

        console.log(`[ePayco Webhook Success] Resultado de inscripción:`, regResult);
        return sendJson(res, 200, {
          status: 'success',
          type: 'registration',
          message: 'Inscripción confirmada, dorsales asignados y correos encolados',
          ref: refPayco,
          invoice: invoiceNumber,
          duplicate: Boolean(regResult.duplicate)
        });
      }

      // Caso Tienda de Productos: Intentar extraer items directamente de x_extra3 si viene estructurado en el payload
      let itemsToDeduct = null;
      if (body.x_extra3) {
        try {
          const parsedExtra3 = JSON.parse(body.x_extra3);
          if (Array.isArray(parsedExtra3)) {
            itemsToDeduct = parsedExtra3;
          } else if (parsedExtra3.items && Array.isArray(parsedExtra3.items)) {
            itemsToDeduct = parsedExtra3.items;
          }
        } catch (e) {
          console.log('[ePayco Webhook] x_extra3 no es JSON plano, se recurrirá a orden pendiente');
        }
      }

      const customerInfo = body.x_customer_email || body.x_extra1 || '';

      // Procesar deducción automática de inventario
      const saleResult = inventoryService.processEpaycoSale({
        orderRef: refPayco || `EPAYCO-${Date.now()}`,
        invoiceNumber,
        items: itemsToDeduct,
        customerInfo
      });

      console.log(`[ePayco Webhook Success] Resultado de venta ePayco:`, saleResult);

      return sendJson(res, 200, {
        status: 'success',
        type: 'store',
        message: 'Confirmación ePayco recibida y procesada correctamente',
        ref: refPayco,
        deducted: saleResult.success && !saleResult.duplicate,
        duplicate: Boolean(saleResult.duplicate)
      });
    } catch (err) {
      console.error('[ePayco Webhook Error]:', err);
      return sendJson(res, 500, { status: 'error', error: err.message });
    }
  }

  // 5. GET /api/admin/inventory: Panel administrativo - Listado de stock, alertas y Kardex
  if (req.method === 'GET' && decodedUrl === '/api/admin/inventory') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado. Clave administrativa requerida.' });
    }

    try {
      const stockData = inventoryService.getAllStock();
      const kardexData = inventoryService.getKardex({ limit: 100 });
      return sendJson(res, 200, {
        success: true,
        ...stockData,
        kardex: kardexData
      });
    } catch (err) {
      console.error('[API Admin] Error en /api/admin/inventory:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 6. POST /api/admin/inventory/movement: Registro manual de entradas (lotes) y salidas (catas/mermas)
  if (req.method === 'POST' && decodedUrl === '/api/admin/inventory/movement') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado. Clave administrativa requerida.' });
    }

    try {
      const body = await parseRequestBody(req);
      const { sku, variantId, tipo, cantidad, motivo, referencia, usuario, notas } = body;

      if (!sku && !variantId) {
        return sendJson(res, 400, { success: false, error: 'Debe especificar el SKU o variantId' });
      }
      if (!tipo || !cantidad) {
        return sendJson(res, 400, { success: false, error: 'Tipo (ENTRADA/SALIDA) y cantidad son obligatorios' });
      }

      const result = inventoryService.recordMovement({
        sku,
        variantId,
        tipo,
        cantidad,
        motivo,
        referencia,
        usuario,
        notas
      });

      return sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      console.error('[API Admin] Error en /api/admin/inventory/movement:', err.message);
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // ==========================================
  // CAPA API: AUTENTICACIÓN ADMINISTRATIVA
  // ==========================================

  // 7. POST /api/admin/login: Inicio de sesión protegido con credenciales de entorno
  if (req.method === 'POST' && decodedUrl === '/api/admin/login') {
    try {
      const body = await parseRequestBody(req);
      const username = (body.username || '').trim();
      const password = (body.password || '').trim();

      const isValid = 
        (username === ADMIN_USER && (password === ADMIN_PASS || password === ADMIN_SECRET)) ||
        (password === ADMIN_SECRET && (!username || username === 'admin'));

      if (!isValid) {
        return sendJson(res, 401, { success: false, error: 'Usuario o contraseña administrativa incorrectos.' });
      }

      const activeUser = username || ADMIN_USER;
      const token = createSessionToken(activeUser);
      const cookieHeader = {
        'Set-Cookie': `admin_session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      };

      console.log(`[Admin Auth] Sesión iniciada con éxito por usuario "${activeUser}".`);
      return sendJson(res, 200, {
        success: true,
        token,
        user: activeUser,
        message: 'Sesión administrativa autenticada'
      }, cookieHeader);
    } catch (err) {
      console.error('[Admin Auth] Error en login:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. POST /api/admin/logout: Cierre de sesión y limpieza de cookies
  if (req.method === 'POST' && decodedUrl === '/api/admin/logout') {
    const cookieHeader = {
      'Set-Cookie': `admin_session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    };
    return sendJson(res, 200, { success: true, message: 'Sesión administrativa cerrada' }, cookieHeader);
  }

  // 9. GET /api/admin/check-session: Verificación de estado de sesión
  if (req.method === 'GET' && decodedUrl === '/api/admin/check-session') {
    const isAuthed = checkAdminAuth(req, parsedUrl);
    if (isAuthed) {
      return sendJson(res, 200, { success: true, authenticated: true });
    }
    return sendJson(res, 401, { success: false, authenticated: false, error: 'Sesión no válida o expirada' });
  }

  // ==========================================
  // CAPA API: CONSOLA DE INSCRITOS
  // ==========================================

  // 10. GET /api/admin/registrations: Listado completo de inscritos y KPIs
  if (req.method === 'GET' && decodedUrl === '/api/admin/registrations') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado. Inicia sesión en el panel.' });
    }

    try {
      const registrations = registrationService.getAllRegistrations();

      // Métricas KPI agregadas
      let totalRiders = 0;
      let macchiatoRiders = 0;
      let espressoRiders = 0;
      let courtesyRiders = 0;
      let totalRevenue = 0;

      registrations.forEach(r => {
        const count = r.participants ? r.participants.length : 1;
        totalRiders += count;

        if (r.route === 'macchiato') macchiatoRiders += count;
        if (r.route === 'espresso') espressoRiders += count;

        if (r.paymentType === 'COURTESY' || r.discountPercent === 100 || r.totalAmount === 0) {
          courtesyRiders += count;
        } else {
          totalRevenue += (r.totalAmount || 0);
        }
      });

      return sendJson(res, 200, {
        success: true,
        registrations,
        kpis: {
          totalRegistrations: registrations.length,
          totalRiders,
          macchiatoRiders,
          espressoRiders,
          courtesyRiders,
          totalRevenue
        }
      });
    } catch (err) {
      console.error('[API Admin] Error en /api/admin/registrations:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 11. GET /api/admin/export-csv: Descarga directa de archivo CSV para Microsoft Excel
  if (req.method === 'GET' && decodedUrl === '/api/admin/export-csv') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado.' });
    }

    try {
      const registrations = registrationService.getAllRegistrations();
      const headers = [
        'Dorsal', 'Factura Consecutivo', 'Referencia Pago', 'Tipo de Pago', 'Valor Pagado (COP)',
        'Cupón Aplicado', 'Descuento %', 'Fecha Registro', 'Recorrido', 'Categoría Oficial',
        'Nombre del Equipo',
        'Integrante #', 'Nombres', 'Apellidos', 'Nombre Completo', 'Tipo Doc', 'Número Documento', 'Género',
        'Fecha Nacimiento', 'Edad Oficial 2027', 'Talla Jersey', 'Email Corredor', 'Teléfono WhatsApp',
        'País', 'Departamento', 'Ciudad', 'EPS o Seguro', 'Grupo Sanguíneo RH',
        'Contacto Emergencia', 'Teléfono Emergencia', 'Observaciones Médicas'
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      const rows = [];
      registrations.forEach(order => {
        (order.participants || []).forEach((p, idx) => {
          const pNombres = p.nombres || (p.fullName ? p.fullName.trim().split(/\s+/).slice(0, -1).join(' ') : '');
          const pApellidos = p.apellidos || (p.fullName ? p.fullName.trim().split(/\s+/).slice(-1).join(' ') : '');
          const pFullName = p.fullName || `${pNombres} ${pApellidos}`.trim();
          rows.push([
            escapeCSV(p.dorsalNumber || ''),
            escapeCSV(order.invoiceNumber || ''),
            escapeCSV(order.refPayco || ''),
            escapeCSV(order.paymentType === 'COURTESY' ? 'Cortesía 100%' : 'ePayco Aprobado'),
            escapeCSV(order.totalAmount || 0),
            escapeCSV(order.couponCode || 'Ninguno'),
            escapeCSV(order.discountPercent || 0),
            escapeCSV(order.paymentDate || order.createdAt || ''),
            escapeCSV(order.routeName || order.route),
            escapeCSV(order.categoryName || order.category),
            escapeCSV(order.teamName || p.teamName || 'N/A'),
            escapeCSV(`${idx + 1}/${order.participants.length}`),
            escapeCSV(pNombres),
            escapeCSV(pApellidos),
            escapeCSV(pFullName),
            escapeCSV(p.docType || 'CC'),
            escapeCSV(p.docNumber || ''),
            escapeCSV(p.gender === 'M' ? 'Masculino' : 'Femenino'),
            escapeCSV(p.birthDate || ''),
            escapeCSV(p.calculatedAge2027 || ''),
            escapeCSV(p.jerseySize || ''),
            escapeCSV(p.email || ''),
            escapeCSV(p.phone || ''),
            escapeCSV(p.country || 'Colombia'),
            escapeCSV(p.department || ''),
            escapeCSV(p.city || ''),
            escapeCSV(p.eps || ''),
            escapeCSV(p.bloodType || ''),
            escapeCSV(p.emergencyContactName || ''),
            escapeCSV(p.emergencyContactPhone || ''),
            escapeCSV(p.medicalNotes || 'Ninguna')
          ].join(';'));
        });
      });

      // UTF-8 BOM (\uFEFF) para compatibilidad nativa con Excel
      const csvData = '\uFEFF' + [headers.map(escapeCSV).join(';'), ...rows].join('\r\n');

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Inscritos_Tour_del_Cafe_${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-cache'
      });
      res.end(csvData);
      return;
    } catch (err) {
      console.error('[API Admin] Error en /api/admin/export-csv:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ==========================================
  // CAPA API: GESTIÓN DE CUPONES & CORTESÍAS
  // ==========================================

  // 12. GET /api/admin/coupons: Obtiene listado de todos los cupones
  if (req.method === 'GET' && decodedUrl === '/api/admin/coupons') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado.' });
    }
    return sendJson(res, 200, { success: true, coupons: couponService.getAllCoupons() });
  }

  // 13. POST /api/admin/coupons: Crear nuevo cupón
  if (req.method === 'POST' && decodedUrl === '/api/admin/coupons') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado.' });
    }
    try {
      const body = await parseRequestBody(req);
      const coupon = couponService.createCoupon(body);
      return sendJson(res, 200, { success: true, coupon });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 14. POST /api/admin/coupons/update: Actualizar cupón existente
  if (req.method === 'POST' && decodedUrl === '/api/admin/coupons/update') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado.' });
    }
    try {
      const body = await parseRequestBody(req);
      const coupon = couponService.updateCoupon(body.code, body);
      return sendJson(res, 200, { success: true, coupon });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 15. POST /api/admin/coupons/delete: Eliminar cupón
  if (req.method === 'POST' && decodedUrl === '/api/admin/coupons/delete') {
    if (!checkAdminAuth(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, error: 'Acceso no autorizado.' });
    }
    try {
      const body = await parseRequestBody(req);
      const deleted = couponService.deleteCoupon(body.code);
      return sendJson(res, 200, { success: true, deleted });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // ==========================================
  // SERVIDOR DE ARCHIVOS ESTÁTICOS
  // ==========================================
  let targetPath = decodedUrl;

  // Enrutamiento seguro para el panel de administración
  const isAdminRoute = decodedUrl === '/admin' || decodedUrl.startsWith('/admin/');
  if (isAdminRoute) {
    const isLoginView = decodedUrl === '/admin/login' || decodedUrl === '/admin/login.html';
    const isAuthed = checkAdminAuth(req, parsedUrl);

    if (isLoginView) {
      if (isAuthed) {
        res.writeHead(302, { 'Location': '/admin/dashboard.html' });
        res.end();
        return;
      }
      targetPath = '/admin/login.html';
    } else {
      if (!isAuthed) {
        res.writeHead(302, { 'Location': '/admin/login.html' });
        res.end();
        return;
      }
      if (decodedUrl === '/admin' || decodedUrl === '/admin/' || decodedUrl === '/admin/dashboard' || decodedUrl === '/admin/dashboard.html') {
        targetPath = '/admin/dashboard.html';
      }
    }
  }

  if (targetPath === '/' || targetPath.endsWith('/')) {
    targetPath = targetPath + 'index.html';
  }

  // Rutas directas limpias
  if (targetPath === '/inscripciones' || targetPath === '/inscripciones.html') {
    targetPath = '/inscripciones.html';
  }

  let filePath = path.join(root, targetPath);

  // Soporte para URLs sin extensión .html (ej: /tienda, /admin-inventario)
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (!filePath.startsWith(root)) {
    console.log(`[Response] 403 Forbidden for: ${filePath}`);
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.log(`[Response] 404 Not Found for: ${filePath}`);
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, () => {
  console.log(`[Server] Servidor ejecutándose en http://localhost:${port}/`);
});
