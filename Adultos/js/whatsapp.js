/* =========================================================
   GUANACUP2 · whatsapp.js
   Construye el mensaje desde la plantilla del config
   y abre wa.me con el texto prellenado.
   Incluye recordatorio de adjuntar el PDF de liberación.
   ========================================================= */

(function () {
    'use strict';

    /**
     * Reemplaza todos los placeholders {clave} de una plantilla
     * con los valores del objeto datos.
     * @param {string} plantilla
     * @param {object} datos
     * @returns {string}
     */
    function interpolar(plantilla, datos) {
        return String(plantilla).replace(/\{(\w+)\}/g, (match, clave) => {
            return datos.hasOwnProperty(clave) ? datos[clave] : match;
        });
    }

    /**
     * Construye el mensaje de WhatsApp a partir de los datos del registro.
     * @param {object} registro
     * @param {string} registro.nombre
     * @param {string} registro.folio
     * @param {number} registro.monto
     * @returns {string}
     */
    function construirMensaje(registro) {
        const cfg = window.GC2.config;
        if (!cfg) {
            console.warn('[GC2] whatsapp.js: config no disponible aún.');
            return '';
        }

        const plantilla = (cfg.whatsapp && cfg.whatsapp.mensajeIntro) ||
            'Hola, soy {nombre}. Folio: {folio}. Total: {simbolo}{monto}.';

        return interpolar(plantilla, {
            nombre: registro.nombre || '',
            folio: registro.folio || '',
            simbolo: cfg.simboloMoneda || '₡',
            monto: Number(registro.monto || 0).toLocaleString(cfg.locale || 'es-CR', {
                maximumFractionDigits: 0
            })
        });
    }

    /**
     * Abre WhatsApp (app o web) con el mensaje prellenado.
     * @param {string} mensaje
     */
    function abrirWhatsApp(mensaje) {
        const cfg = window.GC2.config;
        if (!cfg || !cfg.whatsappOrganizador) {
            console.error('[GC2] whatsapp.js: no hay whatsappOrganizador en config.');
            return;
        }
        const numero = String(cfg.whatsappOrganizador).replace(/\D/g, '');
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener');
    }

    /**
     * Atajo: construye el mensaje y abre WhatsApp en un solo paso.
     * @param {object} registro
     */
    function enviar(registro) {
        const mensaje = construirMensaje(registro);
        if (!mensaje) return;
        abrirWhatsApp(mensaje);
    }

    /**
     * Construye un link wa.me sin abrirlo (útil para tests o preview).
     * @param {object} registro
     * @returns {string}
     */
    function construirUrl(registro) {
        const cfg = window.GC2.config;
        if (!cfg || !cfg.whatsappOrganizador) return '';
        const numero = String(cfg.whatsappOrganizador).replace(/\D/g, '');
        const mensaje = construirMensaje(registro);
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    }

    // ============================================
    // API PÚBLICA
    // ============================================
    window.GC2 = window.GC2 || {};
    window.GC2.whatsapp = {
        construirMensaje,
        abrirWhatsApp,
        enviar,
        construirUrl
    };

    console.info('[GC2] whatsapp.js cargado.');
})();