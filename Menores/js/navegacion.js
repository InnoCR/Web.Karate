/* =========================================================
   GUANA-CUP 2026 · navegacion.js
   Controla el cambio entre las 3 vistas (landing, formulario,
   confirmación), el scroll al inicio y la bandera de
   inscripciones cerradas.
   ========================================================= */

(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ------------------------------------------------------
  // Referencias a las vistas
  // ------------------------------------------------------
  const VISTAS = {
    landing:      '#vista-landing',
    formulario:   '#vista-formulario',
    confirmacion: '#vista-confirmacion'
  };

  const CLASE_ACTIVA = 'vista-activa';

  // ------------------------------------------------------
  // Cambia a una vista determinada
  // ------------------------------------------------------
  function irA(nombre) {
    const selector = VISTAS[nombre];
    if (!selector) {
      console.warn('[navegacion.js] Vista desconocida:', nombre);
      return;
    }

    // Bloquear acceso al formulario si las inscripciones están cerradas
    if (nombre === 'formulario' && !window.APP.inscripcionesActivas) {
      alert('Las inscripciones están cerradas. Contacta al organizador por WhatsApp.');
      return;
    }

    // Ocultar todas las vistas
    $$('.vista').forEach(v => v.classList.remove(CLASE_ACTIVA));

    // Mostrar la solicitada
    const vista = $(selector);
    if (vista) {
      vista.classList.add(CLASE_ACTIVA);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Disparar evento para que otros scripts reaccionen
    document.dispatchEvent(new CustomEvent('vista:change', {
      detail: { vista: nombre }
    }));
  }

  // ------------------------------------------------------
  // Engancha los botones con [data-nav]
  // ------------------------------------------------------
  function engancharBotonesNav() {
    $$('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const destino = btn.getAttribute('data-nav');
        irA(destino);
      });
    });
  }

  // ------------------------------------------------------
  // Engancha los links con ancla (#info, #hero, etc.)
  // Solo funcionan si estamos en la landing
  // ------------------------------------------------------
  function engancharAnclas() {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // Ignorar href="#" o vacíos
        if (!href || href === '#') return;

        // Si no estamos en la landing, primero navegar
        const landingActiva = $(VISTAS.landing)?.classList.contains(CLASE_ACTIVA);
        if (!landingActiva) {
          e.preventDefault();
          irA('landing');
          setTimeout(() => {
            const target = $(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
          return;
        }

        // Si ya estamos en landing, scroll suave
        const target = $(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ------------------------------------------------------
  // API pública
  // ------------------------------------------------------
  window.Navegacion = {
    irA,
    getVistaActual: () => {
      const activa = $$('.vista').find(v => v.classList.contains(CLASE_ACTIVA));
      if (!activa) return null;
      return activa.id.replace('vista-', '');
    }
  };

  // ------------------------------------------------------
  // Arranque
  // ------------------------------------------------------
  function init() {
    engancharBotonesNav();
    engancharAnclas();
  }

  document.addEventListener('app:listo', init);
  if (window.APP && window.APP.listo) init();

})();