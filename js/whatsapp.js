/* =========================================================
   GUANA-CUP 2026 · whatsapp.js
   Arma el mensaje de WhatsApp y abre el chat.
   Sin emojis compuestos para evitar caracteres rotos.
   ========================================================= */

(function () {
    'use strict';

    // ------------------------------------------------------
    // Normaliza el texto: quita \r, colapsa saltos, trim
    // ------------------------------------------------------
    function normalizarTexto(texto) {
        return texto
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .map(l => l.replace(/\s+$/, ''))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // ------------------------------------------------------
    // Codifica el texto para URL de WhatsApp
    // ------------------------------------------------------
    function codificarParaWA(texto) {
        return encodeURIComponent(texto);
    }

    // ------------------------------------------------------
    // Genera el mensaje a partir de los datos
    // ------------------------------------------------------
    function generarMensaje(datos) {
        const cfg = window.APP.config || {};
        const simbolo = cfg.simboloMoneda || '₡';

        const listaCategorias = datos.categorias
            .map(c => `  • ${c.nombre} — ${window.formatMoneda(c.precio, simbolo, cfg.locale)}`)
            .join('\n');

        const bloqueTutor = datos.tutor && datos.tutor.nombre
            ? `*Tutor responsable:* ${datos.tutor.nombre} (${datos.tutor.parentesco})`
            : '';

        const lineas = [
            '*Inscripción Torneo Guana-Cup 2026*',
            '',
            `Hola, soy *${datos.competidor.nombre}*.`,
            'Acabo de completar mi inscripción al torneo.',
            '',
            `*Folio:* ${datos.folio}`,
            `*Competidor:* ${datos.competidor.nombre}`,
            `*Edad:* ${datos.competidor.edad} años`,
            `*Dojo:* ${datos.competidor.dojo}`,
            `*Grado:* ${datos.competidor.grado}`,
            bloqueTutor,
            '',
            '*Categorías inscritas:*',
            listaCategorias,
            '',
            `*Total a pagar:* ${window.formatMoneda(datos.total, simbolo, cfg.locale)}`,
            '',
            '*Datos para SINPE Móvil:*',
            `Número: ${cfg.sinpe?.numero || '—'}`,
            `Titular: ${cfg.sinpe?.titular || '—'}`,
            '',
            '*En un momento adjunto mi liberación de responsabilidad firmada (PDF).*',
            '',
            '*En un momento le envío el comprobante del pago por SINPE Móvil.*',
            '',
            'Quedo atento(a) para coordinar. ¡Gracias!'
        ];

        return normalizarTexto(lineas.join('\n'));
    }

    // ------------------------------------------------------
    // Abre WhatsApp con el mensaje
    // ------------------------------------------------------
    function abrirWhatsApp(datos) {
        const cfg = window.APP.config || {};
        const numero = cfg.whatsappOrganizador;
        if (!numero) {
            alert('No se encontró el número de WhatsApp del organizador.');
            return false;
        }

        const mensaje = generarMensaje(datos);
        const url = `https://api.whatsapp.com/send?phone=${numero}&text=${codificarParaWA(mensaje)}`;

        window.open(url, '_blank', 'noopener');
        return true;
    }

    // ------------------------------------------------------
    // Genera URL (útil para pruebas)
    // ------------------------------------------------------
    function generarURL(datos) {
        const cfg = window.APP.config || {};
        const numero = cfg.whatsappOrganizador;
        if (!numero) return '';
        return `https://api.whatsapp.com/send?phone=${numero}&text=${codificarParaWA(generarMensaje(datos))}`;
    }

    // ------------------------------------------------------
    // Contactar a un asesor
    // ------------------------------------------------------
    function contactarAsesor(mensajePersonalizado) {
        const cfg = window.APP.config || {};
        const numero = cfg.whatsappOrganizador;
        if (!numero) {
            alert('No se encontró el número de WhatsApp del organizador.');
            return false;
        }

        const mensaje = normalizarTexto(
            mensajePersonalizado ||
            'Hola, tengo una consulta sobre el Torneo Guana-Cup 2026. ¿Me pueden ayudar?'
        );

        const url = `https://api.whatsapp.com/send?phone=${numero}&text=${codificarParaWA(mensaje)}`;
        window.open(url, '_blank', 'noopener');
        return true;
    }

    // ------------------------------------------------------
    // API pública
    // ------------------------------------------------------
    window.WhatsApp = {
        generarMensaje,
        generarURL,
        abrirWhatsApp,
        contactarAsesor,
        normalizarTexto,
        codificarParaWA
    };

})();