/**
 * INSCRIPCIONES TOUR DEL CAFÉ - CLIENT LOGIC
 * Gestión del portal de inscripciones, selección de recorridos y categorías,
 * validación matemática de edades a corte 31/12/2027, tarifas dinámicas y checkout ePayco.
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIGURACIÓN Y ESTADO DE LA APLICACIÓN
  // ==========================================
  const CUT_OFF_YEAR = 2027;

  const STATE = {
    currentStep: 0, // 0: Evento, 1: Opción Genesis (Paso 1 de 2), 2: Registro & Pago (Paso 2 de 2)
    selectedEvent: 'genesis-coffee-ride',
    genesisOption: 'standard', // 'standard' | 'vip'
    includeJersey: false, // Adición opcional para Standard (+ $100.000 COP)
    jerseySize: '',
    jerseyPrice: 100000,
    selectedRoute: 'standard',
    selectedCategory: {
      id: 'genesis-standard',
      name: 'Inscripción Standard',
      participantsCount: 1,
      rule: 'Edad mínima 18 años cumplidos al 31/Dic/2027.'
    },
    categoryGroup: 'individual',
    teamName: '',
    currentStage: null,
    unitPrice: 490000,
    appliedCoupon: null,
    participants: []
  };

  // Definición completa de Categorías Oficiales
  const CATEGORIES_DATA = {
    macchiato: {
      equipos: [
        {
          id: 'equipo-masc-a',
          name: 'Equipo Masculino A',
          gender: 'M',
          participantsCount: 4,
          rule: 'Suma de edades combinada entre 72 y 159 años.',
          minSum: 72,
          maxSum: 159,
          desc: 'Para 4 corredores masculinos cuya suma de edad al 31/Dic/2027 esté en el rango 72 - 159 años.'
        },
        {
          id: 'equipo-masc-b',
          name: 'Equipo Masculino B',
          gender: 'M',
          participantsCount: 4,
          rule: 'Suma de edades combinada de 160 años en adelante.',
          minSum: 160,
          maxSum: 999,
          desc: 'Para 4 corredores masculinos con suma combinada mayor o igual a 160 años al 31/Dic/2027.'
        },
        {
          id: 'equipo-fem-a',
          name: 'Equipo Femenino A',
          gender: 'F',
          participantsCount: 4,
          rule: 'Suma de edades combinada entre 72 y 159 años.',
          minSum: 72,
          maxSum: 159,
          desc: 'Para 4 corredoras femeninas con suma de edad entre 72 y 159 años al 31/Dic/2027.'
        },
        {
          id: 'equipo-fem-b',
          name: 'Equipo Femenino B',
          gender: 'F',
          participantsCount: 4,
          rule: 'Suma de edades combinada de 160 años en adelante.',
          minSum: 160,
          maxSum: 999,
          desc: 'Para 4 corredoras femeninas con suma combinada mayor o igual a 160 años al 31/Dic/2027.'
        }
      ],
      parejas: [
        {
          id: 'pareja-sub90',
          name: 'Parejas Mixtas A (Sub-90)',
          gender: 'MIXTO',
          participantsCount: 2,
          rule: '1 Hombre y 1 Mujer. Suma de edad combinada < 90 años.',
          minSum: 36,
          maxSum: 89,
          desc: 'Corredores mixtos (1 hombre y 1 mujer) con suma total menor a 90 años al 31/Dic/2027.'
        },
        {
          id: 'pareja-90mas',
          name: 'Parejas Mixtas B (90+)',
          gender: 'MIXTO',
          participantsCount: 2,
          rule: '1 Hombre y 1 Mujer. Suma de edad combinada >= 90 años.',
          minSum: 90,
          maxSum: 999,
          desc: 'Corredores mixtos (1 hombre y 1 mujer) con suma total de 90 años o más al 31/Dic/2027.'
        }
      ],
      individual: [
        // Masculino
        { id: 'ind-m-19-30', name: 'Individual Masculino (19 - 30 años)', gender: 'M', minAge: 19, maxAge: 30, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 19 y 30 años.' },
        { id: 'ind-m-31-39', name: 'Individual Masculino (31 - 39 años)', gender: 'M', minAge: 31, maxAge: 39, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 31 y 39 años.' },
        { id: 'ind-m-40-49', name: 'Individual Masculino (40 - 49 años)', gender: 'M', minAge: 40, maxAge: 49, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 40 y 49 años.' },
        { id: 'ind-m-50-59', name: 'Individual Masculino (50 - 59 años)', gender: 'M', minAge: 50, maxAge: 59, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 50 y 59 años.' },
        { id: 'ind-m-60-mas', name: 'Individual Masculino (60+ años)', gender: 'M', minAge: 60, maxAge: 110, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 de 60 años o más.' },
        // Femenino
        { id: 'ind-f-19-30', name: 'Individual Femenino (19 - 30 años)', gender: 'F', minAge: 19, maxAge: 30, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 19 y 30 años.' },
        { id: 'ind-f-31-39', name: 'Individual Femenino (31 - 39 años)', gender: 'F', minAge: 31, maxAge: 39, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 31 y 39 años.' },
        { id: 'ind-f-40-49', name: 'Individual Femenino (40 - 49 años)', gender: 'F', minAge: 40, maxAge: 49, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 40 y 49 años.' },
        { id: 'ind-f-50-59', name: 'Individual Femenino (50 - 59 años)', gender: 'F', minAge: 50, maxAge: 59, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 50 y 59 años.' },
        { id: 'ind-f-60-mas', name: 'Individual Femenino (60+ años)', gender: 'F', minAge: 60, maxAge: 110, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 de 60 años o más.' }
      ]
    },
    espresso: {
      parejas: [
        {
          id: 'pareja-sub90',
          name: 'Parejas Mixtas A (Sub-90)',
          gender: 'MIXTO',
          participantsCount: 2,
          rule: '1 Hombre y 1 Mujer. Suma de edad combinada < 90 años.',
          minSum: 36,
          maxSum: 89,
          desc: 'Corredores mixtos (1 hombre y 1 mujer) con suma total menor a 90 años al 31/Dic/2027.'
        },
        {
          id: 'pareja-90mas',
          name: 'Parejas Mixtas B (90+)',
          gender: 'MIXTO',
          participantsCount: 2,
          rule: '1 Hombre y 1 Mujer. Suma de edad combinada >= 90 años.',
          minSum: 90,
          maxSum: 999,
          desc: 'Corredores mixtos (1 hombre y 1 mujer) con suma total de 90 años o más al 31/Dic/2027.'
        }
      ],
      individual: [
        // Masculino
        { id: 'ind-m-19-30', name: 'Individual Masculino (19 - 30 años)', gender: 'M', minAge: 19, maxAge: 30, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 19 y 30 años.' },
        { id: 'ind-m-31-39', name: 'Individual Masculino (31 - 39 años)', gender: 'M', minAge: 31, maxAge: 39, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 31 y 39 años.' },
        { id: 'ind-m-40-49', name: 'Individual Masculino (40 - 49 años)', gender: 'M', minAge: 40, maxAge: 49, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 40 y 49 años.' },
        { id: 'ind-m-50-59', name: 'Individual Masculino (50 - 59 años)', gender: 'M', minAge: 50, maxAge: 59, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 50 y 59 años.' },
        { id: 'ind-m-60-mas', name: 'Individual Masculino (60+ años)', gender: 'M', minAge: 60, maxAge: 110, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 de 60 años o más.' },
        // Femenino
        { id: 'ind-f-19-30', name: 'Individual Femenino (19 - 30 años)', gender: 'F', minAge: 19, maxAge: 30, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 19 y 30 años.' },
        { id: 'ind-f-31-39', name: 'Individual Femenino (31 - 39 años)', gender: 'F', minAge: 31, maxAge: 39, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 31 y 39 años.' },
        { id: 'ind-f-40-49', name: 'Individual Femenino (40 - 49 años)', gender: 'F', minAge: 40, maxAge: 49, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 40 y 49 años.' },
        { id: 'ind-f-50-59', name: 'Individual Femenino (50 - 59 años)', gender: 'F', minAge: 50, maxAge: 59, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 entre 50 y 59 años.' },
        { id: 'ind-f-60-mas', name: 'Individual Femenino (60+ años)', gender: 'F', minAge: 60, maxAge: 110, participantsCount: 1, rule: 'Edad cumplida al 31/Dic/2027 de 60 años o más.' }
      ]
    }
  };

  const JERSEY_SIZES = [
    'XS Mujer', 'S Mujer', 'M Mujer', 'L Mujer', 'XL Mujer',
    'XS Hombre', 'S Hombre', 'M Hombre', 'L Hombre', 'XL Hombre', 'XXL Hombre'
  ];

  // Helper de Formateo COP
  function formatCOP(amount) {
    if (!amount) return '$ 0 COP';
    return '$ ' + Math.round(Number(amount)).toLocaleString('es-CO') + ' COP';
  }

  // Sanitizador seguro para inputs HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast Notificaciones
  function showToast(message, isError = false) {
    const toast = document.getElementById('portal-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.borderLeftColor = isError ? 'var(--color-error)' : 'var(--color-accent)';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4500);
  }

  // ==========================================
  // CÁLCULO MATEMÁTICO DE EDAD (31 DICIEMBRE 2027)
  // ==========================================
  function calculateAge(birthDateString) {
    if (!birthDateString) return null;
    const parts = birthDateString.split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    if (isNaN(year) || year < 1920 || year > 2027) return null;
    return CUT_OFF_YEAR - year;
  }

  // ==========================================
  // CARGA DE ETAPAS TARIFARIAS DESDE EL SERVIDOR
  // ==========================================
  async function loadPricingStage() {
    try {
      const res = await fetch('/api/inscripciones/etapas');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.current) {
          STATE.currentStage = data.current;
          updateStageBanner(data.current);
          return;
        }
      }
    } catch (e) {
      console.warn('Usando configuración local de tarifas:', e);
    }

    // Fallback local: Chapola
    STATE.currentStage = {
      id: 'chapola',
      name: 'Chapola',
      badge: 'Tarifa Especial de Apertura',
      prices: { macchiato: 490000, espresso: 490000, standard: 490000, vip: 490000 },
      startDate: '2026-09-28T00:00:00-05:00',
      endDate: '2026-10-25T23:59:59-05:00'
    };
    updateStageBanner(STATE.currentStage);
  }

  function updateStageBanner(stage) {
    const nameEl = document.getElementById('banner-stage-name');
    const datesEl = document.getElementById('banner-stage-dates');
    const priceEl = document.getElementById('banner-stage-price');
    const badgeEl = document.getElementById('banner-stage-badge');

    if (nameEl) nameEl.textContent = stage.name;
    if (badgeEl) badgeEl.textContent = stage.badge || 'Etapa Activa';
    if (datesEl) {
      const start = new Date(stage.startDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      const end = new Date(stage.endDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      datesEl.textContent = `Vigencia: ${start} - ${end}`;
    }
    const standardPrice = (stage.prices && (stage.prices.standard || stage.prices.macchiato)) || 490000;
    const currentPrice = (stage.prices && (stage.prices[STATE.genesisOption] || stage.prices[STATE.selectedRoute])) || standardPrice;
    STATE.unitPrice = currentPrice;

    // Tarifa por Corredor a Partir de (tarifa correspondiente a la opción Standard)
    if (priceEl) priceEl.textContent = formatCOP(standardPrice);

    // Actualizar precios en las tarjetas de opción Genesis
    const priceStandardEl = document.getElementById('price-genesis-standard');
    const priceVipEl = document.getElementById('price-genesis-vip');
    if (priceStandardEl) priceStandardEl.textContent = formatCOP(standardPrice);
    if (priceVipEl) priceVipEl.textContent = formatCOP((stage.prices && (stage.prices.vip || stage.prices.standard)) || 490000);

    updateSummary();
  }

  // ==========================================
  // SELECCIÓN DE MODALIDAD GENESIS COFFEE RIDE
  // ==========================================
  function selectGenesisOption(optionKey) {
    STATE.genesisOption = optionKey;
    STATE.selectedRoute = optionKey;

    const cardStandard = document.getElementById('card-opt-standard');
    const cardVip = document.getElementById('card-opt-vip');

    if (cardStandard && cardVip) {
      if (optionKey === 'standard') {
        cardStandard.classList.add('selected');
        cardVip.classList.remove('selected');
      } else {
        cardStandard.classList.remove('selected');
        cardVip.classList.add('selected');
      }
    }

    if (STATE.currentStage && STATE.currentStage.prices) {
      STATE.unitPrice = STATE.currentStage.prices[optionKey] || STATE.currentStage.prices.standard || 490000;
    }

    if (optionKey === 'vip') {
      STATE.selectedCategory = {
        id: 'genesis-vip',
        name: 'Experiencia VIP',
        participantsCount: 1,
        rule: 'Mayor de 18 años al 31 de diciembre de 2027.'
      };
      // En VIP el jersey está incluido en el paquete
      STATE.includeJersey = true;
    } else {
      STATE.selectedCategory = {
        id: 'genesis-standard',
        name: 'Inscripción Standard',
        participantsCount: 1,
        rule: 'Mayor de 18 años al 31 de diciembre de 2027.'
      };
    }

    updateSummary();
  }

  // ==========================================
  // CONTROL DE PASOS DEL FLUJO (2 PASOS PARA GENESIS)
  // ==========================================
  function goToStep(stepIndex) {
    STATE.currentStep = stepIndex;

    // Ocultar todas las vistas
    document.querySelectorAll('.view-step').forEach(el => el.classList.remove('active-step'));

    const stepperContainer = document.getElementById('stepper-container');
    const fillLine = document.getElementById('stepper-fill');
    const node1 = document.getElementById('node-step-1');
    const node2 = document.getElementById('node-step-2');
    const label1 = document.getElementById('node-label-1');
    const label2 = document.getElementById('node-label-2');

    if (label1) label1.textContent = 'Inscripción';
    if (label2) label2.textContent = 'Registro & Pago';

    if (stepIndex === 0) {
      // Paso 0: Selección de Evento
      const step0 = document.getElementById('step-0-eventos');
      if (step0) step0.classList.add('active-step');
      if (stepperContainer) stepperContainer.style.display = 'none';
    } else if (stepIndex === 1) {
      // Paso 1 de 2: Standard vs Experiencia VIP
      const step1 = document.getElementById('step-1-genesis');
      if (step1) step1.classList.add('active-step');
      if (stepperContainer) stepperContainer.style.display = 'block';

      if (node1) node1.className = 'step-node active';
      if (node2) node2.className = 'step-node';
      if (fillLine) fillLine.style.width = '0%';
    } else if (stepIndex === 2) {
      // Paso 2 de 2: Formulario & Pago
      const stepForm = document.getElementById('step-3-formulario');
      if (stepForm) stepForm.classList.add('active-step');
      if (stepperContainer) stepperContainer.style.display = 'block';

      if (node1) node1.className = 'step-node completed';
      if (node2) node2.className = 'step-node active';
      if (fillLine) fillLine.style.width = '100%';

      generateParticipantForms();
    }

    // Scroll suave arriba
    window.scrollTo({ top: 120, behavior: 'smooth' });
    updateSummary();
  }

  // ==========================================
  // PASO 1: SELECCIÓN DE RECORRIDO
  // ==========================================
  function selectRoute(routeId) {
    STATE.selectedRoute = routeId;
    document.querySelectorAll('.route-card').forEach(card => {
      if (card.dataset.route === routeId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Si cambió a Espresso y tenía seleccionada categoría de equipos, reiniciar
    if (routeId === 'espresso' && STATE.categoryGroup === 'equipos') {
      STATE.categoryGroup = 'individual';
      STATE.selectedCategory = null;
    }

    if (STATE.currentStage) {
      STATE.unitPrice = STATE.currentStage.prices[routeId] || 490000;
    }

    updateSummary();
  }

  // ==========================================
  // PASO 2: RENDERIZADO Y SELECCIÓN DE CATEGORÍA
  // ==========================================
  function renderCategories() {
    const route = STATE.selectedRoute;
    const catData = CATEGORIES_DATA[route];
    const tabsContainer = document.getElementById('category-tabs-nav');
    const cardsGrid = document.getElementById('categories-cards-grid');

    if (!tabsContainer || !cardsGrid) return;

    // Configurar pestañas disponibles
    let tabsHtml = '';
    const availableGroups = [];

    if (route === 'macchiato') {
      availableGroups.push({ id: 'equipos', label: 'Equipos (4 corredores)' });
      availableGroups.push({ id: 'parejas', label: 'Parejas Mixtas' });
      availableGroups.push({ id: 'individual', label: 'Individual (Por Edad)' });
    } else {
      // Espresso no tiene equipos
      availableGroups.push({ id: 'parejas', label: 'Parejas Mixtas' });
      availableGroups.push({ id: 'individual', label: 'Individual (Por Edad)' });
    }

    if (!availableGroups.find(g => g.id === STATE.categoryGroup)) {
      STATE.categoryGroup = availableGroups[0].id;
    }

    availableGroups.forEach(g => {
      const activeClass = g.id === STATE.categoryGroup ? 'active' : '';
      tabsHtml += `<button type="button" class="cat-tab-btn ${activeClass}" data-group="${g.id}">${g.label}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    // Renderizar tarjetas del grupo seleccionado
    const currentList = catData[STATE.categoryGroup] || [];
    let cardsHtml = '';

    currentList.forEach(cat => {
      const isSelected = STATE.selectedCategory && STATE.selectedCategory.id === cat.id;
      const selectedClass = isSelected ? 'selected' : '';
      cardsHtml += `
        <div class="category-select-card ${selectedClass}" data-cat-id="${cat.id}">
          <div>
            <div class="cat-card-header">
              <span class="cat-card-title">${cat.name}</span>
              <div class="cat-radio-indicator"></div>
            </div>
            <div class="cat-card-rule">${cat.rule}</div>
            <p class="cat-card-desc">${cat.desc || ''}</p>
          </div>
        </div>
      `;
    });

    cardsGrid.innerHTML = cardsHtml;

    // Asignar eventos de tabs
    tabsContainer.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.categoryGroup = btn.dataset.group;
        STATE.selectedCategory = null;
        renderCategories();
        updateSummary();
      });
    });

    // Asignar eventos de selección de tarjeta
    cardsGrid.querySelectorAll('.category-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const catId = card.dataset.catId;
        const found = currentList.find(c => c.id === catId);
        if (found) {
          STATE.selectedCategory = found;
          cardsGrid.querySelectorAll('.category-select-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          updateSummary();
        }
      });
    });
  }

  // ==========================================
  // PASO 3: GENERACIÓN DINÁMICA DE FORMULARIOS
  // ==========================================
  function generateParticipantForms() {
    if (!STATE.selectedCategory) return;

    const count = STATE.selectedCategory.participantsCount || 1;
    const container = document.getElementById('participants-container');
    if (!container) return;

    const isPareja = STATE.selectedCategory && (STATE.selectedCategory.gender === 'MIXTO' || (STATE.selectedCategory.id && STATE.selectedCategory.id.startsWith('pareja-')));
    const isEquipo = STATE.selectedCategory && (count === 4 || (STATE.selectedCategory.id && STATE.selectedCategory.id.startsWith('equipo-')));
    const isTeamCategory = Boolean(isPareja || isEquipo);

    // Preservar datos ya ingresados si la cantidad coincide
    const oldData = STATE.participants || [];
    STATE.participants = [];

    let formsHtml = '';

    // Si es categoría de Equipos o Parejas Mixtas, agregar campo "Nombre del Equipo" antes del formulario del Corredor 1
    if (isTeamCategory) {
      const teamTitle = isEquipo ? 'Identificación del Equipo Oficial (4 Corredores)' : 'Identificación de la Pareja Mixta (2 Corredores)';
      const teamChip = isEquipo ? 'Modalidad Equipos (4)' : 'Modalidad Parejas Mixtas (2)';
      const teamPlaceholder = isEquipo ? 'Ej: Escarabajos del Café, Team Andino...' : 'Ej: Dupla Cafetera, Pareja Veloz...';

      formsHtml += `
        <div class="team-identity-card" id="card-team-name">
          <div class="team-identity-header">
            <div class="team-identity-badge">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>${teamTitle}</span>
            </div>
            <span class="team-type-chip">${teamChip}</span>
          </div>

          <div class="team-identity-body">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" for="field-team-name">
                Nombre del Equipo <span class="req">*</span>
              </label>
              <div class="team-input-wrapper">
                <input 
                  type="text" 
                  id="field-team-name" 
                  class="form-control field-teamName" 
                  placeholder="${teamPlaceholder}" 
                  value="${escapeHtml(STATE.teamName || '')}" 
                  required
                  maxlength="80"
                  autocomplete="off"
                >
                <span class="team-input-icon">👥</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const isGenesis = STATE.selectedEvent === 'genesis-coffee-ride' || !STATE.selectedEvent;

    for (let i = 0; i < count; i++) {
      const num = i + 1;
      const existing = oldData[i] || {};

      // Determinación de título y bloqueo estricto de género según modalidad
      let participantTitle = isGenesis ? 'Corredor' : `Corredor #${num}`;
      let lockedGender = null; // 'F' | 'M' | null

      if (isPareja) {
        // En Parejas Mixtas: Corredor 1 = Mujer (Femenino), Corredor 2 = Hombre (Masculino)
        if (num === 1) {
          participantTitle = 'Corredor 1 - Femenino (Mujer)';
          lockedGender = 'F';
        } else {
          participantTitle = 'Corredor 2 - Masculino (Hombre)';
          lockedGender = 'M';
        }
      } else if (isEquipo) {
        const isMale = STATE.selectedCategory.gender === 'M';
        participantTitle = `Integrante #${num} del Equipo (${isMale ? 'Masculino' : 'Femenino'})`;
        lockedGender = STATE.selectedCategory.gender;
      } else if (STATE.selectedCategory.gender === 'M' || STATE.selectedCategory.gender === 'F') {
        lockedGender = STATE.selectedCategory.gender;
      }

      const defaultGender = lockedGender || existing.gender || '';

      const ageBadgeHtml = isGenesis ? '' : `
            <div class="age-calc-badge age-badge-neutral" id="age-badge-${i}">
              Edad corte 31/Dic/2027: Pendiente
            </div>
      `;

      formsHtml += `
        <div class="participant-form-card" data-index="${i}" id="p-card-${i}">
          <div class="participant-card-header">
            <div class="participant-num-badge">
              <span class="p-number">${num}</span>
              <span class="p-title">${participantTitle}</span>
            </div>
            ${ageBadgeHtml}
          </div>

          <!-- 1. DATOS PERSONALES -->
          <div class="form-grid-row">
            <div class="form-group">
              <label class="form-label" for="p-${i}-nombres">Nombres <span class="req">*</span></label>
              <input type="text" id="p-${i}-nombres" name="nombres_p${num}" class="form-control field-nombres" placeholder="Primer y segundo nombre" value="${existing.nombres || (existing.fullName ? existing.fullName.split(' ').slice(0, -1).join(' ') : '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="p-${i}-apellidos">Apellidos <span class="req">*</span></label>
              <input type="text" id="p-${i}-apellidos" name="apellidos_p${num}" class="form-control field-apellidos" placeholder="Primer y segundo apellido" value="${existing.apellidos || (existing.fullName ? existing.fullName.split(' ').slice(-1).join(' ') : '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="p-${i}-docType">Tipo de Documento <span class="req">*</span></label>
              <select id="p-${i}-docType" name="docType_p${num}" class="form-control field-docType" required>
                <option value="">Seleccione...</option>
                <option value="CC" ${existing.docType === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
                <option value="CE" ${existing.docType === 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
                <option value="PASAPORTE" ${existing.docType === 'PASAPORTE' ? 'selected' : ''}>Pasaporte</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="p-${i}-docNumber">Número de Documento <span class="req">*</span></label>
              <input type="text" id="p-${i}-docNumber" name="docNumber_p${num}" class="form-control field-docNumber" placeholder="Número de identificación" value="${existing.docNumber || ''}" required>
            </div>
          </div>

          <div class="form-grid-row">
            <div class="form-group">
              <label class="form-label">Fecha de Nacimiento <span class="req">*</span></label>
              <input type="date" class="form-control field-birthDate" value="${existing.birthDate || ''}" required max="2009-12-31">
            </div>
            <div class="form-group">
              <label class="form-label">
                Género <span class="req">*</span>
                ${lockedGender ? `
                  <span class="gender-lock-pill" title="Requisito oficial bloqueado para esta categoría">
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    ${lockedGender === 'F' ? 'Femenino obligatorio' : 'Masculino obligatorio'}
                  </span>
                ` : ''}
              </label>
              <select class="form-control field-gender" required ${lockedGender ? `disabled data-locked-gender="${lockedGender}"` : ''}>
                ${lockedGender ? `
                  <option value="${lockedGender}" selected>${lockedGender === 'F' ? 'Femenino' : 'Masculino'}</option>
                ` : `
                  <option value="">Seleccione...</option>
                  <option value="M" ${defaultGender === 'M' ? 'selected' : ''}>Masculino</option>
                  <option value="F" ${defaultGender === 'F' ? 'selected' : ''}>Femenino</option>
                `}
              </select>
              ${lockedGender ? `<input type="hidden" class="hidden-locked-gender" value="${lockedGender}">` : ''}
            </div>
            <div class="form-group">
              <label class="form-label">Grupo y RH Sanguíneo <span class="req">*</span></label>
              <select class="form-control field-bloodType" required>
                <option value="">Seleccione...</option>
                <option value="O+" ${existing.bloodType === 'O+' ? 'selected' : ''}>O+</option>
                <option value="O-" ${existing.bloodType === 'O-' ? 'selected' : ''}>O-</option>
                <option value="A+" ${existing.bloodType === 'A+' ? 'selected' : ''}>A+</option>
                <option value="A-" ${existing.bloodType === 'A-' ? 'selected' : ''}>A-</option>
                <option value="B+" ${existing.bloodType === 'B+' ? 'selected' : ''}>B+</option>
                <option value="B-" ${existing.bloodType === 'B-' ? 'selected' : ''}>B-</option>
                <option value="AB+" ${existing.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
                <option value="AB-" ${existing.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
              </select>
            </div>
          </div>

          <div class="form-grid-row">
            <div class="form-group">
              <label class="form-label">WhatsApp de Contacto <span class="req">*</span></label>
              <input type="tel" class="form-control field-phone" placeholder="Ej: 3101234567" value="${existing.phone || ''}" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Correo Electrónico <span class="req">*</span></label>
              <input type="email" class="form-control field-email" placeholder="correo@ejemplo.com" value="${existing.email || ''}" required>
            </div>
          </div>

          <div class="form-grid-row">
            <div class="form-group">
              <label class="form-label">País de Residencia <span class="req">*</span></label>
              <input type="text" class="form-control field-country" placeholder="Colombia" value="${existing.country || 'Colombia'}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Departamento / Estado <span class="req">*</span></label>
              <input type="text" class="form-control field-department" placeholder="Quindío / Antioquia / etc." value="${existing.department || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Ciudad / Municipio <span class="req">*</span></label>
              <input type="text" class="form-control field-city" placeholder="Armenia / Medellín / etc." value="${existing.city || ''}" required>
            </div>
          </div>

          <!-- 2. INFORMACIÓN MÉDICA Y DE EMERGENCIA -->
          <div class="form-section-divider">
            <span>🛡️ Información Médica y de Emergencia</span>
          </div>

          <div class="form-grid-row">
            <div class="form-group">
              <label class="form-label">EPS o Seguro Médico <span class="req">*</span></label>
              <input type="text" class="form-control field-eps" placeholder="Nombre de EPS o Póliza" value="${existing.eps || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre Contacto de Emergencia <span class="req">*</span></label>
              <input type="text" class="form-control field-emergencyContactName" placeholder="Familiar o acompañante" value="${existing.emergencyContactName || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono de Emergencia <span class="req">*</span></label>
              <input type="tel" class="form-control field-emergencyContactPhone" placeholder="Número de contacto" value="${existing.emergencyContactPhone || ''}" required>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Alergias o Condiciones Médicas Preexistentes</label>
            <input type="text" class="form-control field-medicalNotes" placeholder="Medicamentos, alergias, o escribe 'Ninguna'" value="${existing.medicalNotes || ''}">
          </div>

          <!-- 3. TALLA DE JERSEY OFICIAL CICLISTA -->
          <div class="form-section-divider">
            <span>🚴 Talla de Jersey Oficial Ciclista</span>
          </div>

          ${STATE.genesisOption === 'vip' ? `
            <div class="jersey-vip-included-card">
              <div class="jersey-vip-badge">✨ Incluido en Experiencia VIP</div>
              <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin: 4px 0 6px 0;">Jersey Conmemorativo Oficial by Hincapie</h4>
              <p class="jersey-vip-desc">
                Tu inscripción Experiencia VIP ya incluye el Jersey Oficial Conmemorativo de alta gama. Por favor selecciona tu talla:
              </p>
              <div style="margin-top: 14px;">
                <label class="form-label" for="p-${i}-jerseySize">Talla de Jersey Oficial <span class="req">*</span></label>
                <select id="p-${i}-jerseySize" class="form-control field-jerseySize" required>
                  <option value="">Selecciona tu talla oficial...</option>
                  ${JERSEY_SIZES.map(s => `<option value="${s}" ${existing.jerseySize === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>
            </div>
          ` : `
            <div class="jersey-addon-card ${STATE.includeJersey ? 'active' : ''}" id="jersey-card-${i}">
              <div class="jersey-addon-header">
                <div class="jersey-toggle-wrapper">
                  <label class="switch-toggle" for="toggle-jersey-${i}">
                    <input type="checkbox" id="toggle-jersey-${i}" class="field-toggle-jersey" data-index="${i}" ${STATE.includeJersey ? 'checked' : ''}>
                    <span class="switch-slider"></span>
                  </label>
                  <div class="jersey-toggle-text">
                    <label for="toggle-jersey-${i}" class="jersey-toggle-title">¿Deseas incluir el Jersey Oficial Ciclista?</label>
                    <span class="jersey-toggle-desc">Jersey oficial conmemorativo Genesis Coffee Ride by Hincapie</span>
                  </div>
                </div>
                <div class="jersey-addon-price-chip">+ $ 100.000 COP</div>
              </div>

              <div class="jersey-size-picker-container" id="jersey-picker-wrap-${i}" style="${STATE.includeJersey ? 'display: block;' : 'display: none;'}">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="p-${i}-jerseySize">Talla de Jersey Oficial <span class="req">*</span></label>
                  <select id="p-${i}-jerseySize" class="form-control field-jerseySize" ${STATE.includeJersey ? 'required' : ''}>
                    <option value="">Selecciona tu talla oficial...</option>
                    ${JERSEY_SIZES.map(s => `<option value="${s}" ${existing.jerseySize === s ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          `}

          <!-- 4. TÉRMINOS Y CONSENTIMIENTO -->
          <div class="terms-checkbox-group">
            <input type="checkbox" id="terms-p-${i}" class="field-termsAccepted" ${existing.termsAccepted ? 'checked' : ''} required>
            <label for="terms-p-${i}" class="terms-text">
              He leído y acepto el reglamento oficial del Tour del Café Gran Fondo 2027, la política de tratamiento de datos y la 
              <a href="assets/clasificaciones-categorias-y-premiacion-tdc-2027.pdf" target="_blank" rel="noopener">exoneración médica y liberación de responsabilidad</a>. Certifico que la información provista es verídica. <span class="req">*</span>
            </label>
          </div>
        </div>
      `;
    }

    container.innerHTML = formsHtml;

    // Vincular toggle de jersey para Standard
    container.querySelectorAll('.field-toggle-jersey').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        STATE.includeJersey = isChecked;
        const idx = e.target.dataset.index || 0;
        const pickerWrap = document.getElementById(`jersey-picker-wrap-${idx}`);
        const jerseyCard = document.getElementById(`jersey-card-${idx}`);
        const card = document.getElementById(`p-card-${idx}`);
        const sizeSelect = card ? card.querySelector('.field-jerseySize') : null;

        if (pickerWrap) pickerWrap.style.display = isChecked ? 'block' : 'none';
        if (jerseyCard) {
          if (isChecked) jerseyCard.classList.add('active');
          else jerseyCard.classList.remove('active');
        }
        if (sizeSelect) {
          sizeSelect.required = isChecked;
          if (!isChecked) sizeSelect.value = '';
        }
        updateSummary();
      });
    });

    // Vincular listener para Nombre del Equipo en tiempo real
    const teamInput = document.getElementById('field-team-name');
    if (teamInput) {
      teamInput.addEventListener('input', (e) => {
        STATE.teamName = e.target.value.trim();
        updateSummary();
      });
    }

    // Vincular listeners de validación matemática en tiempo real
    container.querySelectorAll('.participant-form-card').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      const birthInput = card.querySelector('.field-birthDate');
      const genderSelect = card.querySelector('.field-gender');

      if (birthInput) {
        birthInput.addEventListener('change', () => validateParticipantMath(idx));
        birthInput.addEventListener('input', () => validateParticipantMath(idx));
      }
      if (genderSelect) {
        genderSelect.addEventListener('change', () => validateParticipantMath(idx));
      }

      // Validar inicialmente si ya venían datos
      if (birthInput && birthInput.value) {
        validateParticipantMath(idx);
      }
    });

    updateSummary();
  }

  // ==========================================
  // VALIDACIÓN MATEMÁTICA Y DE REGLAS EN TIEMPO REAL
  // ==========================================
  function validateParticipantMath(idx) {
    const card = document.getElementById(`p-card-${idx}`);
    if (!card) return;

    const birthInput = card.querySelector('.field-birthDate');
    if (!birthInput) return;

    const badge = document.getElementById(`age-badge-${idx}`);
    if (badge) {
      const age = calculateAge(birthInput.value);

      if (age === null) {
        badge.className = 'age-calc-badge age-badge-neutral';
        badge.textContent = 'Edad corte 31/Dic/2027: Pendiente';
      } else if (age < 18) {
        badge.className = 'age-calc-badge age-badge-warning';
        badge.textContent = `Edad calculada: ${age} años (Debe ser mayor de edad)`;
      } else {
        badge.className = 'age-calc-badge age-badge-valid';
        badge.textContent = `Edad calculada al 31/Dic/2027: ${age} años`;
      }
    }

    // Validar suma global y reglas de categoría
    checkGlobalCategoryRules();
    updateSummary();
  }

  function checkGlobalCategoryRules() {
    const cat = STATE.selectedCategory;
    const statusBox = document.getElementById('summary-math-status');
    if (!cat || !statusBox) return;

    const cards = document.querySelectorAll('.participant-form-card');
    const participantsData = [];

    cards.forEach(card => {
      const birth = card.querySelector('.field-birthDate')?.value;
      const genderSelect = card.querySelector('.field-gender');
      const hiddenGender = card.querySelector('.hidden-locked-gender');
      const gender = (genderSelect?.dataset.lockedGender || hiddenGender?.value || genderSelect?.value || '');
      participantsData.push({
        birthDate: birth,
        age: calculateAge(birth),
        gender: gender
      });
    });

    const allAgesCalculated = participantsData.every(p => p.age !== null);

    // 1. Individual
    if (cat.participantsCount === 1) {
      const p = participantsData[0];
      if (p.age === null) {
        statusBox.className = 'category-math-status math-status-valid';
        statusBox.textContent = `Regla: ${cat.rule}`;
        return;
      }

      if (p.age < (cat.minAge || 19) || p.age > (cat.maxAge || 110)) {
        statusBox.className = 'category-math-status math-status-error';
        statusBox.textContent = `⚠️ La edad calculada (${p.age} años) no cumple con el rango requerido (${cat.minAge}-${cat.maxAge} años).`;
      } else {
        statusBox.className = 'category-math-status math-status-valid';
        statusBox.textContent = `✓ Edad correcta (${p.age} años). Cumple con los requisitos de la categoría.`;
      }
      return;
    }

    // 2. Parejas Mixtas (Corredor 1 = Mujer, Corredor 2 = Hombre)
    if (cat.gender === 'MIXTO' && participantsData.length === 2) {
      const p1 = participantsData[0];
      const p2 = participantsData[1];

      // Géneros obligatorios y fijos
      if (p1.gender && p1.gender !== 'F') {
        statusBox.className = 'category-math-status math-status-error';
        statusBox.textContent = '⚠️ En Parejas Mixtas, el Corredor 1 debe ser de género Femenino (Mujer).';
        return;
      }
      if (p2.gender && p2.gender !== 'M') {
        statusBox.className = 'category-math-status math-status-error';
        statusBox.textContent = '⚠️ En Parejas Mixtas, el Corredor 2 debe ser de género Masculino (Hombre).';
        return;
      }

      if (!allAgesCalculated) {
        statusBox.className = 'category-math-status math-status-valid';
        statusBox.textContent = `Regla Parejas: Corredor 1 (Mujer) + Corredor 2 (Hombre). ${cat.rule}`;
        return;
      }

      const sumAge = p1.age + p2.age;

      if (cat.id === 'pareja-sub90') {
        if (sumAge < 90) {
          statusBox.className = 'category-math-status math-status-valid';
          statusBox.textContent = `✓ Suma combinada: ${sumAge} años. Cumple con la regla Sub-90 (< 90 años).`;
        } else {
          statusBox.className = 'category-math-status math-status-error';
          statusBox.textContent = `⚠️ Suma combinada: ${sumAge} años. Supera o iguala 90 años. Debe inscribirse en "Parejas Mixtas B (90+)".`;
        }
      } else if (cat.id === 'pareja-90mas') {
        if (sumAge >= 90) {
          statusBox.className = 'category-math-status math-status-valid';
          statusBox.textContent = `✓ Suma combinada: ${sumAge} años. Cumple con la regla 90+ (>= 90 años).`;
        } else {
          statusBox.className = 'category-math-status math-status-error';
          statusBox.textContent = `⚠️ Suma combinada: ${sumAge} años. Es menor a 90 años. Debe inscribirse en "Parejas Mixtas A (Sub-90)".`;
        }
      }
      return;
    }

    // 3. Equipos de 4
    if (cat.participantsCount === 4) {
      if (!allAgesCalculated) {
        statusBox.className = 'category-math-status math-status-valid';
        statusBox.textContent = `Regla Equipo: 4 corredores del mismo género. ${cat.rule}`;
        return;
      }

      const totalSum = participantsData.reduce((acc, curr) => acc + curr.age, 0);

      if (cat.id.endsWith('-a')) {
        // 72 a 159
        if (totalSum >= 72 && totalSum <= 159) {
          statusBox.className = 'category-math-status math-status-valid';
          statusBox.textContent = `✓ Suma combinada del equipo: ${totalSum} años. Cumple el rango de 72 a 159 años (Equipo A).`;
        } else {
          statusBox.className = 'category-math-status math-status-error';
          statusBox.textContent = `⚠️ Suma combinada: ${totalSum} años. Fuera del rango de 72 a 159 años para Equipo A.`;
        }
      } else if (cat.id.endsWith('-b')) {
        // 160+
        if (totalSum >= 160) {
          statusBox.className = 'category-math-status math-status-valid';
          statusBox.textContent = `✓ Suma combinada del equipo: ${totalSum} años. Cumple la regla de 160 años o más (Equipo B).`;
        } else {
          statusBox.className = 'category-math-status math-status-error';
          statusBox.textContent = `⚠️ Suma combinada: ${totalSum} años. Es menor a 160 años. Corresponde a Equipo A.`;
        }
      }
    }
  }

  // ==========================================
  // ACTUALIZACIÓN DEL RESUMEN Y TOTAL DE PAGO
  // ==========================================
  function updateSummary() {
    const routeNameEl = document.getElementById('summary-route-name');
    const labelInscription = document.getElementById('summary-label-inscription');
    const catNameEl = document.getElementById('summary-cat-name');
    const stageNameEl = document.getElementById('summary-stage-name');
    const unitPriceEl = document.getElementById('summary-unit-price');
    const participantsQtyEl = document.getElementById('summary-qty-participants');
    const totalAmountEl = document.getElementById('summary-total-amount');

    const rowCat = document.getElementById('row-category-name');
    const rowJersey = document.getElementById('row-jersey-addon');
    const jerseyPriceEl = document.getElementById('summary-jersey-addon-val');
    const rowTeam = document.getElementById('row-team-name');

    const rowSubtotal = document.getElementById('row-subtotal');
    const rowDiscount = document.getElementById('row-discount');
    const subtotalEl = document.getElementById('summary-subtotal-amount');
    const discountLabelEl = document.getElementById('summary-discount-label');
    const discountAmountEl = document.getElementById('summary-discount-amount');

    const btnEpayco = document.getElementById('btn-checkout-epayco');
    const btnCourtesy = document.getElementById('btn-checkout-courtesy');
    const securityBadges = document.getElementById('checkout-security-badges');

    // Requisito usuario: cambiar el texto "Recorrido" por "Inscripción" (Standard o Experiencia VIP) y retirar texto "categoría"
    if (labelInscription) {
      labelInscription.textContent = 'Inscripción:';
    }

    const isGenesis = STATE.selectedEvent === 'genesis-coffee-ride' || !STATE.selectedEvent;
    if (isGenesis) {
      const inscriptionText = STATE.genesisOption === 'vip' ? 'Experiencia VIP' : 'Standard';
      if (routeNameEl) routeNameEl.textContent = inscriptionText;
      if (rowCat) rowCat.style.display = 'none';
      if (rowTeam) rowTeam.style.display = 'none';
    } else {
      const routeDisplayName = STATE.selectedRoute === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)';
      if (routeNameEl) routeNameEl.textContent = routeDisplayName;
      if (rowCat) {
        rowCat.style.display = 'flex';
        if (catNameEl) catNameEl.textContent = STATE.selectedCategory ? STATE.selectedCategory.name : 'Por seleccionar';
      }
    }

    if (stageNameEl && STATE.currentStage) {
      stageNameEl.textContent = STATE.currentStage.name;
    }

    const count = STATE.selectedCategory ? STATE.selectedCategory.participantsCount : 1;
    if (participantsQtyEl) participantsQtyEl.textContent = `${count} Corredor(es)`;

    const unitPrice = STATE.unitPrice || 490000;
    if (unitPriceEl) unitPriceEl.textContent = formatCOP(unitPrice);

    // Jersey addon (+ $100.000 COP sólo si es Standard y se activó)
    const jerseyAddon = (STATE.genesisOption === 'standard' && STATE.includeJersey) ? STATE.jerseyPrice : 0;
    if (rowJersey) {
      if (jerseyAddon > 0) {
        rowJersey.style.display = 'flex';
        if (jerseyPriceEl) jerseyPriceEl.textContent = `+ ${formatCOP(jerseyAddon)}`;
      } else {
        rowJersey.style.display = 'none';
      }
    }

    const baseTotal = (unitPrice * count) + jerseyAddon;

    if (STATE.appliedCoupon) {
      const discountPercent = STATE.appliedCoupon.discountPercent;
      const discountAmount = Math.round(baseTotal * (discountPercent / 100));
      const finalTotal = Math.max(0, baseTotal - discountAmount);

      if (rowSubtotal) {
        rowSubtotal.style.display = 'flex';
        if (subtotalEl) subtotalEl.textContent = formatCOP(baseTotal);
      }
      if (rowDiscount) {
        rowDiscount.style.display = 'flex';
        if (discountLabelEl) discountLabelEl.textContent = `Descuento Cupón (${discountPercent}%):`;
        if (discountAmountEl) discountAmountEl.textContent = `-${formatCOP(discountAmount)}`;
      }

      if (totalAmountEl) totalAmountEl.textContent = formatCOP(finalTotal);

      // Si es cortesía 100% ($0 COP), conmutar al botón de confirmación directa
      if (finalTotal === 0 || discountPercent === 100) {
        if (btnEpayco) btnEpayco.style.display = 'none';
        if (btnCourtesy) btnCourtesy.style.display = 'flex';
        if (securityBadges) securityBadges.style.display = 'none';
      } else {
        if (btnEpayco) btnEpayco.style.display = 'flex';
        if (btnCourtesy) btnCourtesy.style.display = 'none';
        if (securityBadges) securityBadges.style.display = 'flex';
      }
    } else {
      if (rowSubtotal) rowSubtotal.style.display = 'none';
      if (rowDiscount) rowDiscount.style.display = 'none';
      if (totalAmountEl) totalAmountEl.textContent = formatCOP(baseTotal);

      if (btnEpayco) btnEpayco.style.display = 'flex';
      if (btnCourtesy) btnCourtesy.style.display = 'none';
      if (securityBadges) securityBadges.style.display = 'flex';
    }
  }

  // ==========================================
  // APLICACIÓN DE CUPÓN DE DESCUENTO
  // ==========================================
  async function applyCouponCode() {
    const input = document.getElementById('input-coupon-code');
    const feedback = document.getElementById('coupon-feedback');
    const btn = document.getElementById('btn-apply-coupon');

    if (!input || !feedback) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
      feedback.className = 'coupon-feedback error';
      feedback.textContent = 'Por favor ingresa un código de cupón.';
      feedback.style.display = 'block';
      STATE.appliedCoupon = null;
      updateSummary();
      return;
    }

    const count = STATE.selectedCategory ? STATE.selectedCategory.participantsCount : 1;
    const unitPrice = STATE.unitPrice || 490000;
    const totalAmount = unitPrice * count;

    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, totalAmount })
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        STATE.appliedCoupon = data;
        feedback.className = 'coupon-feedback success';
        feedback.textContent = data.message;
        feedback.style.display = 'block';
        showToast(data.message, false);
      } else {
        STATE.appliedCoupon = null;
        feedback.className = 'coupon-feedback error';
        feedback.textContent = data.error || 'Código no válido o inactivo.';
        feedback.style.display = 'block';
      }
    } catch (err) {
      feedback.className = 'coupon-feedback error';
      feedback.textContent = 'Error validando el cupón. Verifica tu conexión.';
      feedback.style.display = 'block';
      STATE.appliedCoupon = null;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Aplicar';
      }
      updateSummary();
    }
  }

  // ==========================================
  // CONFIRMACIÓN DIRECTA DE CORTESÍA 100%
  // ==========================================
  async function submitCourtesyRegistration() {
    const check = collectFormData();
    if (!check.valid) {
      showToast(check.errors[0] || 'Por favor completa todos los campos requeridos.', true);
      return;
    }

    if (!STATE.appliedCoupon || STATE.appliedCoupon.discountPercent !== 100) {
      showToast('No se encontró un cupón de cortesía 100% válido.', true);
      return;
    }

    const btnCourtesy = document.getElementById('btn-checkout-courtesy');
    if (btnCourtesy) {
      btnCourtesy.disabled = true;
      btnCourtesy.innerHTML = `<span>Emitiendo acreditación oficial...</span>`;
    }

    try {
      const payer = check.participants[0];
      const hasJersey = (STATE.genesisOption === 'vip') || Boolean(STATE.includeJersey);
      const jerseyPrice = (STATE.genesisOption === 'standard' && STATE.includeJersey) ? STATE.jerseyPrice : 0;

      const payload = {
        event: 'genesis-coffee-ride',
        genesisOption: STATE.genesisOption,
        couponCode: STATE.appliedCoupon.code,
        route: STATE.genesisOption,
        categoryId: STATE.selectedCategory.id,
        categoryName: STATE.selectedCategory.name,
        teamName: check.teamName || null,
        includeJersey: hasJersey,
        jerseyPrice: jerseyPrice,
        participants: check.participants,
        payerEmail: payer.email,
        payerPhone: payer.phone
      };

      const res = await fetch('/api/inscripciones/completar-cortesia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo completar el registro de cortesía.');
      }

      showToast('¡Inscripción de cortesía confirmada! Redirigiendo...', false);
      const reg = data.registration;
      setTimeout(() => {
        window.location.href = `/checkout/resultado.html?ref_payco=${encodeURIComponent(reg.refPayco)}&invoice=${encodeURIComponent(reg.invoiceNumber)}&cortesia=true`;
      }, 1000);
    } catch (err) {
      showToast(err.message, true);
      if (btnCourtesy) {
        btnCourtesy.disabled = false;
        btnCourtesy.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Confirmar Inscripción Gratuita (Cortesía 100%)
        `;
      }
    }
  }

  // ==========================================
  // RECOLECCIÓN Y VALIDACIÓN PRE-PAGO
  // ==========================================
  // (collectFormData defined above)

  // ==========================================
  // INICIAR CHECKOUT CON EPAYCO
  // ==========================================
  async function submitRegistrationToEpayco() {
    const check = collectFormData();
    if (!check.valid) {
      showToast(check.errors[0] || 'Por favor completa todos los campos requeridos.', true);
      console.warn('Errores de validación:', check.errors);
      return;
    }

    const payBtn = document.getElementById('btn-checkout-epayco');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<span>Procesando inscripción...</span>`;
    }

    try {
      const payer = check.participants[0];
      const hasJersey = (STATE.genesisOption === 'vip') || Boolean(STATE.includeJersey);
      const jerseyPrice = (STATE.genesisOption === 'standard' && STATE.includeJersey) ? STATE.jerseyPrice : 0;

      const payload = {
        event: 'genesis-coffee-ride',
        genesisOption: STATE.genesisOption,
        route: STATE.genesisOption,
        categoryId: STATE.selectedCategory.id,
        categoryName: STATE.selectedCategory.name,
        teamName: check.teamName || null,
        includeJersey: hasJersey,
        jerseyPrice: jerseyPrice,
        participants: check.participants,
        payerEmail: payer.email,
        payerPhone: payer.phone,
        couponCode: STATE.appliedCoupon ? STATE.appliedCoupon.code : null
      };

      // 1. Registrar orden pendiente en el servidor
      const prepRes = await fetch('/api/inscripciones/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const prepData = await prepRes.json();
      if (!prepData.success) {
        throw new Error(prepData.errors ? prepData.errors.join(', ') : (prepData.error || 'Error preparando la inscripción'));
      }

      const invoiceNumber = prepData.invoiceNumber;
      const totalAmount = prepData.totalAmount;
      const epaycoConfig = window.EPAYCO_CONFIG || {
        publicKey: '13eb3817ffe672d7b10376797e57a082',
        test: true,
        currency: 'cop',
        country: 'co',
        lang: 'es',
        responseUrl: window.location.origin + '/checkout/resultado.html',
        confirmationUrl: window.location.origin + '/api/epayco/confirmacion'
      };

      // Forzar estrictamente modo pruebas como booleano nativo true
      epaycoConfig.test = true;

      // 2. Configurar e invocar ePayco Checkout
      if (!window.ePayco) {
        throw new Error('La pasarela de pagos ePayco no se ha cargado. Verifica tu conexión a internet.');
      }

      const handler = window.ePayco.checkout.configure({
        key: epaycoConfig.publicKey,
        test: true // Booleano nativo explícito estricto
      });

      const optionLabel = STATE.genesisOption === 'vip' ? 'Experiencia VIP' : 'Standard';
      const jerseyText = (STATE.genesisOption === 'standard' && STATE.includeJersey) ? ' + Jersey Oficial' : (STATE.genesisOption === 'vip' ? ' (Jersey Incluido)' : '');
      const count = check.participants.length;

      // Validación y valores por defecto para datos de facturación tomados del formulario
      const payerFullName = (
        payer.nombres && payer.apellidos
          ? `${payer.nombres} ${payer.apellidos}`
          : (payer.fullName || 'Participante Tour del Café')
      ).trim();
      const billingDocType = (payer.docType || 'CC').toString().trim().toLowerCase();
      const billingDocNumber = String(payer.docNumber || '1000000000').trim();
      const billingCity = (payer.city || 'Armenia').trim();
      const billingDept = (payer.department || 'Quindío').trim();
      const billingCountry = (payer.country || 'Colombia').trim();
      const billingAddress = (
        payer.address
          ? `${payer.address}, ${billingCity}, ${billingDept}, ${billingCountry}`
          : `Calle Principal, ${billingCity}, ${billingDept}, ${billingCountry}`
      );

      const epaycoPayload = {
        name: `Genesis Coffee Ride 2027`,
        description: `Genesis Coffee Ride - ${optionLabel}${jerseyText}`,
        invoice: invoiceNumber,
        currency: (epaycoConfig.currency || 'cop').toLowerCase(),
        amount: totalAmount.toString(),
        tax_base: '0',
        tax: '0',
        country: (epaycoConfig.country || 'co').toLowerCase(),
        lang: epaycoConfig.lang || 'es',
        external: 'false', // Modal nativo dentro del portal
        test: true, // Booleano nativo explícito en el objeto data del checkout

        // Metadatos
        extra1: `Genesis Coffee Ride | ${optionLabel}`,
        extra2: `Titular: ${payerFullName} | Tel: ${payer.phone}`,
        extra3: JSON.stringify({
          type: 'registration',
          event: 'genesis-coffee-ride',
          genesisOption: STATE.genesisOption,
          invoice: invoiceNumber,
          route: STATE.genesisOption,
          category: STATE.selectedCategory.id,
          hasJersey: hasJersey,
          participantsCount: count
        }),

        confirmation: epaycoConfig.confirmationUrl,
        response: epaycoConfig.responseUrl,

        // Datos del Pagador / Titular de la inscripción
        name_billing: payerFullName,
        type_doc_billing: billingDocType,
        number_doc_billing: billingDocNumber,
        mobilephone_billing: (payer.phone || '3000000000').trim(),
        email_billing: (payer.email || 'inscripciones@tourdelcafe.co').trim(),
        address_billing: billingAddress,

        methodsDisable: []
      };

      console.log('[Inscripciones ePayco] Abriendo modal de pago Genesis:', epaycoPayload);
      handler.open(epaycoPayload);

      // Restaurar botón
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Proceder al Pago Seguro con ePayco
        `;
      }
    } catch (err) {
      console.error('Error al procesar inscripción:', err);
      showToast(err.message || 'Ocurrió un error. Por favor intenta nuevamente.', true);
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `Proceder al Pago Seguro con ePayco`;
      }
    }
  }

  // ==========================================
  // INICIALIZACIÓN Y EVENT LISTENERS
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    loadPricingStage();

    // 1. Selección de Evento
    const btnStartCoffeeRide = document.getElementById('btn-start-coffee-ride');
    if (btnStartCoffeeRide) {
      btnStartCoffeeRide.addEventListener('click', () => {
        STATE.selectedEvent = 'genesis-coffee-ride';
        goToStep(1);
      });
    }

    // Tarjetas deshabilitadas (Gran Fondo & Junior)
    document.querySelectorAll('.event-card.disabled').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Las inscripciones para este evento abrirán próximamente. ¡Sigue atento!', false);
      });
    });

    // 2. Selección de Opción Genesis (Paso 1 de 2)
    const cardStandard = document.getElementById('card-opt-standard');
    if (cardStandard) {
      cardStandard.addEventListener('click', () => selectGenesisOption('standard'));
    }

    const cardVip = document.getElementById('card-opt-vip');
    if (cardVip) {
      cardVip.addEventListener('click', () => selectGenesisOption('vip'));
    }

    // Botones de Navegación del Paso 1 (Genesis)
    const btnBackGenesisStep1 = document.getElementById('btn-back-genesis-step1');
    if (btnBackGenesisStep1) {
      btnBackGenesisStep1.addEventListener('click', () => goToStep(0));
    }

    const btnNextGenesisStep1 = document.getElementById('btn-next-genesis-step1');
    if (btnNextGenesisStep1) {
      btnNextGenesisStep1.addEventListener('click', () => goToStep(2));
    }

    // Botón Volver del Paso 2 (Formulario a Opción Genesis)
    const btnBackStep3 = document.getElementById('btn-back-step-3');
    if (btnBackStep3) {
      btnBackStep3.addEventListener('click', () => goToStep(1));
    }

    // 3. Botón ePayco
    const btnCheckoutEpayco = document.getElementById('btn-checkout-epayco');
    if (btnCheckoutEpayco) {
      btnCheckoutEpayco.addEventListener('click', submitRegistrationToEpayco);
    }

    // 4. Módulo de Cupón de Descuento
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    if (btnApplyCoupon) {
      btnApplyCoupon.addEventListener('click', applyCouponCode);
    }

    const inputCoupon = document.getElementById('input-coupon-code');
    if (inputCoupon) {
      inputCoupon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCouponCode();
        }
      });
    }

    // 5. Botón de Cortesía 100%
    const btnCheckoutCourtesy = document.getElementById('btn-checkout-courtesy');
    if (btnCheckoutCourtesy) {
      btnCheckoutCourtesy.addEventListener('click', submitCourtesyRegistration);
    }

    // 6. Detección automática por parámetros URL (Deep Linking directo a Genesis Coffee Ride)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const eventParam = urlParams.get('event');
      const optionParam = urlParams.get('option');

      if (eventParam === 'genesis' || eventParam === 'genesis-coffee-ride') {
        STATE.selectedEvent = 'genesis-coffee-ride';
        if (optionParam === 'vip') {
          selectGenesisOption('vip');
        } else if (optionParam === 'standard') {
          selectGenesisOption('standard');
        }
        goToStep(1);
      }
    } catch (err) {
      console.warn('Aviso: no fue posible leer parámetros de URL:', err);
    }
  });

})();
