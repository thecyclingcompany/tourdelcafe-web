/**
 * COUPON SERVICE - TOUR DEL CAFÉ
 * Gestión de cupones de descuento, cortesías 100% y auditoría de redenciones
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const COUPONS_FILE = path.join(DATA_DIR, 'cupones.json');

const INITIAL_COUPONS = [
  {
    code: 'SPONSOR100',
    description: 'Cortesía 100% Patrocinadores Oficiales',
    discountPercent: 100,
    maxUses: null,
    usedCount: 0,
    expiryDate: null,
    active: true,
    createdAt: '2026-09-24T00:00:00.000Z'
  },
  {
    code: 'CAFETEROS15',
    description: 'Descuento 15% Alianza Caficultores del Quindío',
    discountPercent: 15,
    maxUses: 100,
    usedCount: 0,
    expiryDate: '2027-02-01T23:59:59.000Z',
    active: true,
    createdAt: '2026-09-24T00:00:00.000Z'
  },
  {
    code: 'MITICO20',
    description: 'Descuento 20% Comunidad Mítico Cycling',
    discountPercent: 20,
    maxUses: 50,
    usedCount: 0,
    expiryDate: '2027-01-31T23:59:59.000Z',
    active: true,
    createdAt: '2026-09-24T00:00:00.000Z'
  },
  {
    code: 'PRENSA100',
    description: 'Cortesía Prensa, Periodistas y Creadores de Contenido',
    discountPercent: 100,
    maxUses: 25,
    usedCount: 0,
    expiryDate: null,
    active: true,
    createdAt: '2026-09-24T00:00:00.000Z'
  }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCoupons() {
  ensureDataDir();
  try {
    if (!fs.existsSync(COUPONS_FILE)) {
      writeCoupons(INITIAL_COUPONS);
      return INITIAL_COUPONS;
    }
    const raw = fs.readFileSync(COUPONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_COUPONS;
  } catch (err) {
    console.error('[CouponService] Error al leer cupones:', err.message);
    return INITIAL_COUPONS;
  }
}

function writeCoupons(coupons) {
  ensureDataDir();
  const tempFile = `${COUPONS_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(coupons, null, 2), 'utf8');
    fs.renameSync(tempFile, COUPONS_FILE);
  } catch (err) {
    console.error('[CouponService] Error escribiendo cupones:', err.message);
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2), 'utf8');
  }
}

/**
 * Obtener todos los cupones
 */
function getAllCoupons() {
  return readCoupons();
}

/**
 * Buscar un cupón por código
 */
function getCoupon(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  const coupons = readCoupons();
  return coupons.find(c => c.code.toUpperCase() === cleanCode) || null;
}

/**
 * Crear un nuevo cupón
 */
function createCoupon(couponData) {
  const coupons = readCoupons();
  const cleanCode = String(couponData.code || '').trim().toUpperCase();

  if (!cleanCode) {
    throw new Error('El código de cupón es obligatorio.');
  }

  if (coupons.some(c => c.code.toUpperCase() === cleanCode)) {
    throw new Error(`El código de cupón "${cleanCode}" ya existe.`);
  }

  const percent = parseInt(couponData.discountPercent, 10);
  if (isNaN(percent) || percent < 1 || percent > 100) {
    throw new Error('El porcentaje de descuento debe estar entre 1% y 100%.');
  }

  const newCoupon = {
    code: cleanCode,
    description: String(couponData.description || 'Descuento especial').trim(),
    discountPercent: percent,
    maxUses: couponData.maxUses ? parseInt(couponData.maxUses, 10) : null,
    usedCount: 0,
    expiryDate: couponData.expiryDate ? new Date(couponData.expiryDate).toISOString() : null,
    active: couponData.active !== false,
    createdAt: new Date().toISOString()
  };

  coupons.push(newCoupon);
  writeCoupons(coupons);
  return newCoupon;
}

/**
 * Actualizar un cupón existente
 */
function updateCoupon(code, updateData) {
  const coupons = readCoupons();
  const cleanCode = String(code).trim().toUpperCase();
  const index = coupons.findIndex(c => c.code.toUpperCase() === cleanCode);

  if (index === -1) {
    throw new Error(`El cupón "${cleanCode}" no fue encontrado.`);
  }

  const current = coupons[index];

  if (updateData.discountPercent !== undefined) {
    const percent = parseInt(updateData.discountPercent, 10);
    if (isNaN(percent) || percent < 1 || percent > 100) {
      throw new Error('El porcentaje de descuento debe estar entre 1% y 100%.');
    }
    current.discountPercent = percent;
  }

  if (updateData.description !== undefined) {
    current.description = String(updateData.description).trim();
  }

  if (updateData.maxUses !== undefined) {
    current.maxUses = updateData.maxUses ? parseInt(updateData.maxUses, 10) : null;
  }

  if (updateData.expiryDate !== undefined) {
    current.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate).toISOString() : null;
  }

  if (updateData.active !== undefined) {
    current.active = Boolean(updateData.active);
  }

  coupons[index] = current;
  writeCoupons(coupons);
  return current;
}

/**
 * Eliminar un cupón
 */
function deleteCoupon(code) {
  const coupons = readCoupons();
  const cleanCode = String(code).trim().toUpperCase();
  const index = coupons.findIndex(c => c.code.toUpperCase() === cleanCode);

  if (index === -1) {
    throw new Error(`El cupón "${cleanCode}" no existe.`);
  }

  const deleted = coupons.splice(index, 1)[0];
  writeCoupons(coupons);
  return deleted;
}

/**
 * Validar si un cupón es aplicable a un monto
 */
function validateCoupon(code, totalAmount = 0) {
  if (!code) {
    return { valid: false, error: 'Por favor ingresa un código de descuento.' };
  }

  const cleanCode = String(code).trim().toUpperCase();
  const coupon = getCoupon(cleanCode);

  if (!coupon) {
    return { valid: false, error: `El código "${cleanCode}" no existe o no es válido.` };
  }

  if (!coupon.active) {
    return { valid: false, error: `El cupón "${cleanCode}" se encuentra actualmente inactivo.` };
  }

  // Validar fecha de expiración
  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate).getTime();
    if (Date.now() > expiry) {
      return { valid: false, error: `El cupón "${cleanCode}" venció el ${new Date(coupon.expiryDate).toLocaleDateString('es-CO')}.` };
    }
  }

  // Validar usos máximos
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: `El cupón "${cleanCode}" ha alcanzado el límite máximo de redenciones permitidas.` };
  }

  const baseAmount = Math.max(0, parseInt(totalAmount, 10) || 0);
  const discountPercent = coupon.discountPercent;
  const discountAmount = Math.round(baseAmount * (discountPercent / 100));
  const finalAmount = Math.max(0, baseAmount - discountAmount);
  const isCourtesy = discountPercent === 100 || finalAmount === 0;

  return {
    valid: true,
    code: coupon.code,
    description: coupon.description,
    discountPercent,
    baseAmount,
    discountAmount,
    finalAmount,
    isCourtesy,
    message: isCourtesy
      ? '¡Cupón de Cortesía 100% aplicado! Registro 100% gratuito sin pasarela de pago.'
      : `¡Cupón aplicado con éxito! Descuento del ${discountPercent}% (${formatCOP(discountAmount)}).`
  };
}

/**
 * Consumir / Redimir un cupón al confirmar la inscripción
 */
function redeemCoupon(code, invoiceNumber) {
  if (!code) return false;
  const coupons = readCoupons();
  const cleanCode = String(code).trim().toUpperCase();
  const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);

  if (!coupon) return false;

  coupon.usedCount = (coupon.usedCount || 0) + 1;
  writeCoupons(coupons);
  console.log(`[CouponService] Cupón ${cleanCode} redimido para ${invoiceNumber}. Usos totales: ${coupon.usedCount}`);
  return true;
}

function formatCOP(val) {
  return '$ ' + Number(val || 0).toLocaleString('es-CO') + ' COP';
}

module.exports = {
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  redeemCoupon
};
