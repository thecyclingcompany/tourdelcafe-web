/**
 * Tour del Café - World's Coffee & Cycling Festival
 * CMS Colecciones y Datos Dinámicos
 */

export const eventData = {
  coffeeRides: [
    {
      id: 'antioquia',
      ciudad: 'Medellín - Oriente Antioqueño',
      pais: 'Colombia',
      fecha: 'Febrero 2027',
      lugarEncuentro: 'Ritual Café, Poblado / Alto de las Palmas',
      distancia: 65,
      altimetria: 1450,
      descripcion: 'Una rodada exigente subiendo por las imponentes Palmas para luego adentrarnos en las fincas de café especial del Oriente Antioqueño. Cerramos con un taller de catación privada de variedades exóticas (Geisha y Tabi) liderado por tostadores campeones nacionales.',
      linkRSVP: '#rsvp-antioquia',
      imagenPortada: 'assets/photo-cyclists-house.jpg'
    },
    {
      id: 'bogota',
      ciudad: 'Bogotá - Coffee Ride Urbano',
      pais: 'Colombia',
      fecha: 'Marzo 2027',
      lugarEncuentro: 'Café Cultor, Quinta Camacho',
      distancia: 45,
      altimetria: 600,
      descripcion: 'Rodada que conecta los distritos de café especial más emblemáticos de la capital colombiana. Un recorrido urbano y de montaña subiendo a los cerros orientales (El Verjón), seguido de un laboratorio de filtrados y barismo avanzado en Quinta Camacho.',
      linkRSVP: '#rsvp-bogota',
      imagenPortada: 'assets/photo-cyclist-worker.jpg'
    },
    {
      id: 'cali',
      ciudad: 'Cali - Rodada del Sol y Café',
      pais: 'Colombia',
      fecha: 'Abril 2027',
      lugarEncuentro: 'Café Valparaíso, San Antonio',
      distancia: 55,
      altimetria: 850,
      descripcion: 'Recorrido por la ruta del café del Valle del Cauca, saliendo desde el histórico barrio de San Antonio en Cali hacia el km 18. Al descender, disfrutaremos de un brunch artesanal y una cata de cafés de proceso natural y honey del Valle.',
      linkRSVP: '#rsvp-cali',
      imagenPortada: 'assets/photo-mitico.jpg'
    },
    {
      id: 'miami',
      ciudad: 'Miami - International Coffee Ride',
      pais: 'Estados Unidos',
      fecha: 'Mayo 2027',
      lugarEncuentro: 'Vice City Roasters, Wynwood / Key Biscayne',
      distancia: 50,
      altimetria: 200,
      descripcion: 'Lanzamiento internacional oficial en Florida. Una rodada escénica plana y rápida saliendo desde Wynwood hacia Key Biscayne (Rickenbacker Causeway). Culmina con un festival de aeropress al aire libre y presentación del portafolio del Tour del Café 2027.',
      linkRSVP: '#rsvp-miami',
      imagenPortada: 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?auto=format&fit=crop&w=800&q=80'
    }
  ],
  
  granFondoRecorridos: [
    {
      id: 'gran-fondo',
      nombre: 'Reto Macchiato',
      distancia: '127 km',
      desnivel: '+2.218 m',
      tiempoMaximo: '5:30 horas',
      altitudMinima: '1.047 m.s.n.m',
      altitudMaxima: '1,790 m.s.n.m',
      pmChallengeCount: '2 Premios',
      sprintChallengeCount: '2 Sprints',
      puntosApoyoCount: '4 Puntos',
      kmTotal: 127,
      gpxUrl: '#download-gpx-gran-fondo',
      kitIncluido: [
        'Jersey Oficial Vintage Edition (Gobo Cycling Wear)',
        'Medalla Finisher en Madera Recuperada y Resina de Café',
        'Bolsa de Café Mítico del Festival (250g - Edición Especial)',
        'Drip Packs de Café para Ruta',
        'Chip de Cronometraje Electrónico y Dorsal',
        'Acceso Completo a la Expo & Roaster\'s Lounge'
      ],
      hitos: [
        {
          id: 'gf-pm-circasia',
          kmInicio: 0,
          kmFin: 6.8,
          kilometro: 'Km 0 - 6.8',
          nombre: 'PM Circasia (Premio de Montaña)',
          tipo: 'climb'
        },
        {
          id: 'gf-sc-san-jose',
          kmInicio: 24.8,
          kmFin: 38.3,
          kilometro: 'Km 24.8 - 38.3',
          nombre: 'SC San José (Sprint Challenge)',
          tipo: 'sprint'
        },
        {
          id: 'gf-apoyo-san-jose',
          kmInicio: 38.5,
          kmFin: null,
          kilometro: 'Km 38.5',
          nombre: 'Punto de Apoyo San José (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        },
        {
          id: 'gf-apoyo-las-pinas',
          kmInicio: 63.6,
          kmFin: null,
          kilometro: 'Km 63.6',
          nombre: 'Punto de Apoyo Las Piñas (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        },
        {
          id: 'gf-pm-buenavista',
          kmInicio: 79.3,
          kmFin: 83.5,
          kilometro: 'Km 79.3 - 83.5',
          nombre: 'PM Buenavista (Premio de Montaña)',
          tipo: 'climb'
        },
        {
          id: 'gf-apoyo-buenavista',
          kmInicio: 84.0,
          kmFin: null,
          kilometro: 'Km 84.0',
          nombre: 'Punto de Apoyo Buenavista (Hidratación / Alimentación / Mecánica / Coffee Point)',
          tipo: 'hydration'
        },
        {
          id: 'gf-sc-calarca',
          kmInicio: 108.7,
          kmFin: 113.6,
          kilometro: 'Km 108.7 - 113.6',
          nombre: 'SC Calarcá (Sprint Challenge)',
          tipo: 'sprint'
        },
        {
          id: 'gf-apoyo-calarca',
          kmInicio: 113.6,
          kmFin: null,
          kilometro: 'Km 113.6',
          nombre: 'Punto de Apoyo Cárcel Calarcá (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        }
      ]
    },
    {
      id: 'medio-fondo',
      nombre: 'Reto Espresso',
      distancia: '115,4 km',
      desnivel: '+1.711 m',
      tiempoMaximo: '5:00 horas',
      altitudMinima: '1.047 m.s.n.m',
      altitudMaxima: '1,790 m.s.n.m',
      pmChallengeCount: '1 Premio',
      sprintChallengeCount: '2 Sprints',
      puntosApoyoCount: '3 Puntos',
      kmTotal: 115.4,
      gpxUrl: '#download-gpx-medio-fondo',
      kitIncluido: [
        'Jersey Oficial Vintage Edition (Gobo Cycling Wear)',
        'Medalla Finisher en Madera Recuperada y Resina de Café',
        'Bolsa de Café Mítico del Festival (250g - Edición Especial)',
        'Drip Packs de Café para Ruta',
        'Chip de Cronometraje Electrónico y Dorsal',
        'Acceso Completo a la Expo & Roaster\'s Lounge'
      ],
      hitos: [
        {
          id: 'mf-pm-circasia',
          kmInicio: 0,
          kmFin: 6.8,
          kilometro: 'Km 0 - 6.8',
          nombre: 'PM Circasia (Premio de Montaña)',
          tipo: 'climb'
        },
        {
          id: 'mf-sc-san-jose',
          kmInicio: 24.8,
          kmFin: 38.3,
          kilometro: 'Km 24.8 - 38.3',
          nombre: 'SC San José (Sprint Challenge)',
          tipo: 'sprint'
        },
        {
          id: 'mf-apoyo-san-jose',
          kmInicio: 38.5,
          kmFin: null,
          kilometro: 'Km 38.5',
          nombre: 'Punto de Apoyo San José (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        },
        {
          id: 'mf-apoyo-las-pinas',
          kmInicio: 63.6,
          kmFin: null,
          kilometro: 'Km 63.6',
          nombre: 'Punto de Apoyo Las Piñas (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        },
        {
          id: 'mf-sc-calarca',
          kmInicio: 97.2,
          kmFin: 102.1,
          kilometro: 'Km 97.2 - 102.1',
          nombre: 'SC Calarcá (Sprint Challenge)',
          tipo: 'sprint'
        },
        {
          id: 'mf-apoyo-calarca',
          kmInicio: 102.1,
          kmFin: null,
          kilometro: 'Km 102.1',
          nombre: 'Punto de Apoyo Cárcel Calarcá (Hidratación / Alimentación / Mecánica)',
          tipo: 'hydration'
        }
      ]
    }
  ],
  
  invitadosVIP: [
    {
      id: 'marianne-vos',
      nombre: 'Marianne Vos',
      rol: 'Leyenda WorldTour',
      resenaCorta: 'Considerada la ciclista más completa y grande de todos los tiempos, con un palmarés de más de 240 victorias profesionales en carretera.',
      biografiaCompleta: 'Considerada unánimemente como la ciclista más completa y grande de todos los tiempos (Greatest Of All Time), Marianne Vos ha dominado el ciclismo femenino durante más de dos décadas. Su versatilidad no tiene parangón: ha sido campeona mundial en tres disciplinas distintas (Ruta, Ciclocrós y Pista) y ostenta un palmarés que supera las 240 victorias profesionales en carretera. «Marianne representa la pasión incansable y la longevidad al más alto nivel; un icono imborrable de la historia del deporte.»',
      logros: [
        'Juegos Olímpicos: Oro en Pista (Puntos - Pekín 2008), Oro en Ruta (Londres 2012) y Plata en Ruta (París 2024).',
        'Mundiales: 3 veces Campeona Mundial de Ruta y 8 veces Campeona Mundial de Ciclocrós.',
        'Grandes Vueltas: 32 victorias de etapa en el Giro d\'Italia Women y múltiples etapas y clasificaciones por puntos en el Tour de France Femmes y La Vuelta Femenina.',
        'Clásicas: Ganadora de monumentos y clásicas icónicas como la Ronde van Vlaanderen, Amstel Gold Race, La Flèche Wallonne (en 5 ocasiones) y la Volta a Catalunya.'
      ],
      fotoPerfil: 'assets/marianne-vos-profile-tdc.jpeg',
      fotoCarrera: 'assets/marianne-vos-racing.jpg'
    },
    {
      id: 'pauline-ferrand-prevot',
      nombre: 'Pauline Ferrand-Prévot',
      rol: 'Leyenda WorldTour',
      resenaCorta: 'Una fuerza de la naturaleza y una de las atletas más polifacéticas, única en poseer simultáneamente títulos mundiales de Ruta, MTB y Ciclocrós.',
      biografiaCompleta: 'Pauline Ferrand-Prévot es una auténtica fuerza de la naturaleza y una de las atletas más polifacéticas del deporte mundial. Entró en la historia del ciclismo al convertirse en la primera persona (hombre o mujer) en poseer simultáneamente los títulos de Campeona del Mundo de Ruta, MTB y Ciclocrós (temporada 2014-2015). Tras tocar la gloria olímpica en MTB ante su público en París 2024, selló su histórico regreso a la ruta ganando la Paris-Roubaix Femmes y consagrándose campeona del Tour de France Femmes en 2025. «PFP encarna la explosividad, el coraje multidisciplinar y la capacidad de dominar cualquier terreno sobre dos ruedas.»',
      logros: [
        'Juegos Olímpicos: Medalla de Oro en MTB Cross-Country (París 2024).',
        'Grandes Vueltas & Clásicas: Ganadora del Tour de France Femmes (2025) y de la Paris-Roubaix Femmes (2025).',
        'Títulos Mundiales: Múltiple campeona mundial en MTB XCO, XCM, Short Track, Ciclocrós, Gravel y Ruta.'
      ],
      fotoPerfil: 'assets/pauline-ferrand-profile-tdc.jpeg',
      fotoCarrera: 'assets/pauline-ferrand-racing.jpg'
    },
    {
      id: 'chris-froome',
      nombre: 'Chris Froome',
      rol: 'Leyenda WorldTour',
      resenaCorta: 'Uno de los pocos corredores en ganar las tres Grandes Vueltas y el dominador indiscutible de la era moderna del Tour de Francia.',
      biografiaCompleta: 'Chris Froome definió una era dorada del ciclismo de Grandes Vueltas durante la década de 2010. Nacido en Kenia y formado en el ciclismo africano y británico, su estilo inconfundible de pedaleo en alta cadencia y su temple táctico lo convirtieron en uno de los pocos corredores en la historia en ganar las tres Grandes Vueltas (Tour, Giro y Vuelta), logrando además la gesta de ganar tres consecutivas entre 2017 y 2018. «Chris es el ejemplo máximo de resiliencia, rigor metodológico y determinación para superar los límites en las montañas más exigentes del planeta.»',
      logros: [
        'Tour de Francia: 4 veces campeón general (2013, 2015, 2016, 2017) y 7 victorias de etapa.',
        'La Vuelta a España: 2 veces campeón general (2011, 2017).',
        'Giro d\'Italia: Campeón general (2018) tras su memorable ataque en solitario de 80 km en el Colle delle Finestre.',
        'Juegos Olímpicos: Dos medallas de bronce en Contrarreloj (Londres 2012 y Río 2016).'
      ],
      fotoPerfil: 'assets/chris-froome-profile-tdc.jpeg',
      fotoCarrera: 'assets/chris-froome-racing.jpg'
    },
    {
      id: 'fabian-cancellara',
      nombre: 'Fabian Cancellara',
      rol: 'Leyenda WorldTour',
      resenaCorta: 'La personificación de la potencia y la maestría sobre el adoquín, doble oro olímpico y triple ganador de Flandes y París-Roubaix.',
      biografiaCompleta: 'Fabian Cancellara es la personificación de la potencia, la elegancia y la maestría sobre el adoquín. Durante su carrera profesional, el corredor suizo infundió respeto y temor en el pelotón por sus devastadores ataques a kilómetros de la meta que nadie podía seguir. Es considerado uno de los más grandes contrarrelojistas y clasicómanos de la era moderna. «\'Spartacus\' convirtió la fuerza bruta en arte sobre las piedras y la contrarreloj, dejando una huella imborrable de liderazgo y clase.»',
      logros: [
        'Monumentos: 3 veces ganador de la Paris-Roubaix (El Infierno del Norte) y 3 veces ganador del Tour de Flandes (Ronde van Vlaanderen).',
        'Juegos Olímpicos: Doble Medalla de Oro en Contrarreloj Individual (Pekín 2008 y Río 2016).',
        'Campeonatos del Mundo: 4 veces Campeón Mundial de Contrarreloj (2006, 2007, 2009, 2010).',
        'Tour de Francia: 8 victorias de etapa y más de 29 días vistiendo el maillot amarillo de líder.'
      ],
      fotoPerfil: 'assets/fabian-cancellara-profile-tdc.jpeg',
      fotoCarrera: 'assets/fabian-cancellara-racing.jpg'
    }
  ],
  
  hotelesAliados: [
    // --- 1. ZONA URBANA INMEDIATA (< 3.5 KM) ---
    {
      id: 'armenia-hotel',
      nombre: 'Armenia Hotel',
      grupo: 'urbana',
      categoria: 'Urbano Superior',
      estrellas: 4,
      distancia: '600 m (2 min)',
      alimentacion: 'Restaurante propio. Desayuno buffet con carbohidratos complejos y frutas.',
      servicios: 'Wi-Fi alta velocidad, parqueadero cubierto, piscina y zonas húmedas.',
      web: 'https://armeniahotel.com',
      webTexto: 'armeniahotel.com',
      telefono: '+57 320 696 9111',
      telefonoLink: 'tel:+573206969111',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel armenia.jpg'
    },
    {
      id: 'montes-de-la-castellana',
      nombre: 'Montes de la Castellana',
      grupo: 'urbana',
      categoria: 'Boutique Urbano',
      estrellas: 3.5,
      distancia: '1.2 km (4 min)',
      alimentacion: 'Desayuno tipo americano y tradicional cafetero incluido. Cafetería.',
      servicios: 'Wi-Fi integral, zona residencial muy tranquila, fácil estacionamiento.',
      web: 'https://montescastellana.com',
      webTexto: 'montescastellana.com',
      telefono: '+57 318 452 0000',
      telefonoLink: 'tel:+573184520000',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-montes-de-la-castellana.jpg'
    },
    {
      id: 'hotel-portal-del-norte',
      nombre: 'Hotel Portal del Norte',
      grupo: 'urbana',
      categoria: 'Urbano Confort',
      estrellas: 3,
      distancia: '1.3 km (4 min)',
      alimentacion: 'Desayuno continental/cafetero incluido en tarifa estándar.',
      servicios: 'Wi-Fi libre, recepción abierta 24/7, acceso expedito sobre Avenida Bolívar.',
      web: 'https://portaldelnorte.co',
      webTexto: 'portaldelnorte.co',
      telefono: '+57 320 846 9036',
      telefonoLink: 'tel:+573208469036',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-portal-del-norte.jpg'
    },
    {
      id: 'hotel-mocawa-plaza',
      nombre: 'Hotel Mocawa Plaza',
      grupo: 'urbana',
      categoria: 'Corporativo Premium',
      estrellas: 5,
      distancia: '1.8 km (5 min)',
      alimentacion: 'Restaurante The Grill, bar en terraza, amplio desayuno buffet deportivo.',
      servicios: 'Fibra óptica corporativa, piscina piso 16, gimnasio y centro comercial anexo.',
      web: 'https://mocawaplaza.com',
      webTexto: 'mocawaplaza.com',
      telefono: '+57 322 685 6002',
      telefonoLink: 'tel:+573226856002',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel mocawa plaza.jpg'
    },
    {
      id: 'isa-victory-hotel',
      nombre: 'Isa Victory Hotel Boutique',
      grupo: 'urbana',
      categoria: 'Boutique Ejecutivo',
      estrellas: 4,
      distancia: '2.3 km (6 min)',
      alimentacion: 'Restaurante gourmet, terraza lounge, desayunos a la carta balanceados.',
      servicios: 'Wi-Fi premium, spa con masajes de recuperación, parqueadero privado.',
      web: 'https://isavictoryhotel.com',
      webTexto: 'isavictoryhotel.com',
      telefono: '+57 315 071 5857',
      telefonoLink: 'tel:+573150715857',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-isa-victory.jpg'
    },
    {
      id: 'hotel-cafe-cafe-avenida',
      nombre: 'Hotel Café Café Avenida',
      grupo: 'urbana',
      categoria: 'Confort Turístico',
      estrellas: 3,
      distancia: '3.0 km (8 min)',
      alimentacion: 'Café restaurante con preparaciones típicas y café de origen.',
      servicios: 'Wi-Fi de cortesía, excelente conexión sobre corredor vial principal.',
      web: 'https://cafecafeavenida.com',
      webTexto: 'cafecafeavenida.com',
      telefono: '+57 318 452 0000',
      telefonoLink: 'tel:+573184520000',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-cafe-cafe-avenida.jpg'
    },

    // --- 2. HOTELES CAMPESTRES & BOUTIQUE (6 A 24 KM) ---
    {
      id: 'bio-habitat-hotel',
      nombre: 'Bio Habitat Hotel',
      grupo: 'campestre',
      categoria: 'Eco-Lujo / Wellness',
      estrellas: 5,
      distancia: '6.5 km (11 min)',
      alimentacion: 'Restaurante Basto, gastronomía orgánica y nutrición prémium.',
      servicios: 'Fibra óptica alta velocidad, spa con hidroterapia, entorno en bosque de niebla.',
      web: 'https://biohabitathotel.com',
      webTexto: 'biohabitathotel.com',
      telefono: '+57 300 525 8040',
      telefonoLink: 'tel:+573005258040',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-bio-habitat.jpg'
    },
    {
      id: 'hotel-hacienda-combia',
      nombre: 'Hotel Hacienda Combia',
      grupo: 'campestre',
      categoria: 'Campestre Cafetero',
      estrellas: 4,
      distancia: '12.5 km (18 min)',
      alimentacion: 'Restaurante propio, gastronomía cafetera de autor y desayuno buffet.',
      servicios: 'Wi-Fi campestre, piscina panorámica sin fin, sendero de café, taller de apoyo.',
      web: 'https://combia.com.co',
      webTexto: 'combia.com.co',
      telefono: '+57 314 682 5396',
      telefonoLink: 'tel:+573146825396',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-hacienda-combia.jpg'
    },
    {
      id: 'hotel-las-camelias',
      nombre: 'Hotel Las Camelias',
      grupo: 'campestre',
      categoria: 'Resort Campestre',
      estrellas: 5,
      distancia: '17.0 km (25 min)',
      alimentacion: 'Múltiples restaurantes (Cameli, La Fonda), buffet internacional completo.',
      servicios: 'Wi-Fi total, parque acuático, spa, canchas de tenis, ideal para grandes delegaciones.',
      web: 'https://camelias.com.co',
      webTexto: 'camelias.com.co',
      telefono: '+57 310 375 7167',
      telefonoLink: 'tel:+573103757167',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-las-camelias.jpg'
    },
    {
      id: 'hotel-la-herencia',
      nombre: 'Hotel La Herencia',
      grupo: 'campestre',
      categoria: 'Casas de Campo VIP',
      estrellas: 4,
      distancia: '18.5 km (25 min)',
      alimentacion: 'Desayuno campestre gourmet, servicio de chef privado bajo reserva.',
      servicios: 'Wi-Fi satelital de alta velocidad, piscina privada, jardines, entorno cicloturístico.',
      web: 'https://laherenciahotel.com',
      webTexto: 'laherenciahotel.com',
      telefono: '+57 310 370 9860',
      telefonoLink: 'tel:+573103709860',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-la-herencia.jpg'
    },
    {
      id: 'finca-hotel-la-esperanza',
      nombre: 'Finca Hotel La Esperanza',
      grupo: 'campestre',
      categoria: 'Campestre Tradicional',
      estrellas: 3,
      distancia: '19.0 km (26 min)',
      alimentacion: 'Comida típica quindiana, desayuno casero con arepa, huevos y café de finca.',
      servicios: 'Wi-Fi en áreas sociales, piscina, amplias zonas verdes y custodia de bicicletas.',
      web: 'https://turismoquindio.com',
      webTexto: 'turismoquindio.com',
      telefono: '+57 317 437 0002',
      telefonoLink: 'tel:+573174370002',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-la-esperanza.jpg'
    },
    {
      id: 'finca-hotel-el-zafiro',
      nombre: 'Finca Hotel El Zafiro',
      grupo: 'campestre',
      categoria: 'Agroturismo Familiar',
      estrellas: 3,
      distancia: '21.0 km (28 min)',
      alimentacion: 'Desayuno típico campesino abundante, jugos naturales y proteína fresca.',
      servicios: 'Wi-Fi en áreas comunes, ambiente tranquilo, parqueadero seguro y lavado de bicis.',
      web: 'https://quindioturismo.com',
      webTexto: 'quindioturismo.com',
      telefono: '+57 318 452 0000',
      telefonoLink: 'tel:+573184520000',
      codigoReserva: 'Próximamente',
      imagen: 'assets/finca-hotel-el-zafiro.jpg'
    },
    {
      id: 'hotel-casa-du-velo',
      nombre: 'Hotel Casa du Vélo',
      grupo: 'campestre',
      categoria: 'Cycling Boutique Hotel',
      estrellas: 4,
      distancia: '23.5 km (32 min)',
      alimentacion: 'Menú diseñado para ciclistas, cocina energética y barra de carbohidratos.',
      servicios: 'Especializado 100% en ciclismo: taller pro, lavado, racks y repuestos básicos.',
      web: 'https://casaduvelo.com',
      webTexto: 'casaduvelo.com',
      telefono: '+57 314 275 6692',
      telefonoLink: 'tel:+573142756692',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-casa-du-velo.jpg'
    },
    {
      id: 'hotel-mocawa-resort',
      nombre: 'Hotel Mocawa Resort',
      grupo: 'campestre',
      categoria: 'Gran Complejo Resort',
      estrellas: 5,
      distancia: '24.0 km (30 min)',
      alimentacion: '3 restaurantes temáticos, buffet de alta gama y opciones pre-competencia.',
      servicios: 'Fibra óptica corporativa, piscina de 1.200 m², spa deportivo y putting green.',
      web: 'https://mocawaresort.com',
      webTexto: 'mocawaresort.com',
      telefono: '+57 317 572 9275',
      telefonoLink: 'tel:+573175729275',
      codigoReserva: 'Próximamente',
      imagen: 'assets/hotel-mocawa-resort.jpg'
    }
  ]
};

export const collectionsData = {
  resiliencia: {
    slug: 'resiliencia',
    name: 'Resiliencia',
    headline: 'Colección Solidaria & Pre-Venta Oficial',
    description: 'Un homenaje a la fuerza de nuestra tierra. Un porcentaje de las utilidades de esta colección se destina directamente al apoyo de las familias caficultoras aliadas de A Coffee Family y Mítico Cycling Coffee.',
    deliveryNotice: 'Pre-venta exclusiva: Entrega oficial durante la Expo del Tour del Café',
    isPreOrder: true,
    productIds: ['t-shirt-arriero', 'mug-arriero', 'mitico-escarabajo']
  }
};

// Adjuntar a window para disponibilidad global directa si es necesario
if (typeof window !== 'undefined') {
  window.eventData = eventData;
  window.collectionsData = collectionsData;
}

