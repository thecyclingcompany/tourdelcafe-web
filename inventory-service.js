/**
 * INVENTORY SERVICE & KARDEX MOTOR
 * Tienda Oficial Mítico Coffee - Tour del Café
 * Gestiona el inventario persistente por SKU/Variante y el registro cronológico de movimientos (Kardex).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STOCK_FILE = path.join(DATA_DIR, 'inventory-stock.json');
const KARDEX_FILE = path.join(DATA_DIR, 'inventory-kardex.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders-pending.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'store-products.json');

// Umbral por defecto de stock mínimo para alertas
const DEFAULT_MIN_STOCK = 3;

// Cache en memoria para rendimiento ultra-rápido
let stockCache = null;
let kardexCache = null;
let ordersCache = null;

/**
 * Asegura que exista el directorio data/
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Lectura segura de archivo JSON con fallback
 */
function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[InventoryService] Error leyendo ${filePath}:`, err.message);
    return fallback;
  }
}

/**
 * Escritura atómica para evitar corrupción de datos en concurrencia
 */
function writeJsonAtomic(filePath, data) {
  ensureDataDir();
  const tempFile = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`[InventoryService] Error escribiendo ${filePath}:`, err.message);
    // Fallback directo si rename falla en Windows por locks
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
  }
}

/**
 * Inicializa el inventario a partir de store-products.json si no existe previamente
 */
function initInventory() {
  ensureDataDir();

  // 1. Cargar o inicializar Stock
  let stockData = readJsonSafe(STOCK_FILE, null);
  let kardexData = readJsonSafe(KARDEX_FILE, null);

  if (!stockData || Object.keys(stockData).length === 0) {
    console.log('[InventoryService] Inicializando stock base desde store-products.json...');
    const products = readJsonSafe(PRODUCTS_FILE, []);
    stockData = {};
    kardexData = kardexData || [];

    const now = new Date().toISOString();

    products.forEach(product => {
      (product.variants || []).forEach((variant, vIdx) => {
        const sku = (variant.sku && variant.sku.trim() !== '') 
          ? variant.sku.trim().toUpperCase() 
          : `${product.handle.toUpperCase()}-V${vIdx + 1}`;
        
        const initialQty = typeof variant.inventoryQty === 'number' ? variant.inventoryQty : 10;
        
        stockData[sku] = {
          sku: sku,
          productId: product.id || product.handle,
          productHandle: product.handle,
          productTitle: product.title,
          category: product.category,
          categoryName: product.categoryName,
          variantId: variant.id,
          variantTitle: variant.title && variant.title !== 'Default Title' ? variant.title : 'Presentación Estándar',
          option1: variant.option1 || '',
          option2: variant.option2 || '',
          current_stock: Math.max(0, initialQty),
          min_stock: DEFAULT_MIN_STOCK,
          price: variant.price || product.priceMin || 0,
          image: product.featuredImage || (product.images && product.images[0]) || '',
          updatedAt: now
        };

        // Asentar movimiento inicial en Kardex
        kardexData.push({
          id: `KDX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          fecha: now,
          sku: sku,
          productTitle: product.title,
          variantTitle: stockData[sku].variantTitle,
          tipo: 'ENTRADA',
          cantidad: initialQty,
          stockAnterior: 0,
          stockNuevo: initialQty,
          motivo: 'Inventario Inicial',
          referencia: 'INICIAL-SISTEMA',
          usuario: 'Sistema'
        });
      });
    });

    writeJsonAtomic(STOCK_FILE, stockData);
    writeJsonAtomic(KARDEX_FILE, kardexData);
    console.log(`[InventoryService] Inventario inicializado con ${Object.keys(stockData).length} variantes.`);
  }

  stockCache = stockData;
  kardexCache = kardexData || readJsonSafe(KARDEX_FILE, []);
  ordersCache = readJsonSafe(ORDERS_FILE, {});

  return { stockCount: Object.keys(stockCache).length, kardexCount: kardexCache.length };
}

/**
 * Obtener todo el stock con indicadores de alerta para administradores
 */
function getAllStock() {
  if (!stockCache) initInventory();
  
  const items = Object.values(stockCache);
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const enriched = items.map(item => {
    totalUnits += item.current_stock;
    const isOut = item.current_stock <= 0;
    const isLow = !isOut && item.current_stock <= (item.min_stock || DEFAULT_MIN_STOCK);

    if (isOut) outOfStockCount++;
    if (isLow) lowStockCount++;

    return {
      ...item,
      status: isOut ? 'agotado' : (isLow ? 'bajo' : 'ok'),
      isLowStock: isLow,
      isOutOfStock: isOut
    };
  });

  return {
    items: enriched,
    stats: {
      totalSkus: items.length,
      totalUnits,
      lowStockCount,
      outOfStockCount
    }
  };
}

/**
 * Mapeo público simplificado para el frontend (tienda.js)
 * Retorna { [variantId]: current_stock, bySku: { [sku]: current_stock } }
 */
function getPublicStock() {
  if (!stockCache) initInventory();

  const byVariantId = {};
  const bySku = {};
  const preOrders = {};

  Object.values(stockCache).forEach(item => {
    byVariantId[item.variantId] = item.current_stock;
    bySku[item.sku] = item.current_stock;
    if (item.allowPreOrder) {
      preOrders[item.variantId] = true;
      preOrders[item.sku] = true;
    }
  });

  return { byVariantId, bySku, preOrders };
}

/**
 * Valida si los items de un carrito tienen stock suficiente
 * @param {Array} cartItems - Lista de items con variantId/sku y quantity
 */
function validateCartStock(cartItems) {
  if (!stockCache) initInventory();
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors = [];

  for (const item of cartItems) {
    // Buscar por SKU o variantId
    const stockItem = Object.values(stockCache).find(
      s => s.variantId === item.variantId || s.sku === item.sku
    );

    const reqQty = Math.max(1, parseInt(item.quantity) || 1);

    if (!stockItem) {
      errors.push({
        variantId: item.variantId,
        title: item.title || 'Producto',
        requested: reqQty,
        available: 0,
        message: `El producto "${item.title || item.variantId}" no se encuentra en el catálogo de inventario.`
      });
      continue;
    }

    // Si tiene preventa habilitada, se omite el bloqueo de stock agotado
    if (stockItem.allowPreOrder) {
      continue;
    }

    if (stockItem.current_stock <= 0) {
      errors.push({
        variantId: stockItem.variantId,
        sku: stockItem.sku,
        title: stockItem.productTitle,
        variantTitle: stockItem.variantTitle,
        requested: reqQty,
        available: 0,
        message: `"${stockItem.productTitle} (${stockItem.variantTitle})" se encuentra Agotado.`
      });
    } else if (reqQty > stockItem.current_stock) {
      errors.push({
        variantId: stockItem.variantId,
        sku: stockItem.sku,
        title: stockItem.productTitle,
        variantTitle: stockItem.variantTitle,
        requested: reqQty,
        available: stockItem.current_stock,
        message: `Solo hay ${stockItem.current_stock} unidades disponibles de "${stockItem.productTitle} (${stockItem.variantTitle})".`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Registra un movimiento en Kardex y actualiza el saldo de stock
 */
function recordMovement({ sku, variantId, tipo, cantidad, motivo, referencia, usuario, notas }) {
  if (!stockCache) initInventory();

  const qty = parseInt(cantidad);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('La cantidad debe ser un número entero mayor a 0');
  }

  const upperTipo = (tipo || '').toUpperCase().trim();
  if (!['ENTRADA', 'SALIDA'].includes(upperTipo)) {
    throw new Error('El tipo de movimiento debe ser ENTRADA o SALIDA');
  }

  // Encontrar el item en stock
  const targetKey = Object.keys(stockCache).find(k => {
    const item = stockCache[k];
    return item.sku === sku || (variantId && item.variantId === variantId);
  });

  if (!targetKey) {
    throw new Error(`No se encontró ningún producto con SKU "${sku}" o Variante "${variantId}"`);
  }

  const item = stockCache[targetKey];
  const stockAnterior = item.current_stock;
  let stockNuevo;

  if (upperTipo === 'ENTRADA') {
    stockNuevo = stockAnterior + qty;
  } else {
    // SALIDA: Permitir preventa aunque stockAnterior sea 0
    if (stockAnterior < qty && !motivo?.includes('Ajuste Forzado') && !item.allowPreOrder) {
      throw new Error(`Stock insuficiente para "${item.productTitle}". Stock actual: ${stockAnterior}, requerido: ${qty}`);
    }
    stockNuevo = item.allowPreOrder ? 0 : Math.max(0, stockAnterior - qty);
  }

  const now = new Date().toISOString();
  item.current_stock = stockNuevo;
  item.updatedAt = now;

  const movementId = `KDX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const kardexEntry = {
    id: movementId,
    fecha: now,
    sku: item.sku,
    productTitle: item.productTitle,
    variantTitle: item.variantTitle,
    tipo: upperTipo,
    cantidad: qty,
    stockAnterior,
    stockNuevo,
    motivo: motivo || (upperTipo === 'ENTRADA' ? 'Reposición / Lote' : 'Venta / Salida'),
    referencia: referencia || 'MANUAL',
    usuario: usuario || 'Admin',
    notas: notas || ''
  };

  // Guardar en Kardex (al principio para orden cronológico descendente)
  kardexCache.unshift(kardexEntry);

  // Persistir cambios
  writeJsonAtomic(STOCK_FILE, stockCache);
  writeJsonAtomic(KARDEX_FILE, kardexCache);

  console.log(`[InventoryService] Movimiento registrado: ${movementId} | ${upperTipo} ${qty} un. | SKU: ${item.sku} | Nuevo stock: ${stockNuevo}`);

  return {
    success: true,
    movement: kardexEntry,
    updatedItem: item
  };
}

/**
 * Guarda una orden pendiente iniciada desde el checkout para asociar invoice con sus items
 */
function savePendingOrder(invoiceNumber, orderData) {
  ensureDataDir();
  if (!ordersCache) ordersCache = readJsonSafe(ORDERS_FILE, {});

  ordersCache[invoiceNumber] = {
    ...orderData,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  writeJsonAtomic(ORDERS_FILE, ordersCache);
  return true;
}

/**
 * Obtiene los datos de una orden pendiente por su invoice
 */
function getPendingOrder(invoiceNumber) {
  if (!ordersCache) ordersCache = readJsonSafe(ORDERS_FILE, {});
  return ordersCache[invoiceNumber] || null;
}

/**
 * Procesa automáticamente la salida de inventario por ePayco
 * Idempotente: Si la referencia ya fue procesada, no descuenta nuevamente.
 */
function processEpaycoSale({ orderRef, invoiceNumber, items, customerInfo }) {
  if (!stockCache) initInventory();
  if (!orderRef) throw new Error('Referencia ePayco (x_ref_payco) requerida');

  // 1. Verificación de Idempotencia: ¿Ya se procesó esta referencia?
  const alreadyProcessed = kardexCache.some(k => k.referencia === orderRef && k.tipo === 'SALIDA');
  if (alreadyProcessed) {
    console.log(`[InventoryService] Orden ePayco ${orderRef} ya fue procesada previamente. Omitiendo duplicado.`);
    return { success: true, duplicate: true, orderRef };
  }

  // 2. Si no vienen items directos, intentar recuperarlos de ordersCache mediante invoiceNumber
  let itemsToDeduct = items;
  if ((!itemsToDeduct || itemsToDeduct.length === 0) && invoiceNumber) {
    const pending = getPendingOrder(invoiceNumber);
    if (pending && Array.isArray(pending.items)) {
      itemsToDeduct = pending.items;
      console.log(`[InventoryService] Items recuperados de orden pendiente ${invoiceNumber}: ${itemsToDeduct.length} productos.`);
    }
  }

  if (!itemsToDeduct || itemsToDeduct.length === 0) {
    console.warn(`[InventoryService] No se encontraron items para descontar en orden ePayco ${orderRef}.`);
    return { success: false, message: 'No se encontraron items para procesar' };
  }

  const processedMovements = [];

  // 3. Descontar cada item
  for (const item of itemsToDeduct) {
    try {
      const result = recordMovement({
        sku: item.sku,
        variantId: item.variantId,
        tipo: 'SALIDA',
        cantidad: item.quantity || 1,
        motivo: 'Venta ePayco',
        referencia: orderRef,
        usuario: 'Pasarela ePayco',
        notas: `Invoice: ${invoiceNumber || 'N/A'}${customerInfo ? ' | ' + customerInfo : ''}`
      });
      processedMovements.push(result.movement);
    } catch (err) {
      console.error(`[InventoryService] Error descontando SKU ${item.sku || item.variantId} para ePayco ${orderRef}:`, err.message);
    }
  }

  // 4. Actualizar estado de orden pendiente si existe
  if (invoiceNumber && ordersCache && ordersCache[invoiceNumber]) {
    ordersCache[invoiceNumber].status = 'completed';
    ordersCache[invoiceNumber].epaycoRef = orderRef;
    ordersCache[invoiceNumber].processedAt = new Date().toISOString();
    writeJsonAtomic(ORDERS_FILE, ordersCache);
  }

  return {
    success: true,
    orderRef,
    movements: processedMovements
  };
}

/**
 * Obtener historial Kardex con paginación y filtros
 */
function getKardex({ limit = 100, sku = null, tipo = null } = {}) {
  if (!kardexCache) initInventory();

  let list = kardexCache;
  if (sku) {
    list = list.filter(k => k.sku.toLowerCase() === sku.toLowerCase());
  }
  if (tipo) {
    list = list.filter(k => k.tipo.toUpperCase() === tipo.toUpperCase());
  }

  return list.slice(0, parseInt(limit) || 100);
}

// Inicializar al cargar el módulo
initInventory();

module.exports = {
  initInventory,
  getAllStock,
  getPublicStock,
  validateCartStock,
  recordMovement,
  savePendingOrder,
  getPendingOrder,
  processEpaycoSale,
  getKardex
};
