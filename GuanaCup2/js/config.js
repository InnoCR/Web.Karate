/* =========================================================
   GUANACOP2 · config.js
   Carga config.json, calcula fechas derivadas y expone
   todo en window.GC2 (con precio fijo, sin categorías)
   ========================================================= */

(function () {
    'use strict';

    window.GC2 = {
        config: null,
        listo: false,
        error: null,

        utils: {
            /**
             * Calcula la edad exacta (en años) de una fecha de nacimiento
             * respecto a una fecha de referencia.
             * @param {string|Date} fechaNacimiento
             * @param {string|Date} fechaReferencia
             * @returns {number}
             */
            calcularEdad(fechaNacimiento, fechaReferencia) {
                const nac = new Date(fechaNacimiento);
                const ref = new Date(fechaReferencia);
                if (isNaN(nac) || isNaN(ref)) return NaN;
                let edad = ref.getFullYear() - nac.getFullYear();
                const m = ref.getMonth() - nac.getMonth();
                if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) {
                    edad--;
                }
                return edad;
            },

            /**
             * Formatea un monto con separadores de miles y símbolo de moneda.
             * @param {number} monto
             * @returns {string}  Ej: "₡15 000"
             */
            formatearMonto(monto) {
                const cfg = window.GC2.config;
                const simbolo = (cfg && cfg.simboloMoneda) || '₡';
                const locale = (cfg && cfg.locale) || 'es-CR';
                const num = Number(monto || 0);
                return simbolo + num.toLocaleString(locale, { maximumFractionDigits: 0 });
            },

            /**
             * Escapa texto para insertarlo de forma segura en HTML.
             * @param {string} str
             * @returns {string}
             */
            escaparHTML(str) {
                return String(str == null ? '' : str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
        }
    };

    /**
     * Carga un JSON con fetch y lanza error si falla.
     * @param {string} url
     * @returns {Promise<any>}
     */
    async function cargarJSON(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Valida que el config tenga los campos mínimos requeridos,
     * incluida una URL de backend válida y un precio fijo numérico.
     * @param {object} cfg
     */
    function validarConfig(cfg) {
        const requeridos = [
            'torneo',
            'fechaTorneo',
            'whatsappOrganizador',
            'simboloMoneda'
        ];
        const faltantes = requeridos.filter((k) => cfg[k] == null || cfg[k] === '');
        if (faltantes.length) {
            throw new Error(`config.json: faltan campos requeridos → ${faltantes.join(', ')}`);
        }

        // Validar precioFijo
        if (cfg.precioFijo == null || isNaN(Number(cfg.precioFijo)) || Number(cfg.precioFijo) <= 0) {
            throw new Error('config.json: "precioFijo" debe ser un número mayor a 0.');
        }

        // Validación estricta del backend
        if (!cfg.backend || typeof cfg.backend !== 'object') {
            throw new Error('config.json: falta la sección "backend".');
        }
        const url = String(cfg.backend.url || '').trim();
        if (!url) {
            throw new Error('config.json: backend.url está vacía.');
        }
        if (url.includes('TU_DEPLOY_ID')) {
            throw new Error('config.json: debes reemplazar "TU_DEPLOY_ID_AQUI" por la URL real del Web App de Apps Script.');
        }
        if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url)) {
            throw new Error('config.json: backend.url no parece una URL válida de Apps Script (debe empezar con https://script.google.com/macros/s/.../exec).');
        }
    }

    /**
     * Indica si las inscripciones están activas según:
     *  - bandera manual inscripcionesAbiertas
     *  - fecha límite de inscripción
     * @returns {boolean}
     */
    function inscripcionesActivas() {
        const cfg = window.GC2.config;
        if (!cfg) return false;
        if (cfg.inscripcionesAbiertas === false) return false;
        if (cfg.fechaLimiteInscripcion) {
            const limite = new Date(cfg.fechaLimiteInscripcion);
            if (!isNaN(limite) && new Date() > limite) return false;
        }
        return true;
    }

    /**
     * Aplica la bandera de inscripciones al DOM:
     *  - muestra/oculta el aviso de cerrado
     *  - deshabilita el formulario si está cerrado
     */
    function aplicarEstadoInscripciones() {
        const activas = inscripcionesActivas();
        window.GC2.inscripcionesActivas = activas;

        const aviso = document.getElementById('avisoCerrado');
        const form = document.getElementById('formAdultos');
        const btnSig = document.getElementById('btnSiguienteAdultos');

        if (!activas) {
            if (aviso) aviso.hidden = false;
            if (form) {
                form.querySelectorAll('input, select, textarea, button').forEach((el) => {
                    if (el.id !== 'btnAnteriorAdultos') el.disabled = true;
                });
            }
            if (btnSig) btnSig.disabled = true;
        }
    }

    /**
     * Arranque: carga JSON, valida, calcula fechas y expone estado.
     */
    async function init() {
        try {
            const config = await cargarJSON('data/config.json');
            validarConfig(config);

            // Fechas derivadas útiles
            config._fechaTorneoDate = new Date(config.fechaTorneo + 'T00:00:00');
            config._fechaLimiteDate = config.fechaLimiteInscripcion
                ? new Date(config.fechaLimiteInscripcion)
                : null;

            window.GC2.config = config;
            window.GC2.precioFijo = Number(config.precioFijo);
            window.GC2.listo = true;

            // Aplicar estado de inscripciones
            aplicarEstadoInscripciones();

            // Emitir evento
            document.dispatchEvent(new CustomEvent('gc2:config-listo', {
                detail: { config }
            }));

            console.info('[GC2] Configuración cargada correctamente.');
        } catch (err) {
            window.GC2.error = err;
            console.error('[GC2] Error al inicializar:', err);
            mostrarErrorFatal(err);
            document.dispatchEvent(new CustomEvent('gc2:config-error', {
                detail: { error: err }
            }));
        }
    }

    /**
     * Muestra un mensaje de error visible si la config no se puede cargar.
     * @param {Error} err
     */
    function mostrarErrorFatal(err) {
        const main = document.getElementById('vista-formulario-adultos');
        if (!main) return;
        const wrap = main.querySelector('.formulario-wrap');
        if (!wrap) return;

        // Evitar duplicar el aviso
        if (wrap.querySelector('.aviso-fatal-gc2')) return;

        const box = document.createElement('div');
        box.className = 'aviso aviso-error aviso-fatal-gc2';
        box.style.margin = '1rem 0';
        box.innerHTML = `
      <strong>No se pudo cargar la configuración del módulo.</strong><br />
      ${window.GC2.utils.escaparHTML(err.message)}<br /><br />
      <small>Revisa que <code>data/config.json</code> sea JSON válido, que
      <code>precioFijo</code> sea un número mayor a 0, y que <code>backend.url</code>
      apunte al Web App real de Apps Script.</small>
    `;
        wrap.prepend(box);
    }

    // Arrancar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();