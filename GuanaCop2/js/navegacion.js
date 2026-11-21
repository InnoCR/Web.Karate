/* =========================================================
   GUANACOP2 · navegacion.js
   Cambio entre vistas del módulo + helpers de navegación
   ========================================================= */

(function () {
    'use strict';

    // Mapa de vistas del módulo
    const VISTAS = {
        'formulario': 'vista-formulario-adultos',
        'confirmacion': 'vista-confirmacion-adultos'
    };

    /**
     * Muestra una vista y oculta las demás.
     * @param {string} nombreVista  'formulario' | 'confirmacion'
     * @param {object} [opciones]
     * @param {boolean} [opciones.scrollTop=true]  Si true, hace scroll al tope
     */
    function irA(nombreVista, opciones = {}) {
        const { scrollTop = true } = opciones;
        const idDestino = VISTAS[nombreVista];
        if (!idDestino) {
            console.warn(`[GC2] Vista desconocida: "${nombreVista}"`);
            return;
        }

        const todas = document.querySelectorAll('.vista');
        todas.forEach((v) => v.classList.remove('vista-activa'));

        const destino = document.getElementById(idDestino);
        if (destino) {
            destino.classList.add('vista-activa');
            if (scrollTop) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            // Emitir evento para que otros scripts reaccionen
            document.dispatchEvent(new CustomEvent('gc2:vista-cambiada', {
                detail: { vista: nombreVista, id: idDestino }
            }));
        } else {
            console.error(`[GC2] No se encontró el elemento #${idDestino}`);
        }
    }

    /**
     * Devuelve el nombre lógico de la vista actualmente visible.
     * @returns {string|null}
     */
    function vistaActual() {
        for (const [nombre, id] of Object.entries(VISTAS)) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('vista-activa')) return nombre;
        }
        return null;
    }

    // Exponer API en window.GC2 (ya creado por config.js)
    window.GC2 = window.GC2 || {};
    window.GC2.nav = {
        irA,
        vistaActual,
        VISTAS
    };

    // Atajo por si otros scripts quieren usar solo `GC2.irA(...)`
    window.GC2.irA = irA;

    console.info('[GC2] Navegación lista.');
})();