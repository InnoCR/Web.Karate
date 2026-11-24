/* =========================================================
   GUANACUP2 · config.js
   Carga config.json y liberacion-texto.json, calcula fechas
   derivadas y expone todo en window.GC2
   ========================================================= */

(function () {
    'use strict';

    window.GC2 = {
        config: null,
        liberacion: null,
        listo: false,
        error: null,

        utils: {
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

            formatearMonto(monto) {
                const cfg = window.GC2.config;
                const simbolo = (cfg && cfg.simboloMoneda) || '₡';
                const locale = (cfg && cfg.locale) || 'es-CR';
                const num = Number(monto || 0);
                return simbolo + num.toLocaleString(locale, { maximumFractionDigits: 0 });
            },

            escaparHTML(str) {
                return String(str == null ? '' : str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            },

            formatearFechaLarga(fechaISO) {
                const fecha = new Date(fechaISO + 'T00:00:00');
                if (isNaN(fecha)) return fechaISO;
                const cfg = window.GC2.config;
                const locale = (cfg && cfg.locale) || 'es-CR';
                return fecha.toLocaleDateString(locale, {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
            }
        }
    };

    async function cargarJSON(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
        }
        return res.json();
    }

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

        if (cfg.precioFijo == null || isNaN(Number(cfg.precioFijo)) || Number(cfg.precioFijo) <= 0) {
            throw new Error('config.json: "precioFijo" debe ser un número mayor a 0.');
        }

        if (!cfg.liberacion || !cfg.liberacion.archivo) {
            throw new Error('config.json: falta la sección "liberacion.archivo".');
        }

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
            throw new Error('config.json: backend.url no parece una URL válida de Apps Script.');
        }
    }

    /**
     * Valida la nueva estructura de liberacion-texto.json:
     * {
     *   version, titulo, secciones: [{ titulo, parrafos: [...] }]
     * }
     */
    function validarLiberacion(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('liberacion-texto.json: no es un objeto válido.');
        }
        if (!Array.isArray(data.secciones) || data.secciones.length === 0) {
            throw new Error('liberacion-texto.json: debe tener un array "secciones" con al menos 1 elemento.');
        }
        data.secciones.forEach((sec, i) => {
            if (!sec.titulo || typeof sec.titulo !== 'string') {
                throw new Error(`liberacion-texto.json: sección #${i} sin título.`);
            }
            if (!Array.isArray(sec.parrafos) || sec.parrafos.length === 0) {
                throw new Error(`liberacion-texto.json: sección "${sec.titulo}" sin párrafos.`);
            }
            sec.parrafos.forEach((p, j) => {
                if (typeof p !== 'string' || !p.trim()) {
                    throw new Error(`liberacion-texto.json: sección "${sec.titulo}" párrafo #${j} vacío.`);
                }
            });
        });
    }

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

    async function init() {
        try {
            const config = await cargarJSON('data/config.json');
            validarConfig(config);

            const liberacion = await cargarJSON(config.liberacion.archivo);
            validarLiberacion(liberacion);

            config._fechaTorneoDate = new Date(config.fechaTorneo + 'T00:00:00');
            config._fechaLimiteDate = config.fechaLimiteInscripcion
                ? new Date(config.fechaLimiteInscripcion)
                : null;

            window.GC2.config = config;
            window.GC2.precioFijo = Number(config.precioFijo);
            window.GC2.liberacion = liberacion;
            window.GC2.listo = true;

            aplicarEstadoInscripciones();

            document.dispatchEvent(new CustomEvent('gc2:config-listo', {
                detail: { config, liberacion }
            }));

            console.info('[GC2] Configuración cargada correctamente.');
            console.info('[GC2] Torneo:', config.torneo, '| Fecha:', config.fechaTorneo);
            console.info('[GC2] Liberación:', liberacion.secciones.length, 'secciones');

        } catch (err) {
            window.GC2.error = err;
            console.error('[GC2] Error al inicializar:', err);
            mostrarErrorFatal(err);
            document.dispatchEvent(new CustomEvent('gc2:config-error', {
                detail: { error: err }
            }));
        }
    }

    function mostrarErrorFatal(err) {
        const main = document.getElementById('vista-formulario-adultos');
        if (!main) return;
        const wrap = main.querySelector('.formulario-wrap');
        if (!wrap) return;

        if (wrap.querySelector('.aviso-fatal-gc2')) return;

        const box = document.createElement('div');
        box.className = 'aviso aviso-error aviso-fatal-gc2';
        box.style.margin = '1rem 0';
        box.innerHTML = `
      <strong>No se pudo cargar la configuración del módulo.</strong><br />
      ${window.GC2.utils.escaparHTML(err.message)}<br /><br />
      <small>Revisa que <code>data/config.json</code> y <code>data/liberacion-texto.json</code>
      sean JSON válidos, que <code>precioFijo</code> sea un número mayor a 0, y que
      <code>backend.url</code> apunte al Web App real de Apps Script.</small>
    `;
        wrap.prepend(box);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();