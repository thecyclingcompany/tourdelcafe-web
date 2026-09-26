/**
 * CONFIGURACIÓN OFICIAL DE EPAYCO CHECKOUT (COLOMBIA)
 * Tienda Oficial Mítico Coffee & Tour del Café
 *
 * Instrucciones:
 * - Para modo producción: Cambiar `test: false` y colocar tus llaves definitivas provistas en el Dashboard de ePayco.
 * - `publicKey`: Llave Pública (P_KEY o PUBLIC_KEY de ePayco)
 * - `privateKey`: Llave Privada
 * - `pKey`: P_KEY del comercio
 */
window.EPAYCO_CONFIG = {
  // Credenciales Oficiales de Producción
  publicKey: '13eb3817ffe672d7b10376797e57a082',
  pKey: '3a7a28b3c17941d4e19a851bb234e3fd02cec3d4',
  privateKey: '7b3a37a8d7618225a2864015bcd7f2e0',
  test: true, // Modo Pruebas Activado (Simulador de Pagos)

  // Parámetros de cobro
  currency: 'COP',
  country: 'CO',
  lang: 'es',

  // Configuración de Envíos Nacionales (Colombia)
  freeShippingThreshold: 120000,                  // Envío gratis a partir de $120.000 COP
  standardShippingCost: 12000,                    // Tarifa estándar nacional: $12.000 COP

  // URLs de retorno y webhooks
  get responseUrl() {
    return window.location.origin + '/checkout/resultado.html';
  },
  get confirmationUrl() {
    return window.location.origin + '/api/epayco/confirmacion';
  },

  // Teléfono de soporte o pedidos alternativos por WhatsApp
  supportWhatsApp: '573103297299'
};
