/* =========================================================
   GUANA-CUP 2026 · categorias.js
   - Render de categorías en la landing (informativo)
   - Render de categorías en el formulario (seleccionables)
   - Cálculo del total a pagar en vivo
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // ------------------------------------------------------
    // Estado interno
    // ------------------------------------------------------
    const state = {
        seleccionadas: new Set(),   // ids de categorías seleccionadas
        bloqueActual: null          // bloque de edad del competidor
    };

    // ------------------------------------------------------
    // Render en la LANDING (tarjetas informativas)
    // ------------------------------------------------------
    function renderLanding() {
        const contenedor = $('#categoriasGrid');
        if (!contenedor) return;

        const categorias = window.APP.categorias;
        if (!categorias || categorias.length === 0) {
            contenedor.innerHTML = '<p class="loading">No hay categorías disponibles.</p>';
            return;
        }

        const cfg = window.APP.config;
        const simbolo = cfg?.simboloMoneda || '₡';

        contenedor.innerHTML = categorias.map(cat => {
            const bloque = window.APP.bloquesEdad.find(b => b.id === cat.bloqueEdad);
            const nombreBloque = bloque ? bloque.nombre : cat.bloqueEdad;

            return `
        <article class="categoria-card">
          <span class="categoria-bloque">${nombreBloque}</span>
          <h3 class="categoria-nombre">${cat.nombre}</h3>
          <p class="categoria-desc">${cat.descripcion || ''}</p>
          <span class="categoria-precio">${window.formatMoneda(cat.precio, simbolo, cfg?.locale)}</span>
        </article>
      `;
        }).join('');
    }

    // ------------------------------------------------------
    // Render en el FORMULARIO (seleccionables)
    // Filtra por bloque de edad del competidor
    // ------------------------------------------------------
    function renderFormulario(bloqueId) {
        const contenedor = $('#categoriasLista');
        if (!contenedor) return;

        state.bloqueActual = bloqueId;

        const cfg = window.APP.config;
        const simbolo = cfg?.simboloMoneda || '₡';

        // Filtrar categorías por bloque de edad
        const categorias = window.APP.categorias.filter(cat =>
            !bloqueId || cat.bloqueEdad === bloqueId
        );

        if (categorias.length === 0) {
            contenedor.innerHTML = `
        <p class="loading">
          No hay categorías disponibles para este bloque de edad.
          Contacta al organizador.
        </p>
      `;
            actualizarTotal();
            return;
        }

        // Limpiar selecciones que ya no aplican
        const idsValidos = new Set(categorias.map(c => c.id));
        state.seleccionadas.forEach(id => {
            if (!idsValidos.has(id)) state.seleccionadas.delete(id);
        });

        // Render
        contenedor.innerHTML = categorias.map(cat => {
            const checked = state.seleccionadas.has(cat.id) ? 'checked' : '';
            const selected = state.seleccionadas.has(cat.id) ? 'selected' : '';

            return `
        <label class="categoria-option ${selected}" data-id="${cat.id}">
          <input type="checkbox" name="categorias" value="${cat.id}" ${checked}>
          <span class="check-box"></span>
          <span class="categoria-option-info">
            <span class="nombre">${cat.nombre}</span>
            ${cat.descripcion ? `<span class="desc">${cat.descripcion}</span>` : ''}
            <span class="precio">${window.formatMoneda(cat.precio, simbolo, cfg?.locale)}</span>
          </span>
        </label>
      `;
        }).join('');

        // Re-enganchar listeners
        engancharListeners(contenedor);
        actualizarTotal();
    }

    // ------------------------------------------------------
    // Listeners de los checkboxes de categorías
    // ------------------------------------------------------
    function engancharListeners(contenedor) {
        $$('.categoria-option', contenedor).forEach(label => {
            const input = $('input[type="checkbox"]', label);
            if (!input) return;

            input.addEventListener('change', () => {
                const id = input.value;

                if (input.checked) {
                    state.seleccionadas.add(id);
                    label.classList.add('selected');
                } else {
                    state.seleccionadas.delete(id);
                    label.classList.remove('selected');
                }

                actualizarTotal();
                // Notificar al formulario
                document.dispatchEvent(new CustomEvent('categorias:change', {
                    detail: { seleccionadas: obtenerSeleccionadas() }
                }));
            });
        });
    }

    // ------------------------------------------------------
    // Devuelve las categorías seleccionadas (objetos completos)
    // ------------------------------------------------------
    function obtenerSeleccionadas() {
        return Array.from(state.seleccionadas)
            .map(id => window.APP.categorias.find(c => c.id === id))
            .filter(Boolean);
    }

    // ------------------------------------------------------
    // Calcula y pinta el total a pagar
    // ------------------------------------------------------
    function actualizarTotal() {
        const cfg = window.APP.config;
        const simbolo = cfg?.simboloMoneda || '₡';
        const seleccionadas = obtenerSeleccionadas();
        const total = seleccionadas.reduce((acc, c) => acc + Number(c.precio || 0), 0);

        const nodoTotal = $('#totalPagar');
        if (nodoTotal) {
            nodoTotal.textContent = window.formatMoneda(total, simbolo, cfg?.locale);
        }

        return total;
    }

    // ------------------------------------------------------
    // API pública (para formulario.js)
    // ------------------------------------------------------
    window.Categorias = {
        renderFormulario,
        obtenerSeleccionadas,
        actualizarTotal,
        getSeleccionadasIds: () => Array.from(state.seleccionadas),
        setBloqueEdad: (bloqueId) => {
            state.bloqueActual = bloqueId;
        },
        reset: () => {
            state.seleccionadas.clear();
            actualizarTotal();
        }
    };

    // ------------------------------------------------------
    // Arranque
    // ------------------------------------------------------
    function init() {
        renderLanding();
    }

    document.addEventListener('app:listo', init);
    if (window.APP && window.APP.listo) init();

})();