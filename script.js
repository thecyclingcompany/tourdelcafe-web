/**
 * Tour del Café - World's Coffee & Cycling Festival
 * Interacciones de Interfaz Inmersiva (Paso 3)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Configuración de Elementos DOM
  const header = document.querySelector('.main-header');
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const dropdownItems = document.querySelectorAll('.nav-item');

  // ==========================================
  // NAVBAR TRANSICIÓN ON SCROLL
  // ==========================================
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // Inicializar estado del scroll por si cargan a mitad de página
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  // ==========================================
  // MENÚ MÓVIL FULL-SCREEN (DRAWER & OVERFLOW LOCK)
  // ==========================================
  if (hamburger && navMenu) {
    const closeMenu = () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      dropdownItems.forEach(item => item.classList.remove('active'));
    };

    hamburger.addEventListener('click', () => {
      const isActive = hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');

      if (isActive) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    });

    // Cerrar menú móvil al dar clic en cualquier enlace navegable
    const allMenuLinks = navMenu.querySelectorAll('a[href]');
    allMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        // En móviles, si no es el trigger desplegable del dropdown, cerrar el drawer
        if (!link.classList.contains('has-dropdown') || window.innerWidth >= 992) {
          closeMenu();
        }
      });
    });

    // Cerrar al dar clic en el fondo oscuro fuera del contenido del menú
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    });

    // Cerrar y restaurar overflow si el usuario rota o redimensiona a escritorio
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992 && navMenu.classList.contains('active')) {
        closeMenu();
      }
    }, { passive: true });
  }

  // ==========================================
  // SUBMENÚS Y MEGA MENÚ (MÓVIL / TAPS)
  // ==========================================
  dropdownItems.forEach(item => {
    const trigger = item.querySelector('.nav-link.has-dropdown');

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        // Ejecutar comportamiento solo en móviles/pantallas menores a 992px
        if (window.innerWidth < 992) {
          e.preventDefault();
          e.stopPropagation();

          const parent = trigger.parentElement;
          const isCurrentlyActive = parent.classList.contains('active');

          // Cerrar otros menús abiertos
          dropdownItems.forEach(otherItem => {
            if (otherItem !== parent) {
              otherItem.classList.remove('active');
            }
          });

          // Toggle del menú actual
          parent.classList.toggle('active');
        }
      });
    }
  });

  // Cerrar submenús si se da click afuera de la barra
  document.addEventListener('click', (e) => {
    if (window.innerWidth >= 992) return;
    if (!header.contains(e.target)) {
      dropdownItems.forEach(item => item.classList.remove('active'));
    }
  });

  // ==========================================
  // COUNTDOWN TIMER (FEBRERO 18, 2027)
  // ==========================================
  const targetDate = new Date('February 18, 2027 08:00:00').getTime();
  const countdownWidget = document.querySelector('.countdown-widget');

  if (countdownWidget) {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        countdownWidget.innerHTML = '<div class="countdown-value" style="font-size: 1.25rem;">¡EL FESTIVAL HA COMENZADO!</div>';
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const dEl = document.getElementById('days');
      const hEl = document.getElementById('hours');
      const mEl = document.getElementById('minutes');
      const sEl = document.getElementById('seconds');

      if (dEl) dEl.innerText = String(days).padStart(2, '0');
      if (hEl) hEl.innerText = String(hours).padStart(2, '0');
      if (mEl) mEl.innerText = String(minutes).padStart(2, '0');
      if (sEl) sEl.innerText = String(seconds).padStart(2, '0');
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // ==========================================
  // INTERSECTION OBSERVER FOR SCROLLYTELLING & REVEALS
  // ==========================================

  // 1. Scrollytelling de Alta Precisión (Manifiesto & Pilares)
  const scrollyCards = document.querySelectorAll('.scrolly-card');
  const scrollyImages = document.querySelectorAll('.scrolly-img');

  if (scrollyCards.length && scrollyImages.length) {
    let currentActivePilar = null;

    function activatePilar(targetPilar) {
      if (currentActivePilar === targetPilar) return;
      currentActivePilar = targetPilar;

      scrollyCards.forEach(card => {
        if (card.getAttribute('data-pilar') === targetPilar) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      scrollyImages.forEach(img => {
        if (img.getAttribute('data-pilar') === targetPilar) {
          img.classList.add('active');
        } else {
          img.classList.remove('active');
        }
      });
    }

    // Inicializar de inmediato en el Pilar 0
    activatePilar('0');

    // Controlador de proximidad focal en tiempo real (60 FPS sin lag)
    let isTicking = false;
    function updateScrollytelling() {
      const focalPoint = window.innerHeight * 0.45; // Punto de atención visual
      let bestPilar = '0';
      let minDistance = Infinity;

      scrollyCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + (rect.height * 0.4);
        const distance = Math.abs(cardCenter - focalPoint);

        // Si la tarjeta está visible o dentro del rango del viewport
        if (rect.bottom > 60 && rect.top < window.innerHeight) {
          if (distance < minDistance) {
            minDistance = distance;
            bestPilar = card.getAttribute('data-pilar');
          }
        }
      });

      if (minDistance !== Infinity) {
        activatePilar(bestPilar);
      }
      isTicking = false;
    }

    window.addEventListener('scroll', () => {
      if (!isTicking) {
        window.requestAnimationFrame(updateScrollytelling);
        isTicking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!isTicking) {
        window.requestAnimationFrame(updateScrollytelling);
        isTicking = true;
      }
    }, { passive: true });

    // Ejecutar chequeo al cargar
    setTimeout(updateScrollytelling, 100);
  }

  // 2. Reveal on Scroll general
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  if (revealElements.length) {
    const revealObserverOptions = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, revealObserverOptions);

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ==========================================
  // COFFEE RIDES - RENDER & FILTER (PASO 5)
  // ==========================================
  const renderCoffeeRides = () => {
    const ridesGrid = document.getElementById('rides-grid');
    const countryButtons = document.querySelectorAll('.country-tab');
    const cityButtons = document.querySelectorAll('.ride-tab');
    const rideCards = document.querySelectorAll('.rides-grid .ride-card');
    const rideDetailSections = document.querySelectorAll('.ride-detail-section');
    const coffeeRidesSection = document.getElementById('coffee-rides');

    if (!coffeeRidesSection) return;

    const filterCoffeeRides = (country = 'colombia', city = 'all') => {
    if (!ridesGrid) return;
    
    let visibleCount = 0;
    
    rideCards.forEach(card => {
      const cardCountry = card.getAttribute('data-country');
      const cardCity = card.getAttribute('data-city');
      
      const countryMatch = (country === 'colombia' && cardCountry === 'colombia') ||
                           (country === 'internacional' && cardCountry === 'internacional');
                           
      const cityMatch = (city === 'all') || (cardCity === city);
      
      if (countryMatch && cityMatch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const existingMsg = ridesGrid.querySelector('.no-rides-msg');
    if (visibleCount === 0) {
      if (!existingMsg) {
        const msg = document.createElement('p');
        msg.className = 'body-main no-rides-msg';
        msg.style.cssText = 'grid-column: 1/-1; text-align: center; color: rgba(250,250,250,0.6);';
        msg.textContent = 'No hay rodadas programadas para esta región por el momento.';
        ridesGrid.appendChild(msg);
      }
    } else if (existingMsg) {
      existingMsg.remove();
    }
  };

  const updateFilters = (country) => {
    cityButtons.forEach(btn => {
      const btnCountry = btn.getAttribute('data-country');
      const btnCity = btn.getAttribute('data-city');
      
      if (btnCity === 'all') {
        btn.classList.add('active');
        btn.style.display = '';
      } else if (btnCountry === country) {
        btn.style.display = '';
        btn.classList.remove('active');
      } else {
        btn.style.display = 'none';
        btn.classList.remove('active');
      }
    });
    
    filterCoffeeRides(country, 'all');
  };

  // Inicializar filtros con Colombia por defecto
  updateFilters('colombia');

  // Listeners para pestañas de país
  countryButtons.forEach(button => {
    button.addEventListener('click', () => {
      countryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const country = button.getAttribute('data-country');
      
      ridesGrid.style.opacity = '0';
      setTimeout(() => {
        updateFilters(country);
        ridesGrid.style.opacity = '1';
      }, 200);
    });
  });

  // Listeners para pestañas de ciudades
  cityButtons.forEach(button => {
    button.addEventListener('click', () => {
      cityButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const countryActive = document.querySelector('.country-tab.active').getAttribute('data-country');
      const cityValue = button.getAttribute('data-city');

      ridesGrid.style.opacity = '0';
      setTimeout(() => {
        filterCoffeeRides(countryActive, cityValue);
        ridesGrid.style.opacity = '1';
      }, 200);
    });
  });

  // ==========================================
  // LÓGICA DE NAVEGACIÓN Y DETALLES INDIVIDUALES
  // ==========================================
  
  const showRideDetail = (rideId) => {
    if (!coffeeRidesSection) return;
    
    // Activar modo detalle en la sección
    coffeeRidesSection.classList.add('detail-active');
    
    // Activar sección detallada específica y ocultar las demás
    rideDetailSections.forEach(section => {
      if (section.id === `ride-detail-${rideId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
    
    // Scroll suave hasta el encabezado de Coffee Rides
    setTimeout(() => {
      coffeeRidesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const showRideGrid = () => {
    if (!coffeeRidesSection) return;
    
    // Desactivar modo detalle en la sección
    coffeeRidesSection.classList.remove('detail-active');
    
    // Ocultar todas las secciones detalladas
    rideDetailSections.forEach(section => {
      section.classList.remove('active');
    });
    
    // Scroll suave hasta el encabezado de Coffee Rides
    setTimeout(() => {
      coffeeRidesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Escuchar el botón de regresar
  document.querySelectorAll('.ride-detail-back-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = '#coffee-rides';
    });
  });

  // Manejar Hash de la URL para navegación directa
  const handleRideHash = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#ride-detail-')) {
      const rideId = hash.replace('#ride-detail-', '');
      showRideDetail(rideId);
    } else if (hash === '#coffee-rides') {
      showRideGrid();
    }
  };

    window.addEventListener('hashchange', handleRideHash);
    window.addEventListener('load', handleRideHash);
    if (window.location.hash) {
      handleRideHash();
    }
  };

  // ==========================================
  // GRAN FONDO - TABS DASHBOARD (PASO 6)
  // ==========================================

  // 1. Navegación por pestañas (Tabs)
  const initGranFondoTabs = () => {
    const gfTabs = document.querySelectorAll('.gf-tab');
    const gfPanels = document.querySelectorAll('.gf-tab-panel');

    if (!gfTabs.length || !gfPanels.length) return;

    gfTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTabId = tab.getAttribute('data-tab');

        // Activar tab
        gfTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Activar panel
        gfPanels.forEach(panel => {
          if (panel.id === targetTabId) {
            panel.classList.add('active-panel');
            // Si el panel contiene videos (como animacion-trofeo-tcc.mp4 en tab-categorias), iniciar reproducción segura
            const panelVideos = panel.querySelectorAll('video');
            panelVideos.forEach(v => {
              v.muted = true;
              v.defaultMuted = true;
              v.volume = 0;
              v.playsInline = true;
              requestAnimationFrame(() => {
                const p = v.play();
                if (p !== undefined) {
                  p.catch(err => console.warn('Autoplay en panel de pestaña prevenido:', err));
                }
              });
            });
          } else {
            panel.classList.remove('active-panel');
          }
        });
      });
    });

    // Manejador de navegación bidireccional desde links externos/dropdowns
    const handleTabNavigation = (hash) => {
      if (!hash) return;

      const hashToTabMap = {
        '#acerca-gf': 'tab-acerca-gf',
        '#acerca-del-gf': 'tab-acerca-gf',
        '#categorias': 'tab-categorias',
        '#recorridos': 'tab-recorridos',
        '#que-incluye': 'tab-kit',
        '#kit': 'tab-kit', // compatibilidad
        '#experiencias-vip': 'tab-vip',
        '#roasters-expo': 'tab-expo',
        '#expo': 'tab-expo',
        '#hoteleria': 'tab-hoteles',
        '#hoteles': 'tab-hoteles', // compatibilidad
        '#invitados-vip': 'tab-invitados',
        '#vip': 'tab-invitados' // compatibilidad
      };

      const targetTabId = hashToTabMap[hash];
      if (!targetTabId) return;

      const tabButton = document.querySelector(`.gf-tab[data-tab="${targetTabId}"]`);
      if (tabButton) {
        tabButton.click();

        if (hash === '#vip' || hash === '#invitados-vip') {
          setTimeout(() => {
            const vipSection = document.getElementById('vip-grid');
            if (vipSection) {
              vipSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 250);
        } else {
          const gfSection = document.getElementById('gran-fondo');
          if (gfSection) {
            gfSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    // Interceptar clicks de enlaces dropdown del menú
    document.querySelectorAll('.dropdown-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          handleTabNavigation(href);
        }
      });
    });

    // Manejo de hash inicial en URL
    if (window.location.hash) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          handleTabNavigation(window.location.hash);
        }, 500);
      });
    }
  };

  // 2. Renderizar VIP / Embajadores
  const renderVIP = () => {
    const vipGrid = document.getElementById('vip-grid');
    if (!vipGrid) return;

    const vips = (window.eventData && window.eventData.invitadosVIP) || [];
    vipGrid.innerHTML = '';

    vips.forEach(vip => {
      const card = document.createElement('div');
      card.className = 'vip-card';
      card.innerHTML = `
        <div class="vip-img-container">
          <div class="vip-img-placeholder">
            <img src="assets/icono-invitados-vip.png" alt="Próximamente" class="vip-placeholder-icon">
          </div>
        </div>
        <div class="vip-info">
          <h4 class="vip-name">Próximamente</h4>
          <div class="vip-rol">${vip.rol}</div>
          <p class="vip-achievement">${vip.resenaCorta}</p>
        </div>
      `;
      vipGrid.appendChild(card);
    });
  };

  // ==========================================
  // LÓGICA DE MODAL INTERACTIVO PREMIUM
  // ==========================================
  const modal = document.getElementById('rider-modal');
  const modalBody = modal ? modal.querySelector('.modal-body') : null;
  const modalCloseBtn = modal ? modal.querySelector('.modal-close') : null;
  const bgLayer = modal ? modal.querySelector('.modal-bg-layer') : null;

  const openRiderModal = (riderId) => {
    if (!modal || !modalBody) return;
    const vips = (window.eventData && window.eventData.invitadosVIP) || [];
    const vip = vips.find(v => v.id === riderId);
    if (!vip) return;

    // Foto de carrera como fondo principal de la capa de fondo
    if (bgLayer) {
      bgLayer.style.backgroundImage = `linear-gradient(180deg, rgba(18, 18, 18, 0.5) 0%, rgba(18, 18, 18, 0.85) 70%, #121212 100%), url('${vip.fotoCarrera}')`;
    }

    // Inyectar datos dinámicos en la modal
    modalBody.innerHTML = `
      <div class="modal-grid">
        <div class="modal-sidebar">
          <div class="modal-profile-wrapper">
            <img src="${vip.fotoPerfil}" alt="${vip.nombre}" class="modal-profile-img" loading="lazy">
          </div>
          <h3 class="modal-rider-name">${vip.nombre}</h3>
          <span class="modal-rider-role">${vip.rol}</span>
        </div>
        <div class="modal-main">
          <div class="modal-bio-section">
            <h4 class="modal-section-title">Biografía</h4>
            <p class="modal-bio-text">${vip.biografiaCompleta}</p>
          </div>
          <div class="modal-logros-section">
            <h4 class="modal-section-title">Logros y Palmarés</h4>
            <ul class="modal-logros-list">
              ${vip.logros.map(logro => `
                <li>
                  <span class="logro-icon">⚡</span>
                  <span class="logro-text">${logro}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    // Abrir modal y deshabilitar scroll de la página principal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeRiderModal = () => {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Escuchar el clic en los botones "Ver más" por delegación de eventos
  const vipGridElement = document.getElementById('vip-grid');
  if (vipGridElement) {
    vipGridElement.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-ver-mas');
      if (btn) {
        const riderId = btn.getAttribute('data-id');
        openRiderModal(riderId);
      }
    });
  }

  // Listener para cerrar modal al hacer clic en el botón (X)
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeRiderModal);
  }

  // Cerrar modal al hacer clic en el fondo oscuro
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeRiderModal();
      }
    });
  }

  // Cerrar modal con la tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRiderModal();
    }
  });

  // 3. Renderizar Recorridos Toggle
  const renderGranFondoRecorrido = (type = 'gran-fondo') => {
    const detailContainer = document.getElementById('recorrido-details');
    const dashboardContainer = document.getElementById('cycling-dashboard');
    const altimetryImg = document.getElementById('altimetria-img-view');
    const altimetrySpecs = document.getElementById('altimetry-specs');
    const hotspotsContainer = document.getElementById('altimetria-hotspots');
    const highlightOverlay = document.getElementById('challenge-segment-highlight');

    if (!detailContainer) return;

    const recorridos = (window.eventData && window.eventData.granFondoRecorridos) || [];
    const route = recorridos.find(r => r.id === type);

    if (!route) return;

    const isGF = type === 'gran-fondo';

    // 1. Actualizar Dashboard de Métricas (8 Métricas con íconos dedicados)
    if (dashboardContainer) {
      dashboardContainer.className = `cycling-dashboard-grid ${isGF ? 'gf-route-dashboard' : 'mf-route-dashboard'}`;

      const metrics = [
        { label: 'Distancia Total', value: route.distancia, icon: 'assets/icono-distancia.png' },
        { label: 'Puntos de Apoyo', value: route.puntosApoyoCount, icon: 'assets/icono-puntos-de-apoyo.png' },
        { label: 'Altitud Ganada', value: route.desnivel, icon: 'assets/icono-altura-ganada.png' },
        { label: 'Tiempo Máximo', value: route.tiempoMaximo, icon: 'assets/icono-tiempo-maximo.png' },
        { label: 'Altitud Mínima', value: route.altitudMinima, icon: 'assets/icono-altitud-minima.png' },
        { label: 'Altitud Máxima', value: route.altitudMaxima, icon: 'assets/icono-altitud-maxima.png' },
        { label: 'PM Challenge', value: route.pmChallengeCount, icon: 'assets/icono-pm-challenge.png' },
        { label: 'Sprint Challenge', value: route.sprintChallengeCount, icon: 'assets/icono-sprint-challenge.png' }
      ];

      dashboardContainer.innerHTML = metrics.map(m => `
        <div class="cycling-metric-card">
          <img src="${m.icon}" alt="${m.label}" class="cycling-metric-icon-img">
          <span class="cycling-metric-value">${m.value}</span>
          <span class="cycling-metric-label">${m.label}</span>
        </div>
      `).join('');
    }

    // Helper para parsear los servicios de Puntos de Apoyo a íconos circulares limpios (sin texto ni km badge)
    const parseServices = (nombre) => {
      const services = [];
      if (nombre.includes('Hidratación')) {
        services.push({ name: 'Hidratación', icon: 'assets/icono-hidratacion.png' });
      }
      if (nombre.includes('Alimentación')) {
        services.push({ name: 'Alimentación', icon: 'assets/icono-alimentacion.png' });
      }
      if (nombre.includes('Mecánica') || nombre.includes('Mecanica')) {
        services.push({ name: 'Mecánica', icon: 'assets/icono-mecanica.png' });
      }
      if (nombre.includes('Coffee Point')) {
        services.push({ name: 'Coffee Point', icon: 'assets/icono-coffee-point.png' });
      }
      return services.map(s => `
        <div class="service-icon-only" title="${s.name}">
          <img src="${s.icon}" alt="${s.name}">
        </div>
      `).join('');
    };

    // 2. Actualizar Detalles e Hitos de Ruta
    detailContainer.innerHTML = `
      <h3 class="route-title">${route.nombre}</h3>
      <p class="body-main" style="color: rgba(250, 250, 250, 0.75); margin-bottom: 24px;">
        Explora la ficha técnica y los puntos de control clave de la ruta oficial del festival. Pasa el cursor por cada hito para previsualizarlo en la altimetría.
      </p>

      <h4 class="route-points-title">Hitos y Puntos Clave:</h4>
      <ul class="hito-list" id="hito-list-ul">
        ${route.hitos.map(hito => {
      const isHydration = hito.tipo === 'hydration';
      const cleanName = hito.nombre.replace(/\s*\(.*?\)\s*/g, '');
      return `
            <li class="hito-item" data-id="${hito.id}">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; width: 100%;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex-grow: 1;">
                  <span class="hito-badge ${hito.tipo}">${hito.tipo === 'climb' ? 'PM' : hito.tipo === 'sprint' ? 'SC' : 'Apoyo'}</span>
                  <span class="hito-km">${hito.kilometro}</span>
                  <span class="hito-name">${cleanName}</span>
                </div>
                ${isHydration ? `<div class="hito-services" style="margin-top: 0; display: flex; gap: 6px;">${parseServices(hito.nombre)}</div>` : ''}
              </div>
            </li>
          `;
    }).join('')}
      </ul>

      <div style="margin-top: 30px; display: flex; gap: 16px;">
        <a href="${route.gpxUrl}" class="btn-primary">Descargar GPX / Strava</a>
      </div>
    `;

    // Mapa unificado de coordenadas para los hitos de las altimetrías (Medio Fondo y Gran Fondo)
    // Desde aquí puedes ajustar de forma centralizada la posición horizontal (xOffset) y la altura (y) de cada círculo.
    const altimetryCoordinatesMap = {
      'gran-fondo': {
        // km: { xOffset: desvío_horizontal_en_X, y: posicion_vertical_en_Y }
        0: { xOffset: -2.0, y: 60 },
        6.8: { xOffset: -1.5, y: 50 },
        24.8: { xOffset: -0.5, y: 68 },
        38.3: { xOffset: 0.0, y: 70 },
        38.5: { xOffset: 0.0, y: 70 },
        63.6: { xOffset: 2.0, y: 80 },
        79.3: { xOffset: 1.0, y: 80 },
        83.5: { xOffset: 2.6, y: 60 },
        84.0: { xOffset: 2.0, y: 60 },
        84: { xOffset: 2.0, y: 60 },
        108.7: { xOffset: 4.0, y: 64 },
        113.6: { xOffset: 4.0, y: 60 }
      },
      'medio-fondo': {
        0: { xOffset: -2.0, y: 60 },
        6.8: { xOffset: -1.5, y: 50 },
        24.8: { xOffset: -0.5, y: 68 },
        38.3: { xOffset: 1.0, y: 70 },
        38.5: { xOffset: 1.0, y: 70 },
        63.6: { xOffset: 2.0, y: 75 },
        97.2: { xOffset: 4.0, y: 64 },
        102.1: { xOffset: 4.5, y: 60 }
      }
    };

    // Función helper para obtener las coordenadas X e Y relativas a la imagen de altimetría considerando márgenes
    const getCoordinates = (km) => {
      const kmTotal = route.kmTotal;
      // Coordenada base X en porcentaje, asumiendo inicio en 8.0% y ancho activo de 85%
      let x = 8.0 + (km / kmTotal) * 85.0;

      const config = altimetryCoordinatesMap[route.id] && altimetryCoordinatesMap[route.id][km];

      // Aplicar corrección horizontal si está definida
      if (config && config.xOffset !== undefined) {
        x += config.xOffset;
      }

      // Obtener coordenada vertical Y (porcentaje desde arriba) o 50% por defecto
      const y = (config && config.y) !== undefined ? config.y : 50;

      return { x, y };
    };

    // 3. Actualizar Visor de Altimetría
    if (altimetryImg) {
      altimetryImg.src = isGF ? 'assets/altimetria-gran-fondo.png' : 'assets/altimetria-medio-fondo.png';
    }

    if (altimetrySpecs) {
      altimetrySpecs.innerText = isGF
        ? 'Pendiente máxima: 14% • Pendiente media: 6.2% • Altitud Max: 1.790 m.s.n.m'
        : 'Pendiente máxima: 11% • Pendiente media: 5.5% • Altitud Max: 1.790 m.s.n.m';
    }

    // 4. Renderizar Hotspots
    if (hotspotsContainer) {
      let hotspotsHtml = '';
      route.hitos.forEach(h => {
        if (h.kmFin !== null && h.kmFin !== undefined) {
          // Desafío de segmento: Renderizar nodo inicial y final
          const startCoords = getCoordinates(h.kmInicio);
          const endCoords = getCoordinates(h.kmFin);

          hotspotsHtml += `
            <div class="altimetria-hotspot type-${h.tipo}" style="left: ${startCoords.x}%; top: ${startCoords.y}%;" data-id="${h.id}" data-node="start"></div>
            <div class="altimetria-hotspot type-${h.tipo}" style="left: ${endCoords.x}%; top: ${endCoords.y}%;" data-id="${h.id}" data-node="end"></div>
          `;
        } else {
          // Hito de punto: Renderizar hotspot único
          const coords = getCoordinates(h.kmInicio);

          hotspotsHtml += `
            <div class="altimetria-hotspot type-${h.tipo}" style="left: ${coords.x}%; top: ${coords.y}%;" data-id="${h.id}"></div>
          `;
        }
      });
      hotspotsContainer.innerHTML = hotspotsHtml;
    }

    // Ocultar overlay al renderizar de nuevo
    if (highlightOverlay) {
      highlightOverlay.style.opacity = '0';
      highlightOverlay.className = 'challenge-segment-highlight';
    }

    // 5. Configurar Interacción Bidireccional
    const hitoItems = document.querySelectorAll('.hito-item');
    const hotspots = document.querySelectorAll('.altimetria-hotspot');
    const altimetriaContainer = document.querySelector('.altimetria-container');

    const activateHitoAndHotspot = (id) => {
      const activeHito = route.hitos.find(h => h.id === id);
      if (!activeHito) return;

      // 1. Activar Hito en la lista
      hitoItems.forEach(item => {
        if (item.getAttribute('data-id') === id) {
          item.classList.add('hito-active');
        } else {
          item.classList.remove('hito-active');
        }
      });

      const hitoListEl = document.getElementById('hito-list-ul');
      if (hitoListEl) {
        hitoListEl.classList.add('has-active-item');
      }

      // 2. Activar Hotspots relacionados
      hotspots.forEach(hs => {
        if (hs.getAttribute('data-id') === id) {
          hs.classList.add('active');
        } else {
          hs.classList.remove('active');
        }
      });

      if (altimetriaContainer) {
        altimetriaContainer.classList.add('has-active-hotspot');
      }

      // 3. Mostrar Resaltado de Segmento si aplica
      if (highlightOverlay && activeHito.kmFin !== null && activeHito.kmFin !== undefined) {
        const startCoords = getCoordinates(activeHito.kmInicio);
        const endCoords = getCoordinates(activeHito.kmFin);
        const left = startCoords.x;
        const width = endCoords.x - startCoords.x;
        highlightOverlay.style.left = `${left}%`;
        highlightOverlay.style.width = `${width}%`;
        highlightOverlay.className = `challenge-segment-highlight active-highlight ${activeHito.tipo === 'climb' ? 'climb-highlight' : 'sprint-highlight'}`;
        highlightOverlay.style.opacity = '1';
      } else if (highlightOverlay) {
        highlightOverlay.style.opacity = '0';
        highlightOverlay.className = 'challenge-segment-highlight';
      }
    };

    const clearActiveState = () => {
      hitoItems.forEach(item => item.classList.remove('hito-active'));
      const hitoListEl = document.getElementById('hito-list-ul');
      if (hitoListEl) {
        hitoListEl.classList.remove('has-active-item');
      }
      hotspots.forEach(hs => hs.classList.remove('active'));
      if (altimetriaContainer) {
        altimetriaContainer.classList.remove('has-active-hotspot');
      }
      if (highlightOverlay) {
        highlightOverlay.style.opacity = '0';
        highlightOverlay.className = 'challenge-segment-highlight';
      }
    };

    // Añadir listeners para Hitos de la Lista
    hitoItems.forEach(item => {
      const id = item.getAttribute('data-id');

      item.addEventListener('mouseenter', () => {
        activateHitoAndHotspot(id);
      });

      item.addEventListener('mouseleave', () => {
        clearActiveState();
      });
    });

    // Añadir listeners para Hotspots sobre la imagen
    hotspots.forEach(hs => {
      const id = hs.getAttribute('data-id');

      hs.addEventListener('mouseenter', () => {
        activateHitoAndHotspot(id);
        const correspondingHito = document.querySelector(`.hito-item[data-id="${id}"]`);
        if (correspondingHito) {
          correspondingHito.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      hs.addEventListener('mouseleave', () => {
        clearActiveState();
      });
    });
  };

  // Inicializar toggle de recorridos
  const initRouteToggle = () => {
    const toggleButtons = document.querySelectorAll('.route-toggle-btn');
    if (!toggleButtons.length) return;

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        toggleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const routeType = btn.getAttribute('data-route');
        const detailWrap = document.querySelector('.recorridos-wrapper');

        if (detailWrap) {
          detailWrap.style.opacity = '0.3';
          setTimeout(() => {
            renderGranFondoRecorrido(routeType);
            detailWrap.style.opacity = '1';
          }, 200);
        }
      });
    });
  };

  // 4. Renderizar Hoteles Bike Friendly & Oficiales
  let currentHotelGroup = 'urbana';

  const renderHoteles = (targetGroup = currentHotelGroup) => {
    const hotelesGrid = document.getElementById('hoteles-grid');
    if (!hotelesGrid) return;

    currentHotelGroup = targetGroup;
    const hoteles = (window.eventData && window.eventData.hotelesAliados) || [];
    const filteredHoteles = targetGroup ? hoteles.filter(h => h.grupo === targetGroup) : hoteles;

    hotelesGrid.innerHTML = '';

    filteredHoteles.forEach(hotel => {
      let ratingStars = '';
      if (hotel.estrellas === 3.5) {
        ratingStars = '★★★☆';
      } else {
        ratingStars = '★'.repeat(hotel.estrellas) + '☆'.repeat(Math.max(0, 5 - hotel.estrellas));
      }

      const card = document.createElement('div');
      card.className = 'hotel-card';
      card.innerHTML = `
        <div class="hotel-media">
          <img src="${hotel.imagen}" alt="${hotel.nombre}" class="hotel-img" loading="lazy">
          <span class="hotel-distance-badge" title="Distancia al evento">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            ${hotel.distancia}
          </span>
        </div>
        
        <div class="hotel-body">
          <div class="hotel-header">
            <h4 class="hotel-name">${hotel.nombre}</h4>
            <div class="hotel-category-row">
              <span class="hotel-category-tag">${hotel.categoria}</span>
              <span class="hotel-stars" title="${hotel.estrellas} estrellas">${ratingStars}</span>
            </div>
          </div>

          <div class="hotel-info-section">
            <div class="hotel-info-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Distancia del Evento
            </div>
            <p class="hotel-info-text"><strong>${hotel.distancia}</strong> del Centro Metropolitano de Convenciones</p>
          </div>

          <div class="hotel-info-section">
            <div class="hotel-info-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
              Alimentación / Desayuno
            </div>
            <p class="hotel-info-text">${hotel.alimentacion}</p>
          </div>

          <div class="hotel-info-section">
            <div class="hotel-info-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
              Servicios &amp; Conectividad
            </div>
            <p class="hotel-info-text">${hotel.servicios}</p>
          </div>

          <div class="hotel-booking-code-box">
            <span class="hotel-code-label">Código de Reserva</span>
            <span class="hotel-code-badge">Próximamente</span>
          </div>

          <div class="hotel-contact-actions">
            <a href="${hotel.web}" target="_blank" rel="noopener" class="hotel-btn-web" title="Visitar ${hotel.webTexto}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              ${hotel.webTexto}
            </a>
            <a href="${hotel.telefonoLink}" class="hotel-btn-tel" title="Contactar a ${hotel.telefono}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${hotel.telefono}
            </a>
          </div>
        </div>
      `;
      hotelesGrid.appendChild(card);
    });
  };

  const initHotelesSubTabs = () => {
    const hotelTabs = document.querySelectorAll('.hotel-sub-tab');
    if (!hotelTabs.length) return;

    hotelTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        hotelTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const group = tab.getAttribute('data-group');
        renderHoteles(group);
      });
    });
  };

  // 5. Alternar sub-categorías de premiación (Gran Fondo / Medio Fondo)
  const initCategoriasSubTabs = () => {
    const subTabs = document.querySelectorAll('.cat-sub-tab');
    const subPanels = document.querySelectorAll('.cat-sub-panel');

    if (!subTabs.length || !subPanels.length) return;

    subTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remover clase activa de las pestañas y añadir a la actual
        subTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Alternar paneles de contenido
        const targetRoute = tab.getAttribute('data-route');
        subPanels.forEach(panel => {
          if (panel.id === `cat-panel-${targetRoute}`) {
            panel.classList.add('active-panel');
          } else {
            panel.classList.remove('active-panel');
          }
        });
      });
    });
  };

  // 5b. Alternar sub-pestañas de Roasters Lounge / Expo Tour del Café
  const initExpoSubTabs = () => {
    const expoBtns = document.querySelectorAll('.expo-tab-btn');
    const panelRoasters = document.getElementById('panel-roasters-lounge');
    const panelExpo = document.getElementById('panel-expo-tdc');

    if (!expoBtns.length || !panelRoasters || !panelExpo) return;

    expoBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        expoBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.getAttribute('data-expo-target');
        if (target === 'roasters') {
          panelRoasters.style.display = 'block';
          panelRoasters.classList.add('active-panel');
          panelExpo.style.display = 'none';
          panelExpo.classList.remove('active-panel');
        } else {
          panelExpo.style.display = 'block';
          panelExpo.classList.add('active-panel');
          panelRoasters.style.display = 'none';
          panelRoasters.classList.remove('active-panel');
        }
      });
    });
  };

  // Interactive Kit section handling
  const initKitInteractive = () => {
    const benefitItems = document.querySelectorAll('.kit-benefit-item');
    const kitMediaImg = document.getElementById('kit-media-img');
    const kitMediaText = document.getElementById('kit-media-text');

    if (!benefitItems.length || !kitMediaImg || !kitMediaText) return;

    // Preload the jersey posterior image for lag-free hover switch
    const preloadPosterior = new Image();
    preloadPosterior.src = 'assets/jersey-tdc-gf-posterior.png';

    const dataMap = {
      'antes': {
        color: '#a58a64',
        type: 'image',
        src: 'assets/incluye-pre-gf.png'
      },
      'durante': {
        color: '#92ba20',
        type: 'image',
        src: 'assets/incluye-durante-gf.png'
      },
      'despues': {
        color: '#e42a32',
        type: 'image',
        src: 'assets/incluye-post-gf.png'
      },
      'medalla': {
        color: '#d25400',
        type: 'image',
        src: 'assets/medalla-tdc-gf-2027.png'
      },
      'jersey': {
        color: '#d25400',
        type: 'image',
        src: 'assets/jersey-tdc-gf-anterior.png'
      }
    };

    const setActiveBenefit = (benefitKey) => {
      const config = dataMap[benefitKey];
      if (!config) return;

      // Update benefit items active class and dynamic variables
      benefitItems.forEach(item => {
        const key = item.getAttribute('data-benefit');
        if (key === benefitKey) {
          item.classList.add('active');
          item.style.setProperty('--benefit-glow-color', config.color);
        } else {
          item.classList.remove('active');
          item.style.removeProperty('--benefit-glow-color');
        }
      });

      // Handle media container styling dynamically (no border for images, styled box for text)
      const mediaContainer = kitMediaImg.parentElement;
      if (mediaContainer) {
        mediaContainer.style.transition = 'box-shadow 0.3s ease, border 0.3s ease, background-color 0.3s ease';
        if (config.type === 'image') {
          mediaContainer.style.border = 'none';
          mediaContainer.style.boxShadow = 'none';
          mediaContainer.style.background = 'transparent';
        } else {
          mediaContainer.style.border = `1px solid ${config.color}`;
          mediaContainer.style.boxShadow = `0 15px 30px rgba(0,0,0,0.4), 0 0 20px ${config.color}40`;
          mediaContainer.style.background = 'rgba(255, 255, 255, 0.02)';
        }
      }

      // Smooth fade-out/fade-in transitions
      kitMediaImg.style.opacity = '0';
      kitMediaText.style.opacity = '0';

      setTimeout(() => {
        if (config.type === 'image') {
          kitMediaImg.src = config.src;
          kitMediaImg.style.display = 'block';
          kitMediaText.style.display = 'none';
          
          // Force a reflow for transition to kick in
          kitMediaImg.offsetHeight;
          kitMediaImg.style.opacity = '1';
        } else {
          kitMediaImg.style.display = 'none';
          kitMediaText.textContent = config.text;
          kitMediaText.style.display = 'block';
          kitMediaText.style.color = config.color;
          
          // Force a reflow for transition to kick in
          kitMediaText.offsetHeight;
          kitMediaText.style.opacity = '1';
        }
      }, 150);
    };

    // Attach click events to benefit items
    benefitItems.forEach(item => {
      item.addEventListener('click', () => {
        const key = item.getAttribute('data-benefit');
        setActiveBenefit(key);
      });
    });

    // Hover effect: when cursor is over the image and it is 'jersey', switch to posterior image
    kitMediaImg.addEventListener('mouseenter', () => {
      const activeItem = document.querySelector('.kit-benefit-item.active');
      if (activeItem && activeItem.getAttribute('data-benefit') === 'jersey') {
        kitMediaImg.src = 'assets/jersey-tdc-gf-posterior.png';
      }
    });

    kitMediaImg.addEventListener('mouseleave', () => {
      const activeItem = document.querySelector('.kit-benefit-item.active');
      if (activeItem && activeItem.getAttribute('data-benefit') === 'jersey') {
        kitMediaImg.src = 'assets/jersey-tdc-gf-anterior.png';
      }
    });

    // Initialize with the first item
    setActiveBenefit('antes');
  };

  // Inicializar submódulos
  initGranFondoTabs();
  renderCoffeeRides();
  renderVIP();
  renderGranFondoRecorrido('gran-fondo');
  initRouteToggle();
  renderHoteles('urbana');
  initHotelesSubTabs();
  initCategoriasSubTabs();
  initExpoSubTabs();
  initKitInteractive();

  // Exponer a nivel global para pruebas y compatibilidad
  if (typeof window !== 'undefined') {
    window.initGranFondoTabs = initGranFondoTabs;
    window.renderCoffeeRides = renderCoffeeRides;
  }

  // ==========================================
  // MAPA INTERACTIVO - IMPACTO SOCIAL (RIDE TO THE ORIGINS)
  // ==========================================
  const initImpactoSocialMap = () => {
    const familyCards = document.querySelectorAll('.family-item-card');
    const hotspots = document.querySelectorAll('.map-hotspot-group');
    const mapSvg = document.getElementById('colombia-interactive-svg');

    if (!familyCards.length || !hotspots.length || !mapSvg) return;

    // Helper functions to clear all active states
    const clearActiveStates = () => {
      familyCards.forEach(card => card.classList.remove('active-card'));
      hotspots.forEach(hotspot => hotspot.classList.remove('active-hotspot'));
      mapSvg.classList.remove('active-map');
    };

    // 1. Interactions from Family Cards to Map Hotspots
    familyCards.forEach(card => {
      const familyId = card.getAttribute('data-family');
      
      card.addEventListener('mouseenter', () => {
        clearActiveStates();
        card.classList.add('active-card');
        mapSvg.classList.add('active-map');
        
        const matchingHotspot = document.querySelector(`.map-hotspot-group[data-family="${familyId}"]`);
        if (matchingHotspot) {
          matchingHotspot.classList.add('active-hotspot');
        }
      });

      card.addEventListener('mouseleave', () => {
        clearActiveStates();
      });
    });

    // 2. Interactions from Map Hotspots to Family Cards
    hotspots.forEach(hotspot => {
      const familyId = hotspot.getAttribute('data-family');

      hotspot.addEventListener('mouseenter', () => {
        clearActiveStates();
        hotspot.classList.add('active-hotspot');
        mapSvg.classList.add('active-map');

        const matchingCard = document.querySelector(`.family-item-card[data-family="${familyId}"]`);
        if (matchingCard) {
          matchingCard.classList.add('active-card');
        }
      });

      hotspot.addEventListener('mouseleave', () => {
        clearActiveStates();
      });
    });
  };

  // ==========================================
  // INTERACTIVE HOSPITALITY VIP
  // ==========================================
  const initHospitalityInteractive = () => {
    const perks = document.querySelectorAll('.hospitality-perks li');
    const previewImg = document.getElementById('hospitality-preview-img');
    
    if (!perks.length || !previewImg) return;
    
    perks.forEach(perk => {
      perk.addEventListener('mouseenter', () => {
        // Remove active class from all perks
        perks.forEach(p => p.classList.remove('active'));
        // Add active class to hovered perk
        perk.classList.add('active');
        
        // Change image source and alt with smooth transition
        const newSrc = perk.getAttribute('data-image');
        const newAlt = perk.textContent.trim();
        
        if (newSrc && previewImg.getAttribute('src') !== newSrc) {
          previewImg.style.opacity = '0';
          setTimeout(() => {
            previewImg.src = newSrc;
            previewImg.alt = newAlt;
            previewImg.style.opacity = '1';
          }, 150);
        }
      });
    });
    
    // Set first item active on load
    if (perks[0]) {
      perks[0].classList.add('active');
      const initialSrc = perks[0].getAttribute('data-image');
      if (initialSrc) {
        previewImg.src = initialSrc;
      }
    }
  };

  initHospitalityInteractive();
  initImpactoSocialMap();

  // ==========================================
  // B2B MODALS AND REGISTRATION FORMS (EXPO & ROASTERS)
  // ==========================================
  const initB2BModals = () => {
    const btnOpenExpo = document.querySelectorAll('.btn-open-modal-expo');
    const btnOpenRoasters = document.querySelectorAll('.btn-open-modal-roasters');
    const modalExpo = document.getElementById('modal-b2b-expo');
    const modalRoasters = document.getElementById('modal-b2b-roasters');
    const modalSuccess = document.getElementById('modal-b2b-success');
    const summaryBox = document.getElementById('b2b-summary-box');
    const closeButtons = document.querySelectorAll('.b2b-modal-close, #btn-close-b2b-success');

    if (!modalExpo || !modalRoasters) return;

    // Helper: open a modal
    const openModal = (modal) => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    // Helper: close all B2B modals
    const closeAllB2BModals = () => {
      modalExpo.classList.remove('active');
      modalRoasters.classList.remove('active');
      modalSuccess.classList.remove('active');
      document.body.style.overflow = '';
    };

    // Attach open triggers for Expo
    btnOpenExpo.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(modalExpo);
      });
    });

    // Attach open triggers for Roasters
    btnOpenRoasters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(modalRoasters);
      });
    });

    // Attach close triggers
    closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeAllB2BModals();
      });
    });

    // Close on backdrop overlay click
    const b2bOverlays = document.querySelectorAll('.b2b-modal-overlay');
    b2bOverlays.forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeAllB2BModals();
        }
      });
    });

    // Close on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllB2BModals();
      }
    });

    // Validations: Individual Field Check
    const validateField = (input) => {
      const formGroup = input.closest('.b2b-form-group');
      if (!formGroup) return true;

      let isValid = true;

      if (input.required) {
        if (input.type === 'radio') {
          const name = input.name;
          const checkedRadio = formGroup.querySelector(`input[name="${name}"]:checked`);
          isValid = !!checkedRadio;
        } else if (input.value.trim() === '') {
          isValid = false;
        }
      }

      if (isValid && input.type === 'email' && input.value.trim() !== '') {
        const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
        isValid = emailRegex.test(input.value.trim());
      }

      if (isValid) {
        formGroup.classList.remove('has-error');
      } else {
        formGroup.classList.add('has-error');
      }

      return isValid;
    };

    // Live clean errors logic
    const setupLiveValidation = (form) => {
      const inputs = form.querySelectorAll('.b2b-form-control, input[type="radio"], input[type="checkbox"]');
      inputs.forEach(input => {
        const eventType = input.tagName === 'SELECT' || input.type === 'radio' || input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
          validateField(input);
        });
      });
    };

    const formExpo = document.getElementById('form-expositores') || document.getElementById('form-b2b-expositores');
    const formRoaster = document.getElementById('form-tostadores') || document.getElementById('form-b2b-tostadores');

    if (formExpo) {
      setupLiveValidation(formExpo);
      formExpo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = formExpo.querySelectorAll('.b2b-form-control, input[name="espacio_stand"], input[name="space_requirement"]');
        let isFormValid = true;

        inputs.forEach(input => {
          const isInputValid = validateField(input);
          if (!isInputValid) isFormValid = false;
        });

        if (!isFormValid) {
          return;
        }

        const submitBtn = formExpo.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : 'Solicitar Cotización de Espacio';

        // Cambia el estado del botón de envío a "Enviando solicitud..." y deshabilítalo temporalmente
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Enviando solicitud...';
        }

        // Limpiar mensajes previos de error
        const prevError = formExpo.querySelector('.b2b-form-error-banner');
        if (prevError) prevError.remove();

        // Extraer valores de los campos
        const checkedSpace = formExpo.querySelector('input[name="espacio_stand"]:checked, input[name="space_requirement"]:checked');
        const fullnameInput = document.getElementById('b2b-expo-fullname') || formExpo.querySelector('[name="nombre_contacto"]');
        const emailInput = document.getElementById('b2b-expo-email') || formExpo.querySelector('[name="email"]');
        const phoneInput = document.getElementById('b2b-expo-phone') || formExpo.querySelector('[name="telefono"]');
        const companyInput = document.getElementById('b2b-expo-company') || formExpo.querySelector('[name="empresa"]');
        const sectorInput = document.getElementById('b2b-expo-sector') || formExpo.querySelector('[name="sector"]');

        const fullname = fullnameInput ? fullnameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const company = companyInput ? companyInput.value.trim() : '';
        const sector = sectorInput ? sectorInput.value : '';
        const space = checkedSpace ? checkedSpace.value : '3x3 metros';

        // Crear FormData para el envío
        const formData = new FormData(formExpo);
        formData.set('nombre_contacto', fullname);
        formData.set('email', email);
        formData.set('telefono', phone);
        formData.set('empresa', company);
        formData.set('sector', sector);
        formData.set('espacio_stand', space);

        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwz1k6QiAHYx0nYtpsHbJjMnVVfRT8w3MD5KwfXVj5TNG404q-yuLuZa_YeaUeHjRwn/exec';

        try {
          const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
          });

          // Si la respuesta es exitosa:
          // Muestra un mensaje visual elegante de confirmación
          if (summaryBox) {
            summaryBox.innerHTML = `
              <div class="summary-item"><strong>Tipo:</strong> <span>Reserva Espacio Expo</span></div>
              <div class="summary-item"><strong>Empresa:</strong> <span>${company}</span></div>
              <div class="summary-item"><strong>Contacto:</strong> <span>${fullname}</span></div>
              <div class="summary-item"><strong>Sector:</strong> <span>${sector}</span></div>
              <div class="summary-item"><strong>Espacio:</strong> <span>${space}</span></div>
              <div class="summary-item"><strong>Correo:</strong> <span>${email}</span></div>
              <div class="summary-item"><strong>Teléfono:</strong> <span>${phone}</span></div>
            `;
          }

          const successMsgEl = document.getElementById('b2b-success-msg');
          if (successMsgEl) {
            successMsgEl.textContent = '¡Solicitud recibida con éxito! Nuestro equipo comercial se comunicará contigo en breve.';
          }

          // Limpia los campos del formulario
          formExpo.reset();

          // Cierra modal de expositores y abre modal de confirmación
          if (modalExpo) modalExpo.classList.remove('active');
          if (modalSuccess) openModal(modalSuccess);

        } catch (error) {
          console.error('Error al enviar formulario de expositores:', error);
          // Si ocurre un error, muestra un mensaje amigable indicando que intente de nuevo
          const errorBanner = document.createElement('div');
          errorBanner.className = 'b2b-form-error-banner';
          errorBanner.style.cssText = 'background: rgba(231, 76, 60, 0.15); border: 1px solid rgba(231, 76, 60, 0.4); color: #ff6b6b; padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 15px; text-align: center;';
          errorBanner.innerText = 'Ocurrió un error al enviar tu solicitud. Por favor intenta de nuevo.';
          if (submitBtn) {
            formExpo.insertBefore(errorBanner, submitBtn);
          } else {
            formExpo.appendChild(errorBanner);
          }
        } finally {
          // Restablece el botón
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
          }
        }
      });
    }

    if (formRoaster) {
      setupLiveValidation(formRoaster);
      formRoaster.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = formRoaster.querySelectorAll('.b2b-form-control');
        let isFormValid = true;

        inputs.forEach(input => {
          const isInputValid = validateField(input);
          if (!isInputValid) isFormValid = false;
        });

        if (!isFormValid) {
          return;
        }

        const submitBtn = formRoaster.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : 'Enviar Solicitud';

        // Deshabilita temporalmente el botón de envío y cambia el texto a "Enviando..."
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Enviando...';
        }

        // Limpiar mensaje de error previo si existe
        const prevError = formRoaster.querySelector('.b2b-form-error-banner');
        if (prevError) prevError.remove();

        const fullname = (document.getElementById('b2b-roaster-fullname') || formRoaster.querySelector('[name="nombre_contacto"]'))?.value.trim() || '';
        const company = (document.getElementById('b2b-roaster-company') || formRoaster.querySelector('[name="empresa"]'))?.value.trim() || '';
        const country = (document.getElementById('b2b-roaster-country') || formRoaster.querySelector('[name="pais"]'))?.value.trim() || '';
        const state = (document.getElementById('b2b-roaster-state') || formRoaster.querySelector('[name="estado"]'))?.value.trim() || '';
        const city = (document.getElementById('b2b-roaster-city') || formRoaster.querySelector('[name="ciudad"]'))?.value.trim() || '';
        const email = (document.getElementById('b2b-roaster-email') || formRoaster.querySelector('[name="email"]'))?.value.trim() || '';
        const phone = (document.getElementById('b2b-roaster-phone') || formRoaster.querySelector('[name="telefono"]'))?.value.trim() || '';

        // Campos solicitados para tostadores (soporte para selecciones múltiples o únicas)
        const coffeeType = (document.getElementById('b2b-roaster-coffee-type') || formRoaster.querySelector('[name="tipo_cafe"]'))?.value.trim() || '';
        const profiles = (document.getElementById('b2b-roaster-profiles') || formRoaster.querySelector('[name="perfiles_deseados"]'))?.value.trim() || '';
        
        const selectedPresentations = Array.from(formRoaster.querySelectorAll('input[name="presentacion_cafe"]:checked')).map(cb => cb.value);
        const presentation = selectedPresentations.length > 0 ? selectedPresentations.join(', ') : ((document.getElementById('b2b-roaster-presentation') || formRoaster.querySelector('[name="presentacion_cafe"]'))?.value || '');

        const selectedProcesses = Array.from(formRoaster.querySelectorAll('input[name="proceso_interes"]:checked')).map(cb => cb.value);
        const process = selectedProcesses.length > 0 ? selectedProcesses.join(', ') : ((document.getElementById('b2b-roaster-process') || formRoaster.querySelector('[name="proceso_interes"]'))?.value || '');

        const selectedQualities = Array.from(formRoaster.querySelectorAll('input[name="rango_calidad"]:checked')).map(cb => cb.value);
        const quality = selectedQualities.length > 0 ? selectedQualities.join(', ') : ((document.getElementById('b2b-roaster-quality') || formRoaster.querySelector('[name="rango_calidad"]'))?.value || '');

        const consumption = (document.getElementById('b2b-roaster-consumption') || formRoaster.querySelector('[name="consumo_anual_kg"]'))?.value.trim() || '';

        const formData = new FormData(formRoaster);
        formData.set('nombre_contacto', fullname);
        formData.set('empresa', company);
        formData.set('pais', country);
        formData.set('estado', state);
        formData.set('ciudad', city);
        formData.set('email', email);
        formData.set('telefono', phone);
        formData.set('tipo_cafe', coffeeType);
        formData.set('perfiles_deseados', profiles);
        formData.set('presentacion_cafe', presentation);
        formData.set('proceso_interes', process);
        formData.set('rango_calidad', quality);
        formData.set('consumo_anual_kg', consumption);

        const ROASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7j3X45s3BFR6K1NVQuCvX0JCqKzbnTUwIBF_thXGlthCQra34uA462PF-fXzO-8H_lQ/exec';

        try {
          const response = await fetch(ROASTER_SCRIPT_URL, {
            method: 'POST',
            body: formData
          });

          // Al recibir confirmación exitosa:
          // Muestra el mensaje: "¡Solicitud enviada con éxito! Nuestro equipo se pondrá en contacto contigo."
          const successMsgEl = document.getElementById('b2b-success-msg');
          if (successMsgEl) {
            successMsgEl.textContent = '¡Solicitud enviada con éxito! Nuestro equipo se pondrá en contacto contigo.';
          }

          if (summaryBox) {
            summaryBox.innerHTML = `
              <div class="summary-item"><strong>Tipo:</strong> <span>Reserva Espacio Roasters Lounge</span></div>
              <div class="summary-item"><strong>Empresa:</strong> <span>${company}</span></div>
              <div class="summary-item"><strong>País de Origen:</strong> <span>${country}</span></div>
              ${state ? `<div class="summary-item"><strong>Estado / Provincia:</strong> <span>${state}</span></div>` : ''}
              <div class="summary-item"><strong>Ciudad:</strong> <span>${city}</span></div>
              <div class="summary-item"><strong>Contacto:</strong> <span>${fullname}</span></div>
              <div class="summary-item"><strong>Correo:</strong> <span>${email}</span></div>
              <div class="summary-item"><strong>Teléfono:</strong> <span>${phone}</span></div>
              ${coffeeType ? `<div class="summary-item"><strong>Tipo de Café de Interés:</strong> <span>${coffeeType}</span></div>` : ''}
              ${profiles ? `<div class="summary-item"><strong>Perfiles Deseados:</strong> <span>${profiles}</span></div>` : ''}
              ${presentation ? `<div class="summary-item"><strong>Presentación del Café:</strong> <span>${presentation}</span></div>` : ''}
              ${process ? `<div class="summary-item"><strong>Proceso de Interés:</strong> <span>${process}</span></div>` : ''}
              ${quality ? `<div class="summary-item"><strong>Rango de Calidad:</strong> <span>${quality}</span></div>` : ''}
              ${consumption ? `<div class="summary-item"><strong>Consumo Anual:</strong> <span>${consumption} kg</span></div>` : ''}
            `;
          }

          // Ejecuta form.reset() para limpiar los campos
          formRoaster.reset();

          // Cierra modal de tostadores y abre modal de confirmación
          if (modalRoasters) modalRoasters.classList.remove('active');
          if (modalSuccess) openModal(modalSuccess);

        } catch (error) {
          console.error('Error al enviar formulario de tostadores:', error);
          // Maneja cualquier excepción mostrando un aviso amigable sin recargar la página
          const errorBanner = document.createElement('div');
          errorBanner.className = 'b2b-form-error-banner';
          errorBanner.style.cssText = 'background: rgba(231, 76, 60, 0.15); border: 1px solid rgba(231, 76, 60, 0.4); color: #ff6b6b; padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 15px; text-align: center;';
          errorBanner.innerText = 'Ocurrió un error al enviar tu solicitud. Por favor intenta de nuevo.';
          if (submitBtn) {
            formRoaster.insertBefore(errorBanner, submitBtn);
          } else {
            formRoaster.appendChild(errorBanner);
          }
        } finally {
          // Restablece el botón de envío
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
          }
        }
      });
    }
  };

  initB2BModals();

  
    // ==========================================
    // ==========================================
  // PARALLAX MOTOR - DON JOSÉ & COFFEE PLANT (IMPACTO SOCIAL)
  // ==========================================
  const initImpactoParallax = () => {
    const section = document.getElementById('impacto-social');
    const parallaxLayerRight = document.getElementById('impacto-parallax-layer');
    const parallaxLayerLeft = document.getElementById('jersa-parallax-layer');
    const parallaxLayerRightModes = document.getElementById('coffee-plant-modes-layer');
    const resilienciaSection = document.getElementById('resiliencia-cafetera') || document.querySelector('.origins-intro-card') || document.querySelector('.origins-container');
    const modesSection = document.getElementById('como-participacion-transforma-vidas') || document.querySelector('.origins-impact-modes');
    const familiasTarget = document.querySelector('.origins-interactive-showcase');

    if (!section) return;

    const getOffsetTopRelativeTo = (el, parent) => {
      let top = 0;
      let curr = el;
      while (curr && curr !== parent && curr !== document.body) {
        top += curr.offsetTop;
        curr = curr.offsetParent;
      }
      return top;
    };

    let ticking = false;

    const updateParallax = () => {
      const sectionRect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const familiasRect = familiasTarget ? familiasTarget.getBoundingClientRect() : null;
      const resilienciaRect = resilienciaSection ? resilienciaSection.getBoundingClientRect() : null;
      const modesRect = modesSection ? modesSection.getBoundingClientRect() : null;

      // 1. Parallax Don José (Lateral Derecho - Cabecera y Pilares)
      if (parallaxLayerRight) {
        const limitBottom = resilienciaRect ? resilienciaRect.top : (familiasRect ? familiasRect.top : sectionRect.bottom);
        if (sectionRect.top < windowHeight && limitBottom > -100) {
          const scrollOffset = window.scrollY - section.offsetTop;
          const translateY = scrollOffset * 0.38;

          let opacity = 1;
          if (resilienciaRect && resilienciaRect.top < windowHeight) {
            opacity = Math.max(0, Math.min(1, (resilienciaRect.top - 60) / (windowHeight * 0.45)));
          }

          parallaxLayerRight.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
          parallaxLayerRight.style.opacity = opacity.toFixed(2);
        }
      }

      // 2. Parallax Coffee Plant (Lateral Izquierdo - Resiliencia Cafetera)
      if (parallaxLayerLeft && resilienciaSection) {
        const resilienciaOffsetTop = getOffsetTopRelativeTo(resilienciaSection, section);
        parallaxLayerLeft.style.top = `${resilienciaOffsetTop}px`;

        if (resilienciaRect && resilienciaRect.top < windowHeight && (familiasRect ? familiasRect.top > -100 : sectionRect.bottom > 0)) {
          const scrollOffset = window.scrollY - (section.offsetTop + resilienciaOffsetTop);
          const translateY = scrollOffset * 0.34;

          let opacity = 1;
          if (familiasRect && familiasRect.top < windowHeight) {
            opacity = Math.max(0, Math.min(1, (familiasRect.top - 80) / (windowHeight * 0.6)));
          } else if (resilienciaRect.top > windowHeight * 0.75) {
            opacity = Math.max(0, Math.min(1, (windowHeight - resilienciaRect.top) / (windowHeight * 0.25)));
          }

          parallaxLayerLeft.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
          parallaxLayerLeft.style.opacity = opacity.toFixed(2);
        }
      }

      // 3. Parallax Coffee Plant (Lateral Derecho - ¿Cómo tu participación transforma vidas?)
      if (parallaxLayerRightModes && modesSection) {
        const modesOffsetTop = getOffsetTopRelativeTo(modesSection, section);
        parallaxLayerRightModes.style.top = `${modesOffsetTop}px`;

        if (modesRect && modesRect.top < windowHeight && (familiasRect ? familiasRect.top > -100 : sectionRect.bottom > 0)) {
          const scrollOffset = window.scrollY - (section.offsetTop + modesOffsetTop);
          const translateY = scrollOffset * 0.34;

          let opacity = 1;
          if (familiasRect && familiasRect.top < windowHeight) {
            opacity = Math.max(0, Math.min(1, (familiasRect.top - 80) / (windowHeight * 0.6)));
          } else if (modesRect.top > windowHeight * 0.75) {
            opacity = Math.max(0, Math.min(1, (windowHeight - modesRect.top) / (windowHeight * 0.25)));
          }

          parallaxLayerRightModes.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
          parallaxLayerRightModes.style.opacity = opacity.toFixed(2);
        }
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', updateParallax);
    updateParallax();
  };

  initImpactoParallax();


  // ==========================================
  // FORMULARIO DE COMUNIDAD OFICIAL
  // ==========================================
  const initComunidadForm = () => {
    const form = document.getElementById('form-comunidad');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const feedback = document.getElementById('comunidad-feedback');
      const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('btn-comunidad-submit');
      const originalBtnText = submitBtn ? submitBtn.innerText : 'Unirme a la Comunidad';

      const fullnameInput = form.querySelector('[name="nombre_apellidos"]');
      const paisInput = form.querySelector('[name="pais"]');
      const ciudadInput = form.querySelector('[name="ciudad"]');
      const emailInput = form.querySelector('[name="email"]');
      const telefonoInput = form.querySelector('[name="telefono"]');

      const fullname = fullnameInput ? fullnameInput.value.trim() : '';
      const pais = paisInput ? paisInput.value.trim() : '';
      const ciudad = ciudadInput ? ciudadInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const telefono = telefonoInput ? telefonoInput.value.trim() : '';

      // Validación de campos requeridos
      if (!fullname || !pais || !ciudad || !email || !telefono) {
        if (feedback) {
          feedback.className = 'comunidad-feedback error';
          feedback.style.display = 'block';
          feedback.textContent = 'Por favor completa todos los campos requeridos.';
        }
        return;
      }

      // Validación de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'comunidad-feedback error';
          feedback.style.display = 'block';
          feedback.textContent = 'Por favor ingresa un correo electrónico válido.';
        }
        return;
      }

      // Deshabilita el botón de envío y cambia el texto a "Registrando..."
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Registrando...';
      }

      if (feedback) {
        feedback.style.display = 'none';
      }

      const formData = new FormData(form);
      const COMUNIDAD_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwl57a69fYmqr_OIUyACekCoBvllnbKGzZ9C0y9BAe1KW6xzxbTTYai4VY40Ro8xhgOuA/exec';

      try {
        const response = await fetch(COMUNIDAD_SCRIPT_URL, {
          method: 'POST',
          body: formData
        });

        // Al recibir respuesta exitosa:
        if (feedback) {
          feedback.className = 'comunidad-feedback success';
          feedback.style.display = 'block';
          feedback.innerHTML = '✨ ¡Bienvenido a la comunidad del Tour del Café! Pronto recibirás novedades exclusivas.';
        }

        // Limpia los campos con form.reset()
        form.reset();

      } catch (error) {
        console.error('Error al enviar formulario de comunidad:', error);
        // Si ocurre algún error en la solicitud, muestra una notificación amigable
        if (feedback) {
          feedback.className = 'comunidad-feedback error';
          feedback.style.display = 'block';
          feedback.textContent = 'Ocurrió un problema al enviar tu registro. Por favor intenta de nuevo.';
        }
      } finally {
        // Restablece el botón original
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalBtnText;
        }
      }
    });
  };

  initComunidadForm();

  // ==========================================
  // GESTIÓN Y REPRODUCCIÓN SEGURA DE VIDEOS EN MÓVILES (HERO Y TROFEO)
  // ==========================================
  const initMobileVideoPlayback = () => {
    const mobileVideos = document.querySelectorAll(
      '.hero-video-bg, .hero-logo-animation, .challenge-logo-video'
    );
    if (!mobileVideos.length) return;

    const playVideoSafe = (video) => {
      if (!video) return;
      // Requerimientos técnicos obligatorios para móviles iOS y Android
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('x5-playsinline', '');

      // Invocar play() directamente para forzar inicio del buffering en motores móviles
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay desatendido restringido por el SO (ej. modo ahorro de energía)
          console.warn('Autoplay móvil requiere interacción previa del usuario:', error);
        });
      }
    };

    // 1. Ejecución inmediata en todos los videos al inicializar
    mobileVideos.forEach(video => {
      playVideoSafe(video);
    });

    // 2. Reintento una vez la ventana complete la carga total de recursos
    window.addEventListener('load', () => {
      mobileVideos.forEach(video => {
        if (video.paused) {
          playVideoSafe(video);
        }
      });
    }, { once: true });

    // 3. Reanudación si la pestaña o app vuelve a primer plano
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        mobileVideos.forEach(video => {
          if (video.paused) {
            playVideoSafe(video);
          }
        });
      }
    });

    // 4. Observador de visibilidad (IntersectionObserver)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const vid = entry.target;
            if (vid.paused) {
              playVideoSafe(vid);
            }
          }
        });
      }, { threshold: 0.1 });

      mobileVideos.forEach(video => observer.observe(video));
    }

    // 5. Desbloqueo universal en la primera interacción (toque, scroll o clic) en fase de captura
    const unlockOnFirstGesture = () => {
      mobileVideos.forEach(video => {
        if (video.paused) {
          playVideoSafe(video);
        }
      });
    };

    ['touchstart', 'touchend', 'click', 'scroll'].forEach(evt => {
      window.addEventListener(evt, unlockOnFirstGesture, { capture: true, passive: true });
    });
  };

  initMobileVideoPlayback();

});
