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
    currentStep: 0, // 0: Evento, 1: Recorrido, 2: Categoría, 3: Corredores
    selectedEvent: 'gran-fondo',
    selectedRoute: 'macchiato', // 'macchiato' | 'espresso'
    selectedCategory: null, // ej: 'ind-m-19-30', 'pareja-sub90', 'equipo-masc-a'
    categoryGroup: 'individual', // 'individual' | 'parejas' | 'equipos'
    teamName: '', // Nombre del Equipo para Equipos (4) o Parejas Mixtas (2)
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

    // Fallback local: Etapa Chapola
    STATE.currentStage = {
      id: 'chapola',
      name: 'Etapa Chapola',
      badge: 'Tarifa Especial de Apertura',
      prices: { macchiato: 490000, espresso: 490000 },
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
    const currentPrice = stage.prices[STATE.selectedRoute] || 490000;
    STATE.unitPrice = currentPrice;
    if (priceEl) priceEl.textContent = formatCOP(currentPrice);

    updateSummary();
  }

  // ==========================================
  // CONTROL DE PASOS DEL FLUJO
  // ==========================================
  function goToStep(stepIndex) {
    if (stepIndex === 1 && !STATE.selectedEvent) {
      showToast('Selecciona el evento Tour del Café Gran Fondo para continuar.', true);
      return;
    }

    if (stepIndex === 2 && !STATE.selectedRoute) {
      showToast('Por favor selecciona un recorrido (Reto Macchiato o Reto Espresso).', true);
      return;
    }

    if (stepIndex === 3 && !STATE.selectedCategory) {
      showToast('Por favor selecciona una categoría deportiva.', true);
      return;
    }

    STATE.currentStep = stepIndex;

    // Actualizar Vistas
    document.querySelectorAll('.view-step').forEach((el, idx) => {
      if (idx === stepIndex) {
        el.classList.add('active-step');
      } else {
        el.classList.remove('active-step');
      }
    });

    // Actualizar Barra de Progreso
    const stepperContainer = document.getElementById('stepper-container');
    if (stepperContainer) {
      stepperContainer.style.display = stepIndex === 0 ? 'none' : 'block';
    }

    const stepNodes = document.querySelectorAll('.step-node');
    stepNodes.forEach((node, idx) => {
      // Step 0 es Evento, los nodos visuales 1, 2, 3 representan Recorrido, Categoría, Registro
      const logicalStep = idx + 1;
      node.classList.remove('active', 'completed');
      if (stepIndex === logicalStep) {
        node.classList.add('active');
      } else if (stepIndex > logicalStep) {
        node.classList.add('completed');
      }
    });

    const fillLine = document.getElementById('stepper-fill');
    if (fillLine) {
      if (stepIndex <= 1) fillLine.style.width = '0%';
      else if (stepIndex === 2) fillLine.style.width = '50%';
      else if (stepIndex >= 3) fillLine.style.width = '100%';
    }

    // Scroll suave arriba
    window.scrollTo({ top: 120, behavior: 'smooth' });

    // Acciones específicas por paso
    if (stepIndex === 2) {
      renderCategories();
    } else if (stepIndex === 3) {
      generateParticipantForms();
    }

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

    for (let i = 0; i < count; i++) {
      const num = i + 1;
      const existing = oldData[i] || {};

      // Determinación de título y bloqueo estricto de género según modalidad
      let participantTitle = `Corredor #${num}`;
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

      formsHtml += `
        <div class="participant-form-card" data-index="${i}" id="p-card-${i}">
          <div class="participant-card-header">
            <div class="participant-num-badge">
              <span class="p-number">${num}</span>
              <span class="p-title">${participantTitle}</span>
            </div>
            <div class="age-calc-badge age-badge-neutral" id="age-badge-${i}">
              Edad corte 31/Dic/2027: Pendiente
            </div>
          </div>

          <!-- 1. DATOS PERSONALES -->
          <div class="form-grid-row">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Nombre Completo <span class="req">*</span></label>
              <input type="text" class="form-control field-fullName" placeholder="Nombres y Apellidos completos" value="${existing.fullName || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Documento <span class="req">*</span></label>
              <select class="form-control field-docType" required>
                <option value="">Seleccione...</option>
                <option value="CC" ${existing.docType === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
                <option value="CE" ${existing.docType === 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
                <option value="PASAPORTE" ${existing.docType === 'PASAPORTE' ? 'selected' : ''}>Pasaporte</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Número de Documento <span class="req">*</span></label>
              <input type="text" class="form-control field-docNumber" placeholder="Número de identificación" value="${existing.docNumber || ''}" required>
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

          <!-- 3. SELECCIÓN DEPORTIVA -->
          <div class="form-section-divider">
            <span>🚴 Talla de Jersey Oficial Ciclista</span>
          </div>

          <div class="form-grid-row">
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label">Talla de Jersey Oficial <span class="req">*</span></label>
              <select class="form-control field-jerseySize" required>
                <option value="">Selecciona tu talla oficial...</option>
                ${JERSEY_SIZES.map(s => `<option value="${s}" ${existing.jerseySize === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>

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
    const badge = document.getElementById(`age-badge-${idx}`);
    if (!birthInput || !badge) return;

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
    const catNameEl = document.getElementById('summary-cat-name');
    const stageNameEl = document.getElementById('summary-stage-name');
    const unitPriceEl = document.getElementById('summary-unit-price');
    const participantsQtyEl = document.getElementById('summary-qty-participants');
    const totalAmountEl = document.getElementById('summary-total-amount');

    const rowSubtotal = document.getElementById('row-subtotal');
    const rowDiscount = document.getElementById('row-discount');
    const subtotalEl = document.getElementById('summary-subtotal-amount');
    const discountLabelEl = document.getElementById('summary-discount-label');
    const discountAmountEl = document.getElementById('summary-discount-amount');

    const btnEpayco = document.getElementById('btn-checkout-epayco');
    const btnCourtesy = document.getElementById('btn-checkout-courtesy');
    const securityBadges = document.getElementById('checkout-security-badges');

    const routeDisplayName = STATE.selectedRoute === 'macchiato' ? 'Reto Macchiato (127 km)' : 'Reto Espresso (115 km)';
    if (routeNameEl) routeNameEl.textContent = routeDisplayName;

    if (catNameEl) {
      catNameEl.textContent = STATE.selectedCategory ? STATE.selectedCategory.name : 'Por seleccionar';
    }

    // Reflejar Nombre del Equipo / Pareja en el resumen
    const rowTeam = document.getElementById('row-team-name');
    const teamNameEl = document.getElementById('summary-team-name');
    const isPareja = STATE.selectedCategory && (STATE.selectedCategory.gender === 'MIXTO' || (STATE.selectedCategory.id && STATE.selectedCategory.id.startsWith('pareja-')));
    const isEquipo = STATE.selectedCategory && (STATE.selectedCategory.participantsCount === 4 || (STATE.selectedCategory.id && STATE.selectedCategory.id.startsWith('equipo-')));
    if (rowTeam && teamNameEl) {
      if (isPareja || isEquipo) {
        rowTeam.style.display = 'flex';
        teamNameEl.textContent = STATE.teamName ? STATE.teamName : 'Por diligenciar';
      } else {
        rowTeam.style.display = 'none';
      }
    }

    if (stageNameEl && STATE.currentStage) {
      stageNameEl.textContent = STATE.currentStage.name;
    }

    const count = STATE.selectedCategory ? STATE.selectedCategory.participantsCount : 1;
    if (participantsQtyEl) participantsQtyEl.textContent = `${count} Corredor(es)`;

    const unitPrice = STATE.unitPrice || 490000;
    if (unitPriceEl) unitPriceEl.textContent = formatCOP(unitPrice);

    const baseTotal = unitPrice * count;

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
      const payload = {
        couponCode: STATE.appliedCoupon.code,
        route: STATE.selectedRoute,
        categoryId: STATE.selectedCategory.id,
        categoryName: STATE.selectedCategory.name,
        teamName: check.teamName || null,
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
  function collectFormData() {
    const cards = document.querySelectorAll('.participant-form-card');
    const participants = [];
    const errors = [];
    const cat = STATE.selectedCategory;

    if (!cat) {
      return { valid: false, errors: ['Por favor selecciona una categoría oficial.'], participants: [], teamName: null };
    }

    // Modalidad Equipos o Parejas Mixtas
    const isPareja = cat.gender === 'MIXTO' || (cat.id && cat.id.startsWith('pareja-'));
    const isEquipo = cat.participantsCount === 4 || (cat.id && cat.id.startsWith('equipo-'));
    const isTeamCategory = Boolean(isPareja || isEquipo);

    let teamName = '';
    if (isTeamCategory) {
      const teamInput = document.getElementById('field-team-name');
      teamName = (teamInput?.value || STATE.teamName || '').trim();
      if (!teamName) {
        errors.push(isEquipo
          ? 'Por favor ingresa el Nombre del Equipo para los 4 integrantes.'
          : 'Por favor ingresa el Nombre del Equipo para la Pareja Mixta.');
      } else {
        STATE.teamName = teamName;
      }
    }

    cards.forEach((card, idx) => {
      const num = idx + 1;
      const fullName = card.querySelector('.field-fullName')?.value.trim();
      const docType = card.querySelector('.field-docType')?.value;
      const docNumber = card.querySelector('.field-docNumber')?.value.trim();
      const birthDate = card.querySelector('.field-birthDate')?.value;
      const genderSelect = card.querySelector('.field-gender');
      const hiddenGender = card.querySelector('.hidden-locked-gender');
      const gender = (genderSelect?.dataset.lockedGender || hiddenGender?.value || genderSelect?.value || '');
      const bloodType = card.querySelector('.field-bloodType')?.value;
      const phone = card.querySelector('.field-phone')?.value.trim();
      const email = card.querySelector('.field-email')?.value.trim();
      const country = card.querySelector('.field-country')?.value.trim();
      const department = card.querySelector('.field-department')?.value.trim();
      const city = card.querySelector('.field-city')?.value.trim();
      const eps = card.querySelector('.field-eps')?.value.trim();
      const emergencyContactName = card.querySelector('.field-emergencyContactName')?.value.trim();
      const emergencyContactPhone = card.querySelector('.field-emergencyContactPhone')?.value.trim();
      const medicalNotes = card.querySelector('.field-medicalNotes')?.value.trim();
      const jerseySize = card.querySelector('.field-jerseySize')?.value;
      const termsAccepted = card.querySelector('.field-termsAccepted')?.checked;

      if (!fullName) errors.push(`Participante #${num}: Falta el nombre completo.`);
      if (!docType) errors.push(`Participante #${num}: Selecciona el tipo de documento.`);
      if (!docNumber) errors.push(`Participante #${num}: Falta el número de documento.`);
      if (!birthDate) errors.push(`Participante #${num}: Falta la fecha de nacimiento.`);
      if (!gender) errors.push(`Participante #${num}: Selecciona el género.`);
      if (!bloodType) errors.push(`Participante #${num}: Selecciona el grupo y RH sanguíneo.`);
      if (!phone) errors.push(`Participante #${num}: Falta el número de WhatsApp.`);
      if (!email || !email.includes('@')) errors.push(`Participante #${num}: Ingrese un correo electrónico válido.`);
      if (!eps) errors.push(`Participante #${num}: Ingrese su EPS o seguro médico.`);
      if (!emergencyContactName || !emergencyContactPhone) errors.push(`Participante #${num}: Ingrese el contacto de emergencia completo.`);
      if (!jerseySize) errors.push(`Participante #${num}: Seleccione la talla de Jersey oficial.`);
      if (!termsAccepted) errors.push(`Participante #${num}: Debe aceptar el reglamento y exoneración médica.`);

      const age = calculateAge(birthDate);
      if (age !== null && age < 18) {
        errors.push(`Participante #${num}: Debe ser mayor de edad al corte del evento.`);
      }

      participants.push({
        fullName,
        docType,
        docNumber,
        birthDate,
        gender,
        bloodType,
        phone,
        email,
        country: country || 'Colombia',
        department: department || '',
        city: city || '',
        eps,
        emergencyContactName,
        emergencyContactPhone,
        medicalNotes: medicalNotes || 'Ninguna',
        jerseySize,
        termsAccepted: Boolean(termsAccepted),
        calculatedAge2027: age,
        teamName: isTeamCategory ? teamName : null
      });
    });

    // Validaciones de regla de categoría
    if (cat.participantsCount === 1) {
      const p = participants[0];
      if (p && p.calculatedAge2027) {
        if (p.calculatedAge2027 < cat.minAge || p.calculatedAge2027 > cat.maxAge) {
          errors.push(`La edad (${p.calculatedAge2027} años) no corresponde al rango de la categoría (${cat.minAge}-${cat.maxAge} años).`);
        }
      }
    } else if (cat.gender === 'MIXTO' && participants.length === 2) {
      const g1 = participants[0].gender;
      const g2 = participants[1].gender;
      if (g1 !== 'F') {
        errors.push('En Parejas Mixtas, el Corredor 1 debe ser mujer (género Femenino).');
      }
      if (g2 !== 'M') {
        errors.push('En Parejas Mixtas, el Corredor 2 debe ser hombre (género Masculino).');
      }
      const sum = (participants[0].calculatedAge2027 || 0) + (participants[1].calculatedAge2027 || 0);
      if (cat.id === 'pareja-sub90' && sum >= 90) {
        errors.push(`La suma combinada (${sum} años) excede los 89 años para la categoría Sub-90.`);
      } else if (cat.id === 'pareja-90mas' && sum < 90) {
        errors.push(`La suma combinada (${sum} años) es menor a 90 años para la categoría 90+.`);
      }
    } else if (cat.participantsCount === 4) {
      const expected = cat.gender;
      const notMatching = participants.filter(p => p.gender !== expected);
      if (notMatching.length > 0) {
        errors.push(`Todos los 4 corredores deben ser de género ${expected === 'M' ? 'Masculino' : 'Femenino'}.`);
      }
      const sum = participants.reduce((acc, p) => acc + (p.calculatedAge2027 || 0), 0);
      if (cat.id.endsWith('-a') && (sum < 72 || sum > 159)) {
        errors.push(`La suma combinada del equipo (${sum} años) debe estar entre 72 y 159 años para Equipo A.`);
      } else if (cat.id.endsWith('-b') && sum < 160) {
        errors.push(`La suma combinada del equipo (${sum} años) debe ser de 160 años en adelante para Equipo B.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      participants,
      teamName: isTeamCategory ? teamName : null
    };
  }

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
      const payload = {
        route: STATE.selectedRoute,
        categoryId: STATE.selectedCategory.id,
        categoryName: STATE.selectedCategory.name,
        teamName: check.teamName || null,
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

      const routeLabel = STATE.selectedRoute === 'macchiato' ? 'Reto Macchiato 127K' : 'Reto Espresso 115K';
      const count = check.participants.length;
      const teamSuffix = check.teamName ? ` | Equipo: ${check.teamName}` : '';

      // Validación y valores por defecto para datos de facturación tomados del formulario
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
        name: `Inscripción Tour del Café Gran Fondo 2027`,
        description: `${routeLabel} - ${STATE.selectedCategory.name}${teamSuffix} (${count} corredor/es)`,
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
        extra1: `${STATE.selectedCategory.name}${teamSuffix} | ${routeLabel}`,
        extra2: `Titular: ${payer.fullName} | Tel: ${payer.phone}`,
        extra3: JSON.stringify({
          type: 'registration',
          invoice: invoiceNumber,
          route: STATE.selectedRoute,
          category: STATE.selectedCategory.id,
          teamName: check.teamName || null,
          participantsCount: count
        }),

        confirmation: epaycoConfig.confirmationUrl,
        response: epaycoConfig.responseUrl,

        // Datos del Pagador / Titular de la inscripción
        name_billing: (payer.fullName || 'Participante Tour del Café').trim(),
        type_doc_billing: billingDocType,
        number_doc_billing: billingDocNumber,
        mobilephone_billing: (payer.phone || '3000000000').trim(),
        email_billing: (payer.email || 'inscripciones@tourdelcafe.co').trim(),
        address_billing: billingAddress,

        methodsDisable: []
      };

      console.log('[Inscripciones ePayco] Abriendo modal de pago:', epaycoPayload);
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
    const btnStartGf = document.getElementById('btn-start-gran-fondo');
    if (btnStartGf) {
      btnStartGf.addEventListener('click', () => {
        STATE.selectedEvent = 'gran-fondo';
        goToStep(1);
      });
    }

    // Tarjetas deshabilitadas (Junior)
    document.querySelectorAll('.event-card.disabled').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Las inscripciones para este evento abrirán próximamente. ¡Sigue atento!', false);
      });
    });

    // 2. Selección de Recorrido
    document.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', () => {
        selectRoute(card.dataset.route);
      });
    });

    // 3. Botones de Navegación entre Pasos
    const btnNextStep1 = document.getElementById('btn-next-step-1');
    if (btnNextStep1) {
      btnNextStep1.addEventListener('click', () => goToStep(2));
    }

    const btnBackStep1 = document.getElementById('btn-back-step-1');
    if (btnBackStep1) {
      btnBackStep1.addEventListener('click', () => goToStep(0));
    }

    const btnNextStep2 = document.getElementById('btn-next-step-2');
    if (btnNextStep2) {
      btnNextStep2.addEventListener('click', () => {
        if (!STATE.selectedCategory) {
          showToast('Por favor selecciona una categoría antes de continuar.', true);
          return;
        }
        goToStep(3);
      });
    }

    const btnBackStep2 = document.getElementById('btn-back-step-2');
    if (btnBackStep2) {
      btnBackStep2.addEventListener('click', () => goToStep(1));
    }

    const btnBackStep3 = document.getElementById('btn-back-step-3');
    if (btnBackStep3) {
      btnBackStep3.addEventListener('click', () => goToStep(2));
    }

    // 4. Botón ePayco
    const btnCheckoutEpayco = document.getElementById('btn-checkout-epayco');
    if (btnCheckoutEpayco) {
      btnCheckoutEpayco.addEventListener('click', submitRegistrationToEpayco);
    }

    // 5. Módulo de Cupón de Descuento
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

    // 6. Botón de Cortesía 100%
    const btnCheckoutCourtesy = document.getElementById('btn-checkout-courtesy');
    if (btnCheckoutCourtesy) {
      btnCheckoutCourtesy.addEventListener('click', submitCourtesyRegistration);
    }
  });

})();
