/**
 * TIENDA OFICIAL MÍTICO COFFEE - MOTOR INTERACTIVO
 * Tour del Café - World's Coffee & Cycling Festival
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURACIÓN Y ESTADO GLOBAL DEL CARRITO
  // ==========================================
  const CART_STORAGE_KEY = 'mitico_store_cart';
  const CUSTOMER_STORAGE_KEY = 'mitico_checkout_customer';
  const WHATSAPP_PHONE = '573103297299'; // Teléfono oficial de pedidos Mítico

  const getEpaycoConfig = () => window.EPAYCO_CONFIG || {
    publicKey: '491d6a0b6e992cf924edd8d3d088e8b8',
    test: true,
    currency: 'COP',
    country: 'CO',
    freeShippingThreshold: 120000,
    standardShippingCost: 12000,
    responseUrl: window.location.origin + '/checkout/resultado.html',
    confirmationUrl: window.location.origin + '/api/epayco/confirmacion',
    supportWhatsApp: '573103297299'
  };

  const getFreeShippingThreshold = () => {
    return getEpaycoConfig().freeShippingThreshold || 120000;
  };

  const getShippingCost = (subtotal) => {
    const config = getEpaycoConfig();
    return subtotal >= (config.freeShippingThreshold || 120000) ? 0 : (config.standardShippingCost || 12000);
  };

  let currentCategory = 'all';
  let currentSearchQuery = '';
  let currentSort = 'featured';

  // Helper para formatear moneda colombiana (COP)
  const formatCOP = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '$ 0';
    return '$ ' + Math.round(val).toLocaleString('es-CO') + ' COP';
  };

  // Carrito en LocalStorage
  const getCart = () => {
    try {
      return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  const saveCart = (cart) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
  };

  // ==========================================
  // ESTADO DE INVENTARIO EN VIVO & PRE-VENTAS
  // ==========================================
  let liveStock = { byVariantId: {}, bySku: {}, preOrders: {} };

  const fetchLiveStock = async () => {
    try {
      const res = await fetch('/api/inventory/public');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('json')) {
        const data = await res.json();
        if (data.success) {
          liveStock = {
            byVariantId: data.byVariantId || {},
            bySku: data.bySku || {},
            preOrders: data.preOrders || {}
          };
          window.MITICO_LIVE_STOCK = liveStock;
          return liveStock;
        }
      }
    } catch (e) {
      console.warn('[MiticoStore] API no disponible, buscando stock estático:', e.message);
    }

    // Fallback robusto para hosting estático (Hostinger)
    try {
      const staticRes = await fetch('data/inventory-stock.json?v=' + Date.now());
      if (staticRes.ok) {
        const stockData = await staticRes.json();
        const byVariantId = {};
        const bySku = {};
        const preOrders = {};
        Object.values(stockData).forEach(item => {
          if (item.variantId) byVariantId[item.variantId] = item.current_stock;
          if (item.sku) bySku[item.sku] = item.current_stock;
          if (item.allowPreOrder) {
            if (item.variantId) preOrders[item.variantId] = true;
            if (item.sku) preOrders[item.sku] = true;
          }
        });
        liveStock = { byVariantId, bySku, preOrders };
        window.MITICO_LIVE_STOCK = liveStock;
        return liveStock;
      }
    } catch (staticErr) {
      console.warn('[MiticoStore] Fallback estático no disponible:', staticErr.message);
    }

    return liveStock;
  };

  const isVariantPreOrder = (variantId, sku, product, variant) => {
    if (liveStock.preOrders && (liveStock.preOrders[variantId] || (sku && liveStock.preOrders[sku]))) {
      return true;
    }
    if (variant && variant.allowPreOrder) return true;
    if (product && (product.allowPreOrder || product.collection === 'resiliencia')) return true;
    return false;
  };

  const getVariantStock = (variantId, sku) => {
    if (liveStock.byVariantId && liveStock.byVariantId[variantId] !== undefined) {
      return liveStock.byVariantId[variantId];
    }
    if (sku && liveStock.bySku && liveStock.bySku[sku] !== undefined) {
      return liveStock.bySku[sku];
    }
    const products = window.MITICO_PRODUCTS || [];
    for (const p of products) {
      const v = (p.variants || []).find(v => v.id === variantId || v.sku === sku);
      if (v) return typeof v.inventoryQty === 'number' ? v.inventoryQty : 10;
    }
    return 10;
  };

  const addToCart = (productId, variantId, quantity = 1) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const variant = product.variants.find(v => v.id === variantId) || product.variants[0];
    const availableStock = getVariantStock(variant.id, variant.sku);
    const isPreOrder = isVariantPreOrder(variant.id, variant.sku, product, variant);

    if (!isPreOrder && availableStock <= 0) {
      showToast(`⚠️ "${product.title} (${variant.title})" está agotado.`);
      return;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.variantId === variant.id);
    const currentInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (!isPreOrder && currentInCart + quantity > availableStock) {
      showToast(`⚠️ Solo hay ${availableStock} unidades disponibles de este producto.`);
      return;
    }

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku || variant.id,
        title: product.title,
        variantTitle: variant.title !== 'Default Title' ? variant.title : '',
        price: variant.price,
        image: variant.image || product.featuredImage || (product.images && product.images[0]) || '',
        quantity: quantity,
        allowPreOrder: isPreOrder,
        isPreOrder: isPreOrder,
        preOrderBadge: isPreOrder ? 'Pre-Venta (Entrega en Expo Tour del Café)' : null
      });
    }

    saveCart(cart);
    showToast(isPreOrder ? `¡${product.title} apartado en Pre-Venta!` : `¡${product.title} añadido al carrito!`);
    openCartDrawer();
  };

  const removeFromCart = (variantId) => {
    let cart = getCart();
    cart = cart.filter(item => item.variantId !== variantId);
    saveCart(cart);
  };

  const updateCartQty = (variantId, delta) => {
    const cart = getCart();
    const item = cart.find(i => i.variantId === variantId);
    if (!item) return;

    if (delta > 0 && !item.allowPreOrder && !item.isPreOrder) {
      const availableStock = getVariantStock(item.variantId, item.sku);
      if (item.quantity + delta > availableStock) {
        showToast(`⚠️ Solo hay ${availableStock} unidades disponibles de este producto.`);
        return;
      }
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    saveCart(cart);
  };

  // Toast Notification
  const showToast = (message) => {
    let toast = document.getElementById('store-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'store-toast';
      toast.className = 'store-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  };

  // ==========================================
  // ACTUALIZACIÓN DE INTERFAZ DEL CARRITO
  // ==========================================
  const updateCartUI = () => {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Actualizar todos los badges de contador
    document.querySelectorAll('.store-cart-count, #cart-count-badge').forEach(badge => {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    // Elementos del Drawer
    const itemsContainer = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const totalEl = document.getElementById('cart-total-val');
    const shippingBar = document.getElementById('shipping-progress-fill');
    const shippingText = document.getElementById('shipping-progress-text');

    if (subtotalEl) subtotalEl.textContent = formatCOP(subtotal);
    if (totalEl) totalEl.textContent = formatCOP(subtotal);

    // Barra de progreso de envío gratis
    const threshold = getFreeShippingThreshold();
    if (shippingBar && shippingText) {
      if (subtotal >= threshold) {
        shippingBar.style.width = '100%';
        shippingText.innerHTML = '🎉 ¡Felicitaciones! Tienes <strong>Envío Gratis</strong> en tu pedido.';
      } else {
        const remaining = threshold - subtotal;
        const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
        shippingBar.style.width = percent + '%';
        shippingText.innerHTML = `Agrega <strong>${formatCOP(remaining)}</strong> más para obtener <strong>Envío Gratis</strong>.`;
      }
    }

    // Renderizar ítems del Drawer
    if (itemsContainer) {
      if (cart.length === 0) {
        itemsContainer.innerHTML = `
          <div class="cart-empty-state">
            <span class="cart-empty-icon">☕</span>
            <p>Tu carrito está vacío</p>
            <span style="font-size: 13px; color: rgba(250,250,250,0.5);">Explora nuestro café de especialidad y agrega tus favoritos.</span>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = cart.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.title}" class="cart-item-img">
            <div class="cart-item-info">
              <h4 class="cart-item-title">${item.title}</h4>
              ${item.variantTitle ? `<div class="cart-item-variant">${item.variantTitle}</div>` : ''}
              ${item.allowPreOrder || item.isPreOrder ? `<div class="cart-item-preorder-badge">⏳ Pre-Venta (Entrega en Expo Tour del Café)</div>` : ''}
              <div class="cart-item-bottom">
                <div class="cart-qty-stepper">
                  <button class="qty-btn" onclick="window.MiticoStore.updateCartQty('${item.variantId}', -1)">-</button>
                  <span class="qty-val">${item.quantity}</span>
                  <button class="qty-btn" onclick="window.MiticoStore.updateCartQty('${item.variantId}', 1)">+</button>
                </div>
                <div class="cart-item-price">${formatCOP(item.price * item.quantity)}</div>
              </div>
            </div>
            <button class="cart-item-remove" onclick="window.MiticoStore.removeFromCart('${item.variantId}')" aria-label="Eliminar">&times;</button>
          </div>
        `).join('');
      }
    }
  };

  // Abrir / Cerrar Drawer
  const openCartDrawer = () => {
    const overlay = document.getElementById('cart-drawer-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeCartDrawer = () => {
    const overlay = document.getElementById('cart-drawer-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // ==========================================
  // MODAL DE CHECKOUT: FACTURACIÓN Y ENVÍO
  // ==========================================
  const renderCheckoutSummary = () => {
    const cart = getCart();
    const container = document.getElementById('checkout-summary-items');
    const subtotalEl = document.getElementById('checkout-subtotal-val');
    const shippingEl = document.getElementById('checkout-shipping-val');
    const totalEl = document.getElementById('checkout-total-val');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = getShippingCost(subtotal);
    const total = subtotal + shipping;

    if (container) {
      container.innerHTML = cart.map(item => `
        <div class="checkout-summary-item">
          <img src="${item.image}" alt="${item.title}" class="checkout-summary-item-img">
          <div class="checkout-summary-item-info">
            <div class="checkout-summary-item-name">${item.title}</div>
            <div class="checkout-summary-item-variant">${item.variantTitle || 'Estándar'} &times; ${item.quantity}</div>
            ${item.allowPreOrder || item.isPreOrder ? `<div class="checkout-preorder-notice">⏳ Pre-Venta (Entrega en Expo Tour del Café)</div>` : ''}
          </div>
          <div class="checkout-summary-item-price">${formatCOP(item.price * item.quantity)}</div>
        </div>
      `).join('');
    }

    if (subtotalEl) subtotalEl.textContent = formatCOP(subtotal);

    if (shippingEl) {
      if (shipping === 0) {
        shippingEl.innerHTML = `<span class="checkout-shipping-badge free">¡Envío Gratis!</span>`;
      } else {
        shippingEl.innerHTML = `<span class="checkout-shipping-badge standard">${formatCOP(shipping)}</span>`;
      }
    }

    if (totalEl) totalEl.textContent = formatCOP(total);
  };

  const openCheckoutModal = () => {
    const cart = getCart();
    if (cart.length === 0) {
      showToast('Tu carrito está vacío. Agrega productos antes de finalizar.');
      return;
    }

    // Cerrar drawer
    closeCartDrawer();

    // Cargar datos previos del cliente si existen
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY));
      if (saved) {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el && val) el.value = val;
        };
        setVal('chk-name', saved.name);
        setVal('chk-doc-type', saved.docType);
        setVal('chk-doc', saved.doc);
        setVal('chk-email', saved.email);
        setVal('chk-phone', saved.phone);
        setVal('chk-dept', saved.department);
        setVal('chk-city', saved.city);
        setVal('chk-address', saved.address);
        setVal('chk-notes', saved.notes);
      }
    } catch (e) {
      console.warn('Error al cargar datos de cliente:', e);
    }

    // Actualizar resumen del pedido
    renderCheckoutSummary();

    // Mostrar overlay del modal
    const overlay = document.getElementById('checkout-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeCheckoutModal = () => {
    const overlay = document.getElementById('checkout-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Validar y procesar Checkout con ePayco
  const handleCheckoutSubmit = async (e) => {
    if (e) e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      showToast('Tu carrito está vacío.');
      closeCheckoutModal();
      return;
    }

    // Obtener campos
    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const customer = {
      name: getVal('chk-name'),
      docType: getVal('chk-doc-type') || 'CC',
      doc: getVal('chk-doc'),
      email: getVal('chk-email'),
      phone: getVal('chk-phone'),
      department: getVal('chk-dept'),
      city: getVal('chk-city'),
      address: getVal('chk-address'),
      notes: getVal('chk-notes')
    };

    // Validaciones para Colombia
    const clearErrors = () => {
      document.querySelectorAll('.checkout-input.input-error, .checkout-select.input-error').forEach(el => {
        el.classList.remove('input-error');
      });
    };
    clearErrors();

    const markError = (id, msg) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('input-error');
        el.focus();
      }
      showToast(msg);
      return false;
    };

    if (!customer.name || customer.name.length < 3) {
      return markError('chk-name', 'Por favor ingresa tu nombre completo.');
    }
    if (!customer.doc || customer.doc.length < 5) {
      return markError('chk-doc', 'Por favor ingresa un número de cédula o NIT válido.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer.email || !emailRegex.test(customer.email)) {
      return markError('chk-email', 'Por favor ingresa un correo electrónico válido.');
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      return markError('chk-phone', 'Por favor ingresa un número de teléfono móvil válido (ej: 311 123 4567).');
    }
    if (!customer.department) {
      return markError('chk-dept', 'Por favor selecciona o escribe tu Departamento.');
    }
    if (!customer.city || customer.city.length < 2) {
      return markError('chk-city', 'Por favor indica tu Ciudad o Municipio de entrega.');
    }
    if (!customer.address || customer.address.length < 5) {
      return markError('chk-address', 'Por favor indica la dirección exacta de entrega con complementos.');
    }

    // Guardar datos válidos en localStorage para próximas compras
    try {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    } catch (err) {
      console.warn('No se pudo persistir datos de cliente', err);
    }

    // Validar disponibilidad de stock antes de continuar
    if (cart.length === 0) {
      showToast('Tu carrito está vacío.');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-epayco');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verificando inventario...</span>`;
    }

    try {
      const valRes = await fetch('/api/inventory/validate-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart })
      });
      const valData = await valRes.json();
      if (valData.success && !valData.valid) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Pagar Seguro con ePayco
          `;
        }
        const errorMsgs = valData.errors.map(e => `• ${e.message}`).join('\n');
        alert(`Disponibilidad de Inventario:\n\n${errorMsgs}\n\nPor favor ajusta las cantidades en tu carrito antes de continuar.`);
        return;
      }
    } catch (e) {
      console.warn('Validación de inventario en backend no disponible, continuando...', e);
    }

    // Iniciar pasarela ePayco
    startEpaycoPayment(customer);
  };

  // Disparar Checkout Modal de ePayco
  const startEpaycoPayment = (customer) => {
    const config = getEpaycoConfig();

    if (!window.ePayco) {
      showToast('Cargando pasarela ePayco, por favor espera un momento...');
      // Intentar cargar dinámicamente si no estuviera disponible
      const script = document.createElement('script');
      script.src = 'https://checkout.epayco.co/checkout.js';
      script.onload = () => startEpaycoPayment(customer);
      document.head.appendChild(script);
      return;
    }

    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = getShippingCost(subtotal);
    const total = subtotal + shipping;

    // Consecutivo único para la orden
    const invoiceNumber = 'TDC-' + Date.now().toString().slice(-6);

    // Resumen concatenado de productos
    const description = cart.map(i => `${i.title} (${i.variantTitle || 'Estándar'}${i.allowPreOrder || i.isPreOrder ? ' [Pre-Venta Expo]' : ''}) x${i.quantity}`).join(', ').substring(0, 240);

    const epaycoItems = cart.map(i => ({
      sku: i.sku || i.variantId,
      variantId: i.variantId,
      title: i.title,
      variantTitle: i.variantTitle,
      price: i.price,
      quantity: i.quantity,
      isPreOrder: Boolean(i.allowPreOrder || i.isPreOrder),
      deliveryNotice: (i.allowPreOrder || i.isPreOrder) ? "Pre-Venta (Entrega en Expo Tour del Café)" : null
    }));

    // Registrar orden pendiente en backend para conciliación automática en webhook
    try {
      fetch('/api/orders/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          items: epaycoItems,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: `${customer.address}, ${customer.city}, ${customer.department}`
          }
        })
      }).catch(err => console.warn('Error registrando orden pendiente:', err));
    } catch (e) {}

    const submitBtn = document.getElementById('btn-submit-epayco');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Procesando con ePayco...</span>`;
    }

    try {
      const handler = window.ePayco.checkout.configure({
        key: config.publicKey,
        test: Boolean(config.test)
      });

      const epaycoPayload = {
        // Parámetros de la compra
        name: "Tienda Oficial Mítico Coffee - Tour del Café",
        description: description,
        invoice: invoiceNumber,
        currency: (config.currency || 'cop').toLowerCase(),
        amount: total.toString(),
        tax_base: "0",
        tax: "0",
        country: (config.country || 'co').toLowerCase(),
        lang: config.lang || 'es',

        // Modo Modal dentro del sitio
        external: "false",

        // Atributos adicionales para facturación y despacho
        extra1: `Tel: ${customer.phone} | ${customer.docType}: ${customer.doc}`,
        extra2: `Envío: ${customer.address} ${customer.notes ? '(' + customer.notes + ')' : ''} | ${customer.city}, ${customer.department}`,
        extra3: JSON.stringify(epaycoItems),

        // URLs de confirmación y respuesta
        confirmation: config.confirmationUrl,
        response: config.responseUrl,

        // Datos prellenados del pagador
        name_billing: customer.name,
        address_billing: customer.address,
        type_doc_billing: customer.docType.toLowerCase(),
        number_doc_billing: customer.doc,
        mobilephone_billing: customer.phone,
        email_billing: customer.email,

        // Habilitar todos los medios de pago (PSE, Tarjetas, Daviplata, Nequi, Efectivo)
        methodsDisable: []
      };

      console.log('Iniciando ePayco Checkout con payload:', epaycoPayload);
      handler.open(epaycoPayload);

      // Restaurar botón
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Pagar Seguro con ePayco
        `;
      }
    } catch (err) {
      console.error('Error al invocar ePayco Checkout:', err);
      showToast('Ocurrió un error al abrir la pasarela. Por favor intenta de nuevo.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Pagar Seguro con ePayco`;
      }
    }
  };

  // Generar link alternativo de pedido por WhatsApp
  const checkoutWhatsApp = () => {
    const cart = getCart();
    if (cart.length === 0) {
      showToast('Tu carrito está vacío.');
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const threshold = getFreeShippingThreshold();
    const shippingText = subtotal >= threshold ? '¡Envío Gratis!' : 'A cotizar según ciudad';

    let message = `*☕ PEDIDO TIENDA OFICIAL MÍTICO COFFEE - TOUR DEL CAFÉ*\n\n`;
    message += `Hola, deseo realizar el siguiente pedido:\n\n`;

    cart.forEach((item, idx) => {
      message += `${idx + 1}. *${item.title}*\n`;
      if (item.variantTitle) message += `   Presentación: ${item.variantTitle}\n`;
      message += `   Cantidad: ${item.quantity} x ${formatCOP(item.price)}\n`;
      message += `   Subtotal: ${formatCOP(item.price * item.quantity)}\n\n`;
    });

    message += `----------------------------\n`;
    message += `*TOTAL ESTIMADO: ${formatCOP(subtotal)}*\n`;
    message += `*Envío:* ${shippingText}\n\n`;
    message += `Por favor indíquenme el método de pago y datos de envío. ¡Muchas gracias!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encoded}`, '_blank');
  };

  // ==========================================
  // RENDERIZADO DEL CATÁLOGO DE PRODUCTOS
  // ==========================================
  // ==========================================
  // RENDERIZADO DEL CATÁLOGO DE PRODUCTOS
  // ==========================================
  const renderProductCard = (p) => {
    const hasMultipleVariants = p.variants && p.variants.length > 1;
    const defaultVariant = p.variants[0] || {};
    const priceDisplay = formatCOP(p.priceMin);
    const compareDisplay = p.compareAtPriceMin ? formatCOP(p.compareAtPriceMin) : '';

    // Determinar si es un producto de preventa
    const isPreOrderProduct = isVariantPreOrder(defaultVariant.id, defaultVariant.sku, p, defaultVariant);

    // Determinar si todas las variantes del producto están agotadas
    const isAllOutOfStock = !isPreOrderProduct && (p.variants || []).every(v => getVariantStock(v.id, v.sku) <= 0);
    const firstVariantStock = defaultVariant.id ? getVariantStock(defaultVariant.id, defaultVariant.sku) : 0;
    const isInitialOut = !isPreOrderProduct && firstVariantStock <= 0;

    // Badges visuales
    let badgeHtml = '';
    if (isPreOrderProduct || p.badge === 'Pre-Venta') {
      badgeHtml = `<span class="product-badge-tag badge-preorder">🚀 Pre-Venta</span>`;
    } else if (isAllOutOfStock) {
      badgeHtml = `<span class="product-badge-outofstock">AGOTADO</span>`;
    } else if (p.badge) {
      const badgeClass = p.badge === 'OFERTA' ? 'badge-oferta' :
                         p.category === 'single-origin' ? 'badge-single-origin' :
                         p.category === 'drips' ? 'badge-drips' :
                         p.category === 'bundles' ? 'badge-bundles' : 'badge-accessories';
      badgeHtml = `<span class="product-badge-tag ${badgeClass}">${p.badge}</span>`;
    }

    // Chips sensoriales
    const notesHtml = p.specs && p.specs.notas ? `
      <div class="product-sensory-chips">
        ${p.specs.notas.split(',').slice(0, 3).map(n => `<span class="sensory-chip">${n.trim()}</span>`).join('')}
      </div>
    ` : '';

    // Origen o datos técnicos
    let metaText = '';
    if (p.specs && p.specs.origen) {
      metaText = `${p.specs.origen} ${p.specs.altitud ? '• ' + p.specs.altitud : ''}`;
    } else if (p.specs && p.specs.material) {
      metaText = `${p.specs.material} ${p.specs.capacidad ? '• ' + p.specs.capacidad : ''}`;
    }

    // Causa social destacada para la colección Resiliencia
    const socialCauseHtml = (p.collection === 'resiliencia' || p.socialCause) ? `
      <div class="card-social-cause" style="font-size: 11px; line-height: 1.4; color: #f39c12; background: rgba(211, 84, 0, 0.1); border-left: 2px solid #f39c12; padding: 4px 8px; border-radius: 0 4px 4px 0; margin-top: 6px; margin-bottom: 6px;">
        🌱 Apoyo directo a familias de <strong>A Coffee Family</strong> y <strong>Mítico Cycling Coffee</strong>.
      </div>
    ` : '';

    // Selector de variantes en tarjeta
    const variantSelectorHtml = hasMultipleVariants ? `
      <div class="product-variant-selector">
        <select class="product-variant-select" id="card-variant-${p.id}" onchange="window.MiticoStore.onCardVariantChange('${p.id}', this.value)">
          ${p.variants.map(v => {
            const vStock = getVariantStock(v.id, v.sku);
            const isVPreOrder = isVariantPreOrder(v.id, v.sku, p, v);
            const isVOut = !isVPreOrder && vStock <= 0;
            const labelSuffix = isVPreOrder ? ' (Pre-Venta)' : (isVOut ? ' (Agotado)' : (vStock <= 3 ? ` (¡Últimas ${vStock}!)` : ''));
            return `
              <option value="${v.id}" data-price="${v.price}" data-stock="${vStock}" data-compare="${v.compareAtPrice || ''}">
                ${v.title} — ${formatCOP(v.price)}${labelSuffix}
              </option>
            `;
          }).join('')}
        </select>
      </div>
    ` : '';

    return `
      <div class="product-card ${isAllOutOfStock ? 'is-out-of-stock' : ''}" data-id="${p.id}" data-category="${p.category}">
        <div class="product-img-wrapper" onclick="window.MiticoStore.openQuickview('${p.id}')">
          ${badgeHtml}
          <img src="${p.featuredImage}" alt="${p.title}" loading="lazy">
          <button class="product-quickview-btn" aria-label="Ver Ficha Rápida">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Ver Detalle
          </button>
        </div>
        <div class="product-content">
          <span class="product-category-label">${p.categoryName}</span>
          <h3 class="product-title" onclick="window.MiticoStore.openQuickview('${p.id}')">${p.title}</h3>
          ${metaText ? `<div class="product-origin-meta">${metaText}</div>` : ''}
          ${socialCauseHtml}
          ${notesHtml}
          ${variantSelectorHtml}
          <div class="product-footer">
            <div class="product-price-box">
              <span class="product-price" id="price-display-${p.id}">${priceDisplay}</span>
              ${compareDisplay ? `<span class="product-compare-price">${compareDisplay}</span>` : ''}
            </div>
            <button class="btn-add-cart ${isPreOrderProduct ? 'btn-preorder-cta' : (isInitialOut ? 'btn-disabled' : '')}" id="btn-add-card-${p.id}" ${isInitialOut ? 'disabled' : ''} onclick="window.MiticoStore.addFromCard('${p.id}')" aria-label="${isPreOrderProduct ? 'Apartar en Pre-Venta' : (isInitialOut ? 'Agotado' : 'Agregar')}">
              ${isPreOrderProduct ? `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Apartar</span>
              ` : (isInitialOut ? '<span>Agotado</span>' : `
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Agregar</span>
              `)}
            </button>
          </div>
        </div>
      </div>
    `;
  };

  const onCardVariantChange = (productId, variantId) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) return;

    const priceEl = document.getElementById(`price-display-${productId}`);
    if (priceEl) priceEl.textContent = formatCOP(variant.price);

    const btnEl = document.getElementById(`btn-add-card-${productId}`);
    if (btnEl) {
      const isPreOrder = isVariantPreOrder(variant.id, variant.sku, product, variant);
      const stock = getVariantStock(variant.id, variant.sku);
      if (isPreOrder) {
        btnEl.disabled = false;
        btnEl.classList.remove('btn-disabled');
        btnEl.classList.add('btn-preorder-cta');
        btnEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Apartar</span>
        `;
        btnEl.setAttribute('aria-label', 'Apartar en Pre-Venta');
      } else if (stock <= 0) {
        btnEl.disabled = true;
        btnEl.classList.add('btn-disabled');
        btnEl.classList.remove('btn-preorder-cta');
        btnEl.innerHTML = '<span>Agotado</span>';
        btnEl.setAttribute('aria-label', 'Agotado');
      } else {
        btnEl.disabled = false;
        btnEl.classList.remove('btn-disabled');
        btnEl.classList.remove('btn-preorder-cta');
        btnEl.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span>Agregar</span>
        `;
        btnEl.setAttribute('aria-label', 'Agregar');
      }
    }
  };

  const addFromCard = (productId) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let selectedVariantId = product.variants[0]?.id;
    const selectEl = document.getElementById(`card-variant-${productId}`);
    if (selectEl) {
      selectedVariantId = selectEl.value;
    }

    addToCart(productId, selectedVariantId, 1);
  };

  // ==========================================
  // FILTRADO Y BÚSQUEDA
  // ==========================================
  const renderCatalog = () => {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const products = window.MITICO_PRODUCTS || [];
    let filtered = products.slice();

    // 1. Filtro por categoría o colección
    const bannerEl = document.getElementById('resiliencia-collection-banner');
    if (currentCategory === 'resiliencia') {
      if (bannerEl) bannerEl.style.display = 'block';
      filtered = filtered.filter(p => p.collection === 'resiliencia' || p.allowPreOrder);
    } else {
      if (bannerEl) bannerEl.style.display = 'none';
      if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
      }
    }

    // 2. Filtro por búsqueda
    if (currentSearchQuery.trim() !== '') {
      const q = currentSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const inTitle = p.title.toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inOrigin = (p.specs?.origen || '').toLowerCase().includes(q);
        const inNotes = (p.specs?.notas || '').toLowerCase().includes(q);
        const inVariety = (p.specs?.variedad || '').toLowerCase().includes(q);
        return inTitle || inDesc || inOrigin || inNotes || inVariety;
      });
    }

    // 3. Ordenamiento
    if (currentSort === 'price-asc') {
      filtered.sort((a, b) => a.priceMin - b.priceMin);
    } else if (currentSort === 'price-desc') {
      filtered.sort((a, b) => b.priceMin - a.priceMin);
    } else if (currentSort === 'name-asc') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Destacados primero (manteniendo Resiliencia al frente)
      filtered.sort((a, b) => {
        const aRes = (a.collection === 'resiliencia' || a.allowPreOrder) ? 2 : (a.isFeatured ? 1 : 0);
        const bRes = (b.collection === 'resiliencia' || b.allowPreOrder) ? 2 : (b.isFeatured ? 1 : 0);
        return bRes - aRes;
      });
    }

    // Contador de productos
    const countEl = document.getElementById('products-counter');
    if (countEl) {
      countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} disponible${filtered.length !== 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--store-text-muted);">
          <span style="font-size: 40px; display: block; margin-bottom: 15px;">🔍</span>
          <h3 class="heading-3" style="color: #ffffff; margin-bottom: 8px;">No encontramos productos</h3>
          <p>Intenta con otros términos de búsqueda o selecciona otra categoría.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(renderProductCard).join('');
  };

  // ==========================================
  // ESTADO Y MANEJO DE VARIANTES JERÁRQUICAS
  // ==========================================
  let currentModalProductId = null;
  let currentModalVariantId = null;
  let hierarchicalState = { gender: 'Hombre', color: 'Azul', size: 'M' };

  const getHierarchicalVariant = (product, state) => {
    return product.variants.find(v => 
      v.gender === state.gender && 
      v.color === state.color && 
      v.size === state.size
    ) || product.variants[0];
  };

  const updateHierarchicalUI = (product) => {
    const variant = getHierarchicalVariant(product, hierarchicalState);
    if (!variant) return;

    currentModalVariantId = variant.id;

    // Actualizar precio
    const priceEl = document.getElementById('modal-price');
    if (priceEl) priceEl.textContent = formatCOP(variant.price);

    // Actualizar imagen principal según variante/color
    if (variant.image) {
      const mainImg = document.getElementById('modal-main-image');
      if (mainImg) mainImg.src = variant.image;
    }

    // Actualizar labels de estado activo
    const genderLabel = document.getElementById('active-gender-val');
    if (genderLabel) genderLabel.textContent = hierarchicalState.gender;
    const colorLabel = document.getElementById('active-color-val');
    if (colorLabel) colorLabel.textContent = hierarchicalState.color;
    const sizeLabel = document.getElementById('active-size-val');
    if (sizeLabel) sizeLabel.textContent = hierarchicalState.size;

    // Actualizar botones de género
    document.querySelectorAll('.hierarchical-btn[data-type="gender"]').forEach(b => {
      b.classList.toggle('active', b.dataset.val === hierarchicalState.gender);
    });

    // Re-render botones de color según género
    const colors = hierarchicalState.gender === 'Hombre' ? ['Azul', 'Gris'] : ['Blanco'];
    const colorContainer = document.getElementById('hierarchical-colors-container');
    if (colorContainer) {
      colorContainer.innerHTML = colors.map(c => `
        <button type="button" class="hierarchical-btn ${c === hierarchicalState.color ? 'active' : ''}" data-type="color" data-val="${c}" onclick="window.MiticoStore.setHierarchicalColor('${c}')">
          <span class="color-dot ${c.toLowerCase()}"></span>
          ${c}
        </button>
      `).join('');
    }

    // Re-render botones de talla según género
    const sizes = hierarchicalState.gender === 'Hombre' ? ['XS', 'S', 'M', 'L', 'XL'] : ['XS', 'S', 'M', 'L'];
    const sizeContainer = document.getElementById('hierarchical-sizes-container');
    if (sizeContainer) {
      sizeContainer.innerHTML = sizes.map(s => `
        <button type="button" class="hierarchical-btn ${s === hierarchicalState.size ? 'active' : ''}" data-type="size" data-val="${s}" onclick="window.MiticoStore.setHierarchicalSize('${s}')">
          ${s}
        </button>
      `).join('');
    }
  };

  const setHierarchicalGender = (gender) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === currentModalProductId);
    if (!product) return;

    hierarchicalState.gender = gender;
    if (gender === 'Mujer') {
      hierarchicalState.color = 'Blanco';
      if (hierarchicalState.size === 'XL') hierarchicalState.size = 'L';
    } else {
      if (hierarchicalState.color === 'Blanco') hierarchicalState.color = 'Azul';
    }
    updateHierarchicalUI(product);
  };

  const setHierarchicalColor = (color) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === currentModalProductId);
    if (!product) return;

    hierarchicalState.color = color;
    updateHierarchicalUI(product);
  };

  const setHierarchicalSize = (size) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === currentModalProductId);
    if (!product) return;

    hierarchicalState.size = size;
    updateHierarchicalUI(product);
  };

  // ==========================================
  // MODAL DE VISTA RÁPIDA / FICHA DE PRODUCTO
  // ==========================================
  const openQuickview = (productId) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const overlay = document.getElementById('quickview-overlay');
    const modalContent = document.getElementById('quickview-modal-content');
    if (!overlay || !modalContent) return;

    currentModalProductId = product.id;
    let selectedVariant = product.variants[0] || {};

    // Manejo de variantes jerárquicas (T-Shirt Arriero)
    let variantOptionsHtml = '';
    if (product.hasHierarchicalVariants) {
      hierarchicalState = { gender: 'Hombre', color: 'Azul', size: 'M' };
      selectedVariant = getHierarchicalVariant(product, hierarchicalState);
      currentModalVariantId = selectedVariant.id;

      const colors = ['Azul', 'Gris'];
      const sizes = ['XS', 'S', 'M', 'L', 'XL'];

      variantOptionsHtml = `
        <div class="hierarchical-selector-wrap">
          <!-- Paso 1: Género -->
          <div class="hierarchical-group">
            <div class="hierarchical-label">
              <span>1. Género:</span>
              <span class="active-val" id="active-gender-val">${hierarchicalState.gender}</span>
            </div>
            <div class="hierarchical-pills">
              <button type="button" class="hierarchical-btn active" data-type="gender" data-val="Hombre" onclick="window.MiticoStore.setHierarchicalGender('Hombre')">
                Hombre
              </button>
              <button type="button" class="hierarchical-btn" data-type="gender" data-val="Mujer" onclick="window.MiticoStore.setHierarchicalGender('Mujer')">
                Mujer
              </button>
            </div>
          </div>

          <!-- Paso 2: Color -->
          <div class="hierarchical-group">
            <div class="hierarchical-label">
              <span>2. Color:</span>
              <span class="active-val" id="active-color-val">${hierarchicalState.color}</span>
            </div>
            <div class="hierarchical-pills" id="hierarchical-colors-container">
              ${colors.map(c => `
                <button type="button" class="hierarchical-btn ${c === hierarchicalState.color ? 'active' : ''}" data-type="color" data-val="${c}" onclick="window.MiticoStore.setHierarchicalColor('${c}')">
                  <span class="color-dot ${c.toLowerCase()}"></span>
                  ${c}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Paso 3: Talla -->
          <div class="hierarchical-group">
            <div class="hierarchical-label">
              <span>3. Talla:</span>
              <span class="active-val" id="active-size-val">${hierarchicalState.size}</span>
            </div>
            <div class="hierarchical-pills" id="hierarchical-sizes-container">
              ${sizes.map(s => `
                <button type="button" class="hierarchical-btn ${s === hierarchicalState.size ? 'active' : ''}" data-type="size" data-val="${s}" onclick="window.MiticoStore.setHierarchicalSize('${s}')">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (product.variants.length > 1) {
      currentModalVariantId = selectedVariant.id;
      variantOptionsHtml = `
        <div style="margin: 20px 0;">
          <label style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--store-text-muted); margin-bottom: 8px;">
            Selecciona Presentación / Molienda:
          </label>
          <select id="modal-variant-select" class="product-variant-select" style="padding: 10px; font-size: 14px;" onchange="window.MiticoStore.onModalVariantChange('${product.id}', this.value)">
            ${product.variants.map(v => {
              const vStock = getVariantStock(v.id, v.sku);
              const isVPreOrder = isVariantPreOrder(v.id, v.sku, product, v);
              const isVOut = !isVPreOrder && vStock <= 0;
              const labelSuffix = isVPreOrder ? ' (Pre-Venta)' : (isVOut ? ' (Agotado)' : (vStock <= 3 ? ` (¡Últimas ${vStock}!)` : ''));
              return `
                <option value="${v.id}" data-stock="${vStock}">
                  ${v.title} — ${formatCOP(v.price)}${labelSuffix}
                </option>
              `;
            }).join('')}
          </select>
        </div>
      `;
    } else {
      currentModalVariantId = selectedVariant.id;
    }

    // Construir tabla de ficha técnica
    let specsHtml = '';
    const specs = product.specs || {};
    const specsRows = [];

    if (specs.coleccion) specsRows.push(['Colección', specs.coleccion]);
    if (specs.material) specsRows.push(['Material', specs.material]);
    if (specs.corte) specsRows.push(['Corte / Ajuste', specs.corte]);
    if (specs.entrega) specsRows.push(['Modalidad de Entrega', specs.entrega]);
    if (specs.origen) specsRows.push(['Región / Origen', specs.origen]);
    if (specs.finca) specsRows.push(['Finca', specs.finca]);
    if (specs.familia) specsRows.push(['Familia / Productor', specs.familia]);
    if (specs.altitud) specsRows.push(['Altitud', specs.altitud]);
    if (specs.variedad) specsRows.push(['Variedad', specs.variedad]);
    if (specs.proceso) specsRows.push(['Proceso', specs.proceso]);
    if (specs.tostado) specsRows.push(['Perfil de Tostión', specs.tostado]);
    if (specs.fragancia) specsRows.push(['Fragancia', specs.fragancia]);
    if (specs.aroma) specsRows.push(['Aroma', specs.aroma]);
    if (specs.acidez) specsRows.push(['Acidez', specs.acidez]);
    if (specs.final) specsRows.push(['Notas Finales', specs.final]);
    if (specs.capacidad) specsRows.push(['Capacidad', specs.capacidad]);

    if (specsRows.length > 0) {
      specsHtml = `
        <h4 style="font-size: 14px; font-weight: 700; color: var(--store-accent-hover); margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">
          Ficha Técnica &amp; Detalles
        </h4>
        <table class="coffee-specs-table">
          ${specsRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
        </table>
      `;
    }

    // Miniaturas de galería
    const thumbsHtml = product.images.length > 1 ? `
      <div class="modal-gallery-thumbs">
        ${product.images.map((img, idx) => `
          <div class="modal-thumb ${idx === 0 ? 'active' : ''}" onclick="window.MiticoStore.changeModalImage('${img}', this)">
            <img src="${img}" alt="${product.title}">
          </div>
        `).join('')}
      </div>
    ` : '';

    const isPreOrderProduct = isVariantPreOrder(selectedVariant.id, selectedVariant.sku, product, selectedVariant);
    const initialStock = getVariantStock(selectedVariant.id, selectedVariant.sku);
    const isOut = !isPreOrderProduct && initialStock <= 0;
    const isLow = !isPreOrderProduct && !isOut && initialStock <= 3;

    let stockAlertHtml = '';
    if (isPreOrderProduct) {
      stockAlertHtml = `<div class="quickview-stock-alert preorder" id="modal-stock-alert">🚀 Pre-Venta Exclusiva • Entrega en Expo Tour del Café</div>`;
    } else if (isOut) {
      stockAlertHtml = `<div class="quickview-stock-alert out" id="modal-stock-alert">⚠️ Presentación Agotada</div>`;
    } else if (isLow) {
      stockAlertHtml = `<div class="quickview-stock-alert low" id="modal-stock-alert">🔥 ¡Últimas ${initialStock} unidades disponibles!</div>`;
    } else {
      stockAlertHtml = `<div class="quickview-stock-alert ok" id="modal-stock-alert">✓ Disponible en bodega (${initialStock} un.)</div>`;
    }

    const preorderNoticeHtml = (isPreOrderProduct || product.collection === 'resiliencia' || product.dispatchNotice) ? `
      <div class="modal-preorder-notice-box">
        <div class="modal-preorder-dispatch">
          📍 ${product.dispatchNotice || 'Pre-venta exclusiva: Entrega oficial durante la Expo del Tour del Café'}
        </div>
        <p class="modal-preorder-cause">
          <strong>Impacto Social:</strong> ${product.socialCause || 'Un porcentaje de las utilidades de esta colección se destina directamente al apoyo de las familias caficultoras aliadas de A Coffee Family y Mítico Cycling Coffee.'}
        </p>
      </div>
    ` : '';

    modalQuantity = 1;

    modalContent.innerHTML = `
      <button class="quickview-close-btn" onclick="window.MiticoStore.closeQuickview()" aria-label="Cerrar">&times;</button>
      <div class="quickview-grid">
        <!-- Columna Izquierda: Galería -->
        <div>
          <div class="modal-gallery-main">
            <img id="modal-main-image" src="${selectedVariant.image || product.featuredImage}" alt="${product.title}">
          </div>
          ${thumbsHtml}
        </div>

        <!-- Columna Derecha: Información y Compra -->
        <div>
          <span class="product-category-label">${product.categoryName}</span>
          <h2 class="heading-2" style="font-size: 1.6rem; color: #ffffff; margin-bottom: 8px;">${product.title}</h2>
          
          <div style="margin-bottom: 12px;">
            ${stockAlertHtml}
          </div>

          ${preorderNoticeHtml}

          <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px;">
            <span id="modal-price" style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: #ffffff;">
              ${formatCOP(selectedVariant.price)}
            </span>
            ${selectedVariant.compareAtPrice ? `<span style="text-decoration: line-through; color: rgba(250,250,250,0.4); font-size: 14px;">${formatCOP(selectedVariant.compareAtPrice)}</span>` : ''}
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: var(--store-text-muted); margin-bottom: 20px;">
            ${product.description.split('\n')[0] || ''}
          </p>

          ${variantOptionsHtml}

          <!-- Controles de Compra -->
          <div style="display: flex; gap: 12px; align-items: center; margin-top: 25px;">
            <div class="cart-qty-stepper" style="height: 44px;">
              <button class="qty-btn" id="modal-qty-minus" style="width: 36px; height: 100%;" ${isOut ? 'disabled' : ''} onclick="window.MiticoStore.modalQtyChange(-1)">-</button>
              <span id="modal-qty-val" class="qty-val" style="width: 44px; font-weight: 700; font-size: 15px;">${modalQuantity}</span>
              <button class="qty-btn" id="modal-qty-plus" style="width: 36px; height: 100%;" ${isOut ? 'disabled' : ''} onclick="window.MiticoStore.modalQtyChange(1)">+</button>
            </div>
            <button class="btn-add-cart ${isPreOrderProduct ? 'btn-preorder-cta' : (isOut ? 'btn-disabled' : '')}" id="modal-add-btn" style="flex-grow: 1; height: 44px; justify-content: center; font-size: 14px;" ${isOut ? 'disabled' : ''} onclick="window.MiticoStore.addFromModal('${product.id}')">
              ${isPreOrderProduct ? `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Apartar en Pre-Venta</span>
              ` : (isOut ? '<span>Agotado</span>' : `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Agregar al Carrito</span>
              `)}
            </button>
          </div>

          <!-- Ficha Técnica -->
          ${specsHtml}
        </div>
      </div>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeQuickview = () => {
    const overlay = document.getElementById('quickview-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  const changeModalImage = (imgSrc, thumbEl) => {
    const mainImg = document.getElementById('modal-main-image');
    if (mainImg) mainImg.src = imgSrc;
    document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  };

  const onModalVariantChange = (productId, variantId) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) return;

    currentModalVariantId = variant.id;

    const priceEl = document.getElementById('modal-price');
    if (priceEl) priceEl.textContent = formatCOP(variant.price);

    const isPreOrder = isVariantPreOrder(variant.id, variant.sku, product, variant);
    const stock = getVariantStock(variant.id, variant.sku);
    const isOut = !isPreOrder && stock <= 0;
    const isLow = !isPreOrder && !isOut && stock <= 3;

    // Actualizar badge de stock en modal
    const alertEl = document.getElementById('modal-stock-alert');
    if (alertEl) {
      if (isPreOrder) {
        alertEl.className = 'quickview-stock-alert preorder';
        alertEl.innerHTML = '🚀 Pre-Venta Exclusiva • Entrega en Expo Tour del Café';
      } else {
        alertEl.className = `quickview-stock-alert ${isOut ? 'out' : (isLow ? 'low' : 'ok')}`;
        alertEl.innerHTML = isOut
          ? '⚠️ Presentación Agotada'
          : (isLow ? `🔥 ¡Últimas ${stock} unidades disponibles!` : `✓ Disponible en bodega (${stock} un.)`);
      }
    }

    // Actualizar botón de compra en modal
    const addBtn = document.getElementById('modal-add-btn');
    const minusBtn = document.getElementById('modal-qty-minus');
    const plusBtn = document.getElementById('modal-qty-plus');
    const qtyVal = document.getElementById('modal-qty-val');

    if (addBtn) {
      if (isPreOrder) {
        addBtn.disabled = false;
        addBtn.className = 'btn-add-cart btn-preorder-cta';
        addBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Apartar en Pre-Venta</span>
        `;
        if (minusBtn) minusBtn.disabled = false;
        if (plusBtn) plusBtn.disabled = false;
        if (modalQuantity <= 0) modalQuantity = 1;
        if (qtyVal) qtyVal.textContent = modalQuantity;
      } else if (isOut) {
        addBtn.disabled = true;
        addBtn.className = 'btn-add-cart btn-disabled';
        addBtn.innerHTML = '<span>Agotado</span>';
        if (minusBtn) minusBtn.disabled = true;
        if (plusBtn) plusBtn.disabled = true;
        modalQuantity = 0;
        if (qtyVal) qtyVal.textContent = '0';
      } else {
        addBtn.disabled = false;
        addBtn.className = 'btn-add-cart';
        addBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Agregar al Carrito
        `;
        if (minusBtn) minusBtn.disabled = false;
        if (plusBtn) plusBtn.disabled = false;
        if (modalQuantity <= 0) modalQuantity = 1;
        if (qtyVal) qtyVal.textContent = modalQuantity;
      }
    }
  };

  let modalQuantity = 1;
  const modalQtyChange = (delta) => {
    modalQuantity = Math.max(1, modalQuantity + delta);
    const qtyEl = document.getElementById('modal-qty-val');
    if (qtyEl) qtyEl.textContent = modalQuantity;
  };

  const addFromModal = (productId) => {
    const products = window.MITICO_PRODUCTS || [];
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let selectedVariantId = currentModalVariantId;
    if (!selectedVariantId) {
      const selectEl = document.getElementById('modal-variant-select');
      selectedVariantId = selectEl ? selectEl.value : product.variants[0]?.id;
    }

    addToCart(productId, selectedVariantId, Math.max(1, modalQuantity));
    closeQuickview();
    modalQuantity = 1;
  };

  // ==========================================
  // RENDERIZADO PARA EL HOME (index.html)
  // ==========================================
  const renderHomeFeaturedSection = () => {
    const container = document.getElementById('home-featured-products');
    if (!container) return;

    const products = window.MITICO_PRODUCTS || [];
    // Prioritariamente los 3 productos de la colección Resiliencia
    const resilienciaIds = ['t-shirt-arriero', 'mug-arriero', 'mitico-escarabajo'];
    const resilienciaItems = resilienciaIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const otherFeatured = products.filter(p => p.isFeatured && !resilienciaIds.includes(p.id));
    const itemsToRender = [...resilienciaItems, ...otherFeatured].slice(0, 4);

    container.innerHTML = itemsToRender.map(renderProductCard).join('');
  };

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================
  const init = async () => {
    // Sincronizar inventario en tiempo real desde el backend
    await fetchLiveStock();
    updateCartUI();

    // Si estamos en tienda.html
    const grid = document.getElementById('products-grid');
    if (grid) {
      // Manejar parámetro de URL (ej: ?coleccion=resiliencia o ?categoria=resiliencia)
      const urlParams = new URLSearchParams(window.location.search);
      const coleccionParam = urlParams.get('coleccion') || urlParams.get('categoria') || urlParams.get('category');
      if (coleccionParam && coleccionParam.toLowerCase() === 'resiliencia') {
        currentCategory = 'resiliencia';
      }

      renderCatalog();

      // Sincronizar pills activas
      document.querySelectorAll('.category-pill-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.category || 'all') === currentCategory);
        btn.addEventListener('click', () => {
          document.querySelectorAll('.category-pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.dataset.category || 'all';
          renderCatalog();
        });
      });

      // Listener para buscador
      const searchInput = document.getElementById('store-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          currentSearchQuery = e.target.value;
          renderCatalog();
        });
      }

      // Listener para ordenamiento
      const sortSelect = document.getElementById('store-sort-select');
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          currentSort = e.target.value;
          renderCatalog();
        });
      }
    }

    // Si estamos en index.html
    const homeSection = document.getElementById('home-featured-products');
    if (homeSection) {
      renderHomeFeaturedSection();
    }

    // Triggers del carrito en Header
    document.querySelectorAll('.store-cart-btn, #cart-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openCartDrawer();
      });
    });

    // Cerrar carrito al hacer clic en overlay o botón cerrar
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCartDrawer();
      });
    }

    const cartCloseBtn = document.getElementById('cart-close-btn');
    if (cartCloseBtn) {
      cartCloseBtn.addEventListener('click', closeCartDrawer);
    }

    // Cerrar quickview al hacer clic en fondo
    const quickviewOverlay = document.getElementById('quickview-overlay');
    if (quickviewOverlay) {
      quickviewOverlay.addEventListener('click', (e) => {
        if (e.target === quickviewOverlay) closeQuickview();
      });
    }

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCartDrawer();
        closeQuickview();
        closeCheckoutModal();
      }
    });

    // Botón principal "Finalizar Compra / ePayco" en Drawer
    const btnCheckout = document.getElementById('btn-cart-checkout');
    if (btnCheckout) {
      btnCheckout.addEventListener('click', openCheckoutModal);
    }

    // Botón secundario de WhatsApp en Drawer
    const btnWa = document.getElementById('btn-cart-whatsapp');
    if (btnWa) {
      btnWa.addEventListener('click', checkoutWhatsApp);
    }

    // Cerrar modal de checkout
    const checkoutCloseBtn = document.getElementById('checkout-modal-close');
    if (checkoutCloseBtn) {
      checkoutCloseBtn.addEventListener('click', closeCheckoutModal);
    }

    const checkoutOverlay = document.getElementById('checkout-modal-overlay');
    if (checkoutOverlay) {
      checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) closeCheckoutModal();
      });
    }

    // Envío del formulario de checkout
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }

    // ==========================================
    // ACCESO AL PANEL DE INVENTARIO (MODAL DE CREDENCIALES)
    // ==========================================
    const setupInventoryAuthModal = () => {
      const btnAdmin = document.getElementById('btn-admin-inventario') || document.querySelector('.admin-nav-link[href*="admin-inventario"]');
      const overlay = document.getElementById('inv-auth-modal-overlay');
      const closeBtn = document.getElementById('btn-close-inv-modal');
      const form = document.getElementById('inv-auth-form');
      const keyInput = document.getElementById('inv-auth-key-input');
      const errorMsg = document.getElementById('inv-auth-error');
      const eyeBtn = document.getElementById('btn-toggle-inv-eye');

      if (!btnAdmin || !overlay || !form) return;

      const openModal = () => {
        overlay.style.display = 'flex';
        void overlay.offsetWidth;
        overlay.classList.add('active');
        if (errorMsg) {
          errorMsg.style.display = 'none';
          errorMsg.textContent = '';
        }
        if (keyInput) {
          keyInput.value = '';
          setTimeout(() => keyInput.focus(), 150);
        }
      };

      const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          if (!overlay.classList.contains('active')) {
            overlay.style.display = 'none';
          }
        }, 250);
      };

      btnAdmin.addEventListener('click', (e) => {
        const existingKey = sessionStorage.getItem('mitico_admin_key');
        if (existingKey === 'mitico_admin_2027') {
          // Ya autenticado en esta sesión
          return;
        }
        e.preventDefault();
        openModal();
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
      }

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      if (eyeBtn && keyInput) {
        eyeBtn.addEventListener('click', () => {
          const isPass = keyInput.type === 'password';
          keyInput.type = isPass ? 'text' : 'password';
          eyeBtn.textContent = isPass ? '🔒' : '👁️';
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = (keyInput?.value || '').trim();
        if (!key) return;

        const submitBtn = document.getElementById('btn-submit-inv-auth');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verificando...';
        }

        let isValid = false;
        try {
          const res = await fetch('/api/admin/inventory', {
            headers: { 'x-admin-key': key }
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('json')) {
            isValid = true;
          } else if (res.status === 401) {
            isValid = false;
          } else {
            if (key === 'mitico_admin_2027') isValid = true;
          }
        } catch (netErr) {
          if (key === 'mitico_admin_2027') isValid = true;
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Desbloquear y Acceder';
          }
        }

        if (isValid) {
          sessionStorage.setItem('mitico_admin_key', key);
          closeModal();
          window.open('admin-inventario.html', '_blank');
        } else {
          if (errorMsg) {
            errorMsg.textContent = 'Clave de administración incorrecta. Por favor verifica e intenta de nuevo.';
            errorMsg.style.display = 'block';
          }
        }
      });
    };
    setupInventoryAuthModal();
  };

  // Exponer API global
  window.MiticoStore = {
    addToCart,
    removeFromCart,
    updateCartQty,
    openCartDrawer,
    closeCartDrawer,
    openQuickview,
    closeQuickview,
    openCheckoutModal,
    closeCheckoutModal,
    handleCheckoutSubmit,
    startEpaycoPayment,
    changeModalImage,
    onCardVariantChange,
    onModalVariantChange,
    modalQtyChange,
    addFromCard,
    addFromModal,
    checkoutWhatsApp,
    renderCatalog,
    setHierarchicalGender,
    setHierarchicalColor,
    setHierarchicalSize
  };

  // Autoiniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
