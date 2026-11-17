/**
 * SUPABASE CLIENT & REST ADAPTER - TOUR DEL CAFÉ
 * Conexión centralizada oficial a Supabase para portal de inscripciones, checkout ePayco y panel admin.
 * Compatible con navegador (vía @supabase/supabase-js v2 CDN o REST fallback) y Node.js en backend.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js CommonJS
    module.exports = factory();
  } else {
    // Navegador global
    const client = factory();
    root.SUPABASE_CONFIG = client.CONFIG;
    root.supabaseClient = client.getClient();
    root.TourCafeSupabase = client;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CONFIG = {
    url: 'https://xtzaifqlylyaseiufdzq.supabase.co',
    anonKey: 'sb_publishable_48tBLhJYINM1p1NoWo4i1g_5K3Ysylx'
  };

  /**
   * Inicializa o retorna la instancia del cliente oficial de Supabase
   */
  function getClient() {
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      if (!window._supabaseInstance) {
        window._supabaseInstance = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
      }
      return window._supabaseInstance;
    }

    // Fallback REST transparente si el SDK de CDN aún no se ha cargado o en Node.js
    return createRestAdapter();
  }

  /**
   * Adaptador REST ligero y resiliente compatible con la sintaxis de supabase-js
   */
  function createRestAdapter() {
    const headers = {
      'apikey': CONFIG.anonKey,
      'Authorization': 'Bearer ' + CONFIG.anonKey,
      'Content-Type': 'application/json'
    };

    return {
      from: function (table) {
        return {
          select: function (cols = '*') {
            const queryParams = [`select=${encodeURIComponent(cols)}`];
            let orderParam = '';

            const builder = {
              order: function (column, opts = { ascending: true }) {
                orderParam = `&order=${encodeURIComponent(column)}.${opts.ascending ? 'asc' : 'desc'}`;
                return builder;
              },
              eq: function (column, value) {
                queryParams.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
                return builder;
              },
              then: function (onfulfilled, onrejected) {
                const endpoint = `${CONFIG.url}/rest/v1/${table}?${queryParams.join('&')}${orderParam}`;
                return fetch(endpoint, { method: 'GET', headers })
                  .then(r => r.json().then(data => ({ data: r.ok ? data : null, error: r.ok ? null : data })))
                  .catch(err => ({ data: null, error: err }))
                  .then(onfulfilled, onrejected);
              }
            };
            return builder;
          },

          insert: async function (records) {
            const payload = Array.isArray(records) ? records : [records];
            try {
              const res = await fetch(`${CONFIG.url}/rest/v1/${table}`, {
                method: 'POST',
                headers: { ...headers, 'Prefer': 'return=representation' },
                body: JSON.stringify(payload)
              });
              const data = await res.json();
              return { data: res.ok ? data : null, error: res.ok ? null : data };
            } catch (err) {
              return { data: null, error: err };
            }
          },

          update: function (values) {
            let filterParam = '';
            const builder = {
              eq: function (column, val) {
                filterParam = `?${encodeURIComponent(column)}=eq.${encodeURIComponent(val)}`;
                return builder;
              },
              then: function (onfulfilled, onrejected) {
                const endpoint = `${CONFIG.url}/rest/v1/${table}${filterParam}`;
                return fetch(endpoint, {
                  method: 'PATCH',
                  headers: { ...headers, 'Prefer': 'return=representation' },
                  body: JSON.stringify(values)
                })
                  .then(r => r.json().then(data => ({ data: r.ok ? data : null, error: r.ok ? null : data })))
                  .catch(err => ({ data: null, error: err }))
                  .then(onfulfilled, onrejected);
              }
            };
            return builder;
          }
        };
      },

      channel: function (name) {
        // En entorno nativo sin SDK de CDN, retornar no-op seguro
        return {
          on: function () { return this; },
          subscribe: function () { return this; }
        };
      }
    };
  }

  /**
   * Helper unificado para guardar participantes en la tabla 'inscripciones'
   */
  async function guardarInscripcion(data) {
    const client = getClient();
    const rows = Array.isArray(data) ? data : [data];
    return client.from('inscripciones').insert(rows);
  }

  /**
   * Helper unificado para actualizar estado de pago por referencia_pago
   */
  async function actualizarEstadoPago(referenciaPago, estadoPago, epaycoRef = null, valorPagado = null) {
    const client = getClient();
    const updatePayload = {
      estado_pago: estadoPago
    };
    if (epaycoRef) updatePayload.epayco_ref = epaycoRef;
    if (valorPagado !== null && valorPagado !== undefined) {
      updatePayload.valor_pagado = parseFloat(valorPagado) || 0;
    }

    return client
      .from('inscripciones')
      .update(updatePayload)
      .eq('referencia_pago', referenciaPago);
  }

  /**
   * Helper unificado para listar inscripciones en tiempo real
   */
  async function obtenerInscripciones(filtros = {}) {
    const client = getClient();
    let query = client
      .from('inscripciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtros.evento && filtros.evento !== 'all') {
      query = query.eq('evento', filtros.evento);
    }
    if (filtros.estado_pago && filtros.estado_pago !== 'all') {
      query = query.eq('estado_pago', filtros.estado_pago);
    }
    if (filtros.categoria && filtros.categoria !== 'all') {
      query = query.eq('categoria', filtros.categoria);
    }

    return query;
  }

  return {
    CONFIG,
    getClient,
    guardarInscripcion,
    actualizarEstadoPago,
    obtenerInscripciones
  };
});
