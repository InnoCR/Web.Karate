/* =========================================================
   GUANA-CUP 2026 · config.js
   Carga config.json, lo expone globalmente y aplica los
   datos dinámicos al DOM de la landing.
   ========================================================= */

(function () {
    'use strict';

    // ------------------------------------------------------
    // Estado global del sitio
    // ------------------------------------------------------
    window.APP = {
        config: null,
        bloquesEdad: [],
        inscripcionesActivas: false,
        listo: false
    };

    // ------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // Formatea un número como moneda costarricense
    function formatMoneda(monto, simbolo = '₡', locale = 'es-CR') {
        try {
            return simbolo + new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(monto);
        } catch (e) {
            return simbolo + monto;
        }
    }
    window.formatMoneda = formatMoneda;

    // Formatea una fecha ISO a texto en español
    function formatFechaLarga(iso) {
        if (!iso) return '';
        const fecha = new Date(iso);
        return fecha.toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
    window.formatFechaLarga = formatFechaLarga;

    // Calcula la edad de una persona a una fecha dada
    function calcularEdad(fechaNacimiento, fechaReferencia) {
        const nac = new Date(fechaNacimiento);
        const ref = new Date(fechaReferencia);
        let edad = ref.getFullYear() - nac.getFullYear();
        const m = ref.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) {
            edad--;
        }
        return edad;
    }
    window.calcularEdad = calcularEdad;

    // Devuelve el bloque de edad según la edad
    function obtenerBloqueEdad(edad) {
        if (!window.APP.bloquesEdad) return null;
        return window.APP.bloquesEdad.find(
            b => edad >= b.min && edad <= b.max
        ) || null;
    }
    window.obtenerBloqueEdad = obtenerBloqueEdad;

    // ------------------------------------------------------
    // Carga de JSON
    // ------------------------------------------------------
    async function cargarJSON(ruta) {
        const res = await fetch(ruta, { cache: 'no-store' });
        if (!res.ok) throw new Error(`No se pudo cargar ${ruta}`);
        return res.json();
    }

    // ------------------------------------------------------
    // Determina si las inscripciones están activas
    // ------------------------------------------------------
    function calcularInscripcionesActivas(config) {
        if (!config.inscripcionesAbiertas) return false;
        if (config.fechaLimiteInscripcion) {
            const ahora = new Date();
            const limite = new Date(config.fechaLimiteInscripcion);
            if (ahora > limite) return false;
        }
        return true;
    }

    // ------------------------------------------------------
    // Aplica datos del config al DOM de la landing
    // ------------------------------------------------------
    function aplicarDatosLanding() {
        const cfg = window.APP.config;
        if (!cfg) return;

        // Título del documento
        document.title = `${cfg.torneo} | Inscripción Torneo de Karate Kyokushin`;

        // Brand del header
        const brandText = $('.brand-text');
        if (brandText) brandText.textContent = cfg.torneo;

        // Info del torneo
        const infoHora = $('#infoHora');
        if (infoHora) {
            infoHora.textContent = cfg.horaInicio || 'Por confirmar';
        }

        const infoCierre = $('#infoCierre');
        if (infoCierre) {
            infoCierre.textContent = formatFechaLarga(cfg.fechaLimiteInscripcion);
        }

        const infoSinpe = $('#infoSinpe');
        if (infoSinpe && cfg.sinpe) infoSinpe.textContent = cfg.sinpe.numero;

        const infoTitular = $('#infoTitular');
        if (infoTitular && cfg.sinpe) infoTitular.textContent = cfg.sinpe.titular;

        const infoWhatsapp = $('#infoWhatsapp');
        if (infoWhatsapp) {
            const numero = cfg.whatsappOrganizador;
            infoWhatsapp.href = `https://wa.me/${numero}`;
            infoWhatsapp.textContent = `+${numero.slice(0, 3)} ${numero.slice(3, 7)}-${numero.slice(7)}`;
            infoWhatsapp.target = '_blank';
            infoWhatsapp.rel = 'noopener';
        }

        // SINPE en la vista de confirmación
        const sinpeNumero = $('#sinpeNumero');
        if (sinpeNumero && cfg.sinpe) sinpeNumero.textContent = cfg.sinpe.numero;

        const sinpeTitular = $('#sinpeTitular');
        if (sinpeTitular && cfg.sinpe) sinpeTitular.textContent = cfg.sinpe.titular;

        // Contador: fecha
        const contadorFecha = $('.contador-fecha strong');
        if (contadorFecha) {
            contadorFecha.textContent = formatFechaLarga(cfg.fechaTorneo);
        }

        // CTA final: fecha límite
        const ctaFechaLimite = $('.cta-final p strong');
        if (ctaFechaLimite) {
            ctaFechaLimite.textContent = formatFechaLarga(cfg.fechaLimiteInscripcion);
        }

        // Precio y categoría única en la landing
        const infoPrecio = $('#infoPrecio');
        if (infoPrecio) {
            infoPrecio.textContent = formatMoneda(cfg.precioInscripcion, cfg.simboloMoneda, cfg.locale);
        }

        const infoCategoria = $('#infoCategoria');
        if (infoCategoria) {
            infoCategoria.textContent = cfg.categoriaUnica || '';
        }

        // Estado de inscripciones
        aplicarEstadoInscripciones();
    }

    // ------------------------------------------------------
    // Muestra u oculta elementos según inscripciones
    // ------------------------------------------------------
    function aplicarEstadoInscripciones() {
        const activas = window.APP.inscripcionesActivas;

        $$('[data-nav="formulario"]').forEach(btn => {
            if (!activas) {
                btn.disabled = true;
                btn.textContent = 'Inscripciones cerradas';
                btn.classList.add('btn-disabled');
            } else {
                btn.disabled = false;
            }
        });

        const estado = $('#contadorEstado');
        if (estado && !activas) {
            estado.textContent = '⚠️ Las inscripciones están cerradas. Contacta al organizador por WhatsApp.';
            estado.style.color = 'var(--color-warning)';
        }

        const ctaTitulo = $('.cta-final h2');
        const ctaTexto = $('.cta-final p');
        if (!activas && ctaTitulo && ctaTexto) {
            ctaTitulo.textContent = 'Inscripciones cerradas';
            ctaTexto.innerHTML = 'El periodo de inscripción ha finalizado. Si tienes dudas, contacta al organizador.';
        }
    }

    // ------------------------------------------------------
    // Inicialización
    // ------------------------------------------------------
    async function init() {
        try {
            const config = await cargarJSON('data/config.json');

            window.APP.config = config;
            window.APP.bloquesEdad = config.bloquesEdad || [];
            window.APP.inscripcionesActivas = calcularInscripcionesActivas(config);
            window.APP.listo = true;

            aplicarDatosLanding();

            document.dispatchEvent(new CustomEvent('app:listo', {
                detail: {
                    config: window.APP.config,
                    bloquesEdad: window.APP.bloquesEdad,
                    inscripcionesActivas: window.APP.inscripcionesActivas
                }
            }));

            console.log('[config.js] App lista', window.APP);

        } catch (err) {
            console.error('[config.js] Error al inicializar:', err);
            mostrarErrorCarga(err);
        }
    }

    // ------------------------------------------------------
    // Muestra error si falla la carga
    // ------------------------------------------------------
    function mostrarErrorCarga(err) {
        const header = document.querySelector('.site-header');
        if (header) {
            const aviso = document.createElement('div');
            aviso.style.cssText = `
        background: #c8102e;
        color: #fff;
        padding: .75rem 1rem;
        text-align: center;
        font-size: .9rem;
      `;
            aviso.textContent = '⚠️ No se pudieron cargar los datos del torneo. Recarga la página o contacta al organizador.';
            header.insertAdjacentElement('afterend', aviso);
        }
    }

    // ------------------------------------------------------
    // Arranque
    // ------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();