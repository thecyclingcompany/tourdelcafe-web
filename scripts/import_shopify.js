const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuración de rutas
const ROOT_DIR = path.resolve(__dirname, '..');
const PRODUCTS_CSV = fs.existsSync(path.join(ROOT_DIR, 'products_export.csv')) 
  ? path.join(ROOT_DIR, 'products_export.csv') 
  : path.join(ROOT_DIR, 'products_export_1.csv');
const CUSTOMERS_CSV = path.join(ROOT_DIR, 'customers_export.csv');
const ASSETS_PRODUCTOS_DIR = path.join(ROOT_DIR, 'assets', 'tienda', 'productos');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Asegurar directorios
[ASSETS_PRODUCTOS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Parser RFC-4180 robusto para CSVs que contienen saltos de línea y comillas en celdas
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentRow[currentRow.length - 1] += '"';
        i++; // Saltar escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      rows.push(currentRow);
      currentRow = [''];
    } else {
      currentRow[currentRow.length - 1] += char;
    }
  }
  if (currentRow.length > 1 || currentRow[0] !== '') {
    rows.push(currentRow);
  }
  return rows;
}

/**
 * Descarga una imagen desde una URL con soporte para redirecciones y reintentos
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(destPath);
    }

    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      return resolve(null);
    }

    const fetchWithRedirects = (currentUrl, redirectsLeft = 5) => {
      if (redirectsLeft <= 0) return reject(new Error(`Demasiadas redirecciones: ${url}`));

      const client = currentUrl.startsWith('https') ? https : http;
      client.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchWithRedirects(res.headers.location, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Error ${res.statusCode} al descargar ${currentUrl}`));
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });
        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    fetchWithRedirects(cleanUrl);
  });
}

/**
 * Limpia y extrae texto plano a partir de HTML
 */
function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Parsea el texto libre de 'Información y Perfil del Café' a un objeto estructurado
 */
function parseSpecs(metaText) {
  const specs = {};
  if (!metaText) return specs;

  const lines = metaText.split(/\n|~/);
  lines.forEach(line => {
    const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx > 0) {
      const key = cleaned.substring(0, colonIdx).trim().toLowerCase();
      const val = cleaned.substring(colonIdx + 1).trim();
      if (!val) return;

      if (key.includes('familia') || key.includes('productor')) specs.familia = val;
      else if (key.includes('finca')) specs.finca = val;
      else if (key.includes('región') || key.includes('region')) specs.origen = val;
      else if (key.includes('altitud') || key.includes('altura')) specs.altitud = val;
      else if (key.includes('variedad')) specs.variedad = val;
      else if (key.includes('proceso')) specs.proceso = val;
      else if (key.includes('fragancia')) specs.fragancia = val;
      else if (key.includes('aroma')) specs.aroma = val;
      else if (key.includes('acidez')) specs.acidez = val;
      else if (key.includes('final') || key.includes('residual') || key.includes('residuo')) specs.final = val;
      else if (key.includes('tostado') || key.includes('tostión')) specs.tostado = val;
      else if (key.includes('material')) specs.material = val;
      else if (key.includes('capacidad')) specs.capacidad = val;
      else if (key.includes('dimensiones')) specs.dimensiones = val;
      else if (key.includes('perfil')) specs.perfil = val;
    }
  });

  // Generar array de notas de cata extraídas
  const sensoryKeywords = [];
  ['fragancia', 'aroma', 'acidez', 'final', 'perfil'].forEach(k => {
    if (specs[k]) {
      const parts = specs[k].split(/[,y\.\-]/).map(s => s.trim()).filter(s => s.length > 2);
      sensoryKeywords.push(...parts);
    }
  });
  if (sensoryKeywords.length > 0) {
    // Normalizar y deduplicar notas sensoriales
    specs.notas = [...new Set(sensoryKeywords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))].slice(0, 5).join(', ');
  }

  return specs;
}

/**
 * Asigna la categoría correspondiente a cada producto
 */
function categorizeProduct(handle, title, specs) {
  const h = handle.toLowerCase();
  const t = (title || '').toLowerCase();

  // 1. Suscripciones y Paquetones
  if (h.includes('subscription') || t.includes('paquetón') || t.includes('paqueton') || h.includes('paqueton')) {
    return {
      category: 'bundles',
      categoryName: 'Suscripciones y Paquetones'
    };
  }

  // 2. Mítico Coffee Drips
  if (h.includes('drip') || t.includes('drip')) {
    return {
      category: 'drips',
      categoryName: 'Mítico Coffee Drips'
    };
  }

  // 3. Tazas, Mugs y Accesorios
  if (h.includes('mug') || h.includes('taza') || h.includes('termo') || h.includes('case') || t.includes('mug') || t.includes('taza') || t.includes('termo')) {
    return {
      category: 'accessories',
      categoryName: 'Tazas, Mugs y Accesorios'
    };
  }

  // 4. Mezclas de Cafés Especiales (Blends)
  if (h.includes('condor') || h.includes('king-of-the-mountains') || h.includes('decaf') || t.includes('condor') || t.includes('king of the mountains') || t.includes('decaf')) {
    return {
      category: 'blends',
      categoryName: 'Mezclas de Cafés Especiales (Blends)'
    };
  }

  // 5. Cafés de Origen Único (Single Origin)
  return {
    category: 'single-origin',
    categoryName: 'Cafés de Origen Único (Single Origin)'
  };
}

/**
 * Procesa el catálogo de productos
 */
async function processProducts() {
  console.log(`\n========================================`);
  console.log(`PROCESANDO CATÁLOGO DE PRODUCTOS DESDE:`);
  console.log(PRODUCTS_CSV);
  console.log(`========================================`);

  if (!fs.existsSync(PRODUCTS_CSV)) {
    console.error(`Error: No se encontró el archivo de productos en ${PRODUCTS_CSV}`);
    return [];
  }

  const raw = fs.readFileSync(PRODUCTS_CSV, 'utf8');
  const rows = parseCSV(raw);
  const headers = rows[0];

  const getIdx = (name) => headers.indexOf(name);
  const handleIdx = getIdx('Handle');
  const titleIdx = getIdx('Title');
  const bodyIdx = getIdx('Body (HTML)');
  const opt1NameIdx = getIdx('Option1 Name');
  const opt1ValIdx = getIdx('Option1 Value');
  const opt2NameIdx = getIdx('Option2 Name');
  const opt2ValIdx = getIdx('Option2 Value');
  const skuIdx = getIdx('Variant SKU');
  const priceIdx = getIdx('Variant Price');
  const comparePriceIdx = getIdx('Variant Compare At Price');
  const invQtyIdx = getIdx('Variant Inventory Qty');
  const gramsIdx = getIdx('Variant Grams');
  const imgUrlIdx = getIdx('Image Src');
  const imgPosIdx = getIdx('Image Position');
  const infoPerfilIdx = getIdx('Información y Perfil del Café (product.metafields.custom.informacion_y_perfil_del_cafe)');
  const tagsIdx = getIdx('Tags');
  const statusIdx = getIdx('Status');

  const productsMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const handle = (r[handleIdx] || '').trim();
    if (!handle) continue;

    // Ignorar ítems internos de flete o servicios
    if (handle === 'envio-pos-colombia') continue;

    if (!productsMap.has(handle)) {
      const rawHtml = r[bodyIdx] || '';
      const textDesc = cleanHtml(rawHtml);
      const specs = parseSpecs(r[infoPerfilIdx]);
      const title = (r[titleIdx] || handle).trim();
      const catData = categorizeProduct(handle, title, specs);

      // Crear shortDescription a partir de las primeras 2 oraciones o 150 caracteres
      let shortDesc = textDesc.split('\n')[0] || '';
      if (shortDesc.length > 180) {
        shortDesc = shortDesc.substring(0, 177) + '...';
      }

      productsMap.set(handle, {
        id: handle,
        handle,
        title,
        category: catData.category,
        categoryName: catData.categoryName,
        descriptionHtml: rawHtml,
        description: textDesc,
        shortDescription: shortDesc,
        specs,
        tags: (r[tagsIdx] || '').split(',').map(t => t.trim()).filter(Boolean),
        status: r[statusIdx] || 'active',
        option1Name: r[opt1NameIdx] || 'Opción',
        option2Name: r[opt2NameIdx] || '',
        variants: [],
        remoteImages: [],
        images: []
      });
    }

    const prod = productsMap.get(handle);

    // Capturar imágenes remotas
    const imgUrl = (r[imgUrlIdx] || '').trim();
    if (imgUrl && !prod.remoteImages.includes(imgUrl)) {
      prod.remoteImages.push(imgUrl);
    }

    // Capturar variante si tiene precio
    const priceStr = r[priceIdx];
    if (priceStr) {
      const price = parseFloat(priceStr) || 0;
      const comparePrice = parseFloat(r[comparePriceIdx]) || 0;
      const invQty = parseInt(r[invQtyIdx], 10) || 10;
      const opt1 = (r[opt1ValIdx] || '').trim();
      const opt2 = (r[opt2ValIdx] || '').trim();

      // Identificar si la variante ya existe
      const variantTitle = [opt1, opt2].filter(Boolean).join(' / ') || 'Default Title';
      const exists = prod.variants.some(v => v.title === variantTitle);
      if (!exists) {
        prod.variants.push({
          id: `${handle}-${prod.variants.length + 1}`,
          sku: r[skuIdx] || `${handle.toUpperCase()}-${prod.variants.length + 1}`,
          title: variantTitle,
          option1: opt1 || 'Presentación Estándar',
          option2: opt2 || '',
          price: price,
          compareAtPrice: comparePrice > price ? comparePrice : null,
          inventoryQty: invQty,
          available: invQty > 0,
          grams: parseFloat(r[gramsIdx]) || 250
        });
      }
    }
  }

  console.log(`\nDescargando imágenes y normalizando ${productsMap.size} productos...`);

  const finalProducts = [];
  const featuredHandles = [
    'mitico-ciclamino-volata-castillo',
    'mitico-gregario',
    'mitico-jardinerito',
    'king-of-the-mountains',
    'drips-mitico',
    'taza-de-vidrio-doble-pared'
  ];

  for (const prod of productsMap.values()) {
    console.log(`-> Procesando [${prod.category}]: ${prod.title}`);

    // Descargar imágenes localmente
    for (let idx = 0; idx < prod.remoteImages.length; idx++) {
      const remoteUrl = prod.remoteImages[idx];
      const urlWithoutQuery = remoteUrl.split('?')[0];
      const ext = path.extname(urlWithoutQuery) || '.jpg';
      const localFilename = `${prod.handle}-${idx + 1}${ext.toLowerCase()}`;
      const localFilePath = path.join(ASSETS_PRODUCTOS_DIR, localFilename);
      const relativeAssetPath = `assets/tienda/productos/${localFilename}`;

      try {
        await downloadImage(remoteUrl, localFilePath);
        prod.images.push(relativeAssetPath);
      } catch (err) {
        console.warn(`   [Aviso] No se pudo descargar imagen ${idx + 1} de ${prod.handle}: ${err.message}`);
        // Fallback a URL remota si fallara la descarga
        prod.images.push(remoteUrl);
      }
    }

    if (prod.images.length === 0) {
      prod.images.push('assets/tienda/productos/placeholder-coffee.jpg');
    }
    prod.featuredImage = prod.images[0];

    // Calcular rangos de precios
    const prices = prod.variants.map(v => v.price);
    prod.priceMin = prices.length ? Math.min(...prices) : 0;
    prod.priceMax = prices.length ? Math.max(...prices) : 0;

    const comparePrices = prod.variants.map(v => v.compareAtPrice).filter(Boolean);
    prod.compareAtPriceMin = comparePrices.length ? Math.min(...comparePrices) : null;

    // Destacados para Home y badges
    prod.isFeatured = featuredHandles.includes(prod.handle);
    if (prod.compareAtPriceMin && prod.compareAtPriceMin > prod.priceMin) {
      prod.badge = 'OFERTA';
    } else if (prod.category === 'single-origin') {
      prod.badge = 'ORIGEN ÚNICO';
    } else if (prod.category === 'drips') {
      prod.badge = 'DRIP COFFEE';
    } else {
      prod.badge = '';
    }

    delete prod.remoteImages;
    finalProducts.push(prod);
  }

  // Guardar archivo JavaScript listo para el navegador
  const jsOutput = `/**
 * CATÁLOGO DE PRODUCTOS MÍTICO COFFEE
 * Tour del Café - Tienda Oficial
 * Autogenerado a partir de products_export.csv
 */
window.MITICO_PRODUCTS = ${JSON.stringify(finalProducts, null, 2)};
`;

  fs.writeFileSync(path.join(DATA_DIR, 'store-products.js'), jsOutput, 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'store-products.json'), JSON.stringify(finalProducts, null, 2), 'utf8');

  console.log(`\n✓ Catálogo generado con éxito:`);
  console.log(`  - ${path.join(DATA_DIR, 'store-products.js')}`);
  console.log(`  - ${path.join(DATA_DIR, 'store-products.json')}`);
  console.log(`  - Total productos listos: ${finalProducts.length}`);

  return finalProducts;
}

/**
 * Procesa la base de clientes para checkout y CRM
 */
async function processCustomers() {
  console.log(`\n========================================`);
  console.log(`PROCESANDO CLIENTES DESDE:`);
  console.log(CUSTOMERS_CSV);
  console.log(`========================================`);

  if (!fs.existsSync(CUSTOMERS_CSV)) {
    console.warn(`No se encontró ${CUSTOMERS_CSV}. Se omitirá el módulo de clientes.`);
    return [];
  }

  const raw = fs.readFileSync(CUSTOMERS_CSV, 'utf8');
  const rows = parseCSV(raw);
  const headers = rows[0];

  const getIdx = (name) => headers.indexOf(name);
  const idIdx = getIdx('Customer ID');
  const firstNameIdx = getIdx('First Name');
  const lastNameIdx = getIdx('Last Name');
  const emailIdx = getIdx('Email');
  const phoneIdx = getIdx('Phone');
  const defaultPhoneIdx = getIdx('Default Address Phone');
  const cityIdx = getIdx('Default Address City');
  const provinceIdx = getIdx('Default Address Province Code');
  const countryIdx = getIdx('Default Address Country Code');
  const addr1Idx = getIdx('Default Address Address1');
  const addr2Idx = getIdx('Default Address Address2');
  const spentIdx = getIdx('Total Spent');
  const ordersIdx = getIdx('Total Orders');
  const tagsIdx = getIdx('Tags');
  const companyIdx = getIdx('Default Address Company');
  const empresaMetaIdx = getIdx('Empresa (customer.metafields.custom.empresa)');

  const customers = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const email = (r[emailIdx] || '').trim();
    if (!email) continue;

    const firstName = (r[firstNameIdx] || '').trim();
    const lastName = (r[lastNameIdx] || '').trim();
    const phone = (r[phoneIdx] || r[defaultPhoneIdx] || '').replace(/^'/, '').trim();
    const spent = parseFloat(r[spentIdx]) || 0;
    const orders = parseInt(r[ordersIdx], 10) || 0;

    customers.push({
      id: (r[idIdx] || `cust-${i}`).replace(/^'/, ''),
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' ') || 'Cliente Mítico',
      email,
      phone,
      city: r[cityIdx] || '',
      provinceCode: r[provinceIdx] || '',
      countryCode: r[countryIdx] || 'CO',
      address: [r[addr1Idx], r[addr2Idx]].filter(Boolean).join(', '),
      totalSpent: spent,
      totalOrders: orders,
      tags: (r[tagsIdx] || '').split(',').map(t => t.trim()).filter(Boolean),
      company: r[empresaMetaIdx] || r[companyIdx] || ''
    });
  }

  const jsOutput = `/**
 * BASE DE CLIENTES MÍTICO COFFEE
 * Tour del Café - Módulo de Usuarios y Checkout
 * Autogenerado a partir de customers_export.csv
 */
window.MITICO_CUSTOMERS = ${JSON.stringify(customers, null, 2)};
`;

  fs.writeFileSync(path.join(DATA_DIR, 'store-customers.js'), jsOutput, 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'store-customers.json'), JSON.stringify(customers, null, 2), 'utf8');

  console.log(`\n✓ Base de datos de clientes generada:`);
  console.log(`  - ${path.join(DATA_DIR, 'store-customers.js')}`);
  console.log(`  - Total clientes importados: ${customers.length}`);

  return customers;
}

// Ejecución principal
async function run() {
  try {
    const start = Date.now();
    await processProducts();
    await processCustomers();
    console.log(`\n✨ Importación completada en ${((Date.now() - start) / 1000).toFixed(1)} segundos.`);
  } catch (err) {
    console.error(`\n❌ Error en el proceso de importación:`, err);
    process.exit(1);
  }
}

run();
