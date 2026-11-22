/* =========================================================
   GUANACOP2 · categorias.js
   Render de tarjetas de peleas acordadas + selección
   + cálculo del total en vivo
   ========================================================= */

(function () {
    'use strict';

    // Estado interno de selección: Set de ids
    const seleccionadas = new Set();

    /**
     * Devuelve el array de categorías seleccionadas (objetos completos).
     * @returns {Array<object>}
     */
    function obtenerSeleccionadas() {
        const cats = (window.GC2.peleas && window.GC2.peleas.categorias) || [];
        return cats.filter((c) => seleccionadas.has(c.id));
    }

    /**
     * Calcula el total a pagar según lo seleccionado.
     * @returns {number}
     */
    function calcularTotal() {
        return obtenerSeleccionadas().reduce((acc, c) => acc + Number(c.precio || 0), 0);
    }

    /**
     * Actualiza la caja de total en el DOM.
     */
    function actualizarTotalDOM() {
        const el = document.getElementById('totalPagarAdultos');
        if (!el) return;
        const total = calcularTotal();
        el.textContent = window.GC2.utils.formatearMonto(total);
        // Ocultar el aviso de "selecciona al menos una" si ya hay alguna
        const aviso = document.getElementById('ad_avisoCategorias');
        if (aviso && seleccionadas.size > 0) aviso.hidden = true;
    }

    /**
     * Construye el HTML de una tarjeta de categoría.
     * @param {object} cat
     * @returns {string}
     */
    function htmlCategoria(cat) {
        const esc = window.GC2.utils.escaparHTML;
        const precio = window.GC2.utils.formatearMonto(cat.precio);
        return `
      <label class="categoria-card" data-id="${esc(cat.id)}">
        <input type="checkbox" value="${esc(cat.id)}" />
        <span class="categoria-info">
          <span class="categoria-nombre">${esc(cat.nombre)}</span>
          <span class="categoria-desc">${esc(cat.descripcion || '')}</span>
        </span>
        <span class="categoria-precio">${precio}</span>
      </label>
    `;
    }

    /**
     * Renderiza todas las categorías en el contenedor.
     */
    function render() {
        const cont = document.getElementById('categoriasListaAdultos');
        if (!cont) return;

        const cats = (window.GC2.peleas && window.GC2.peleas.categorias) || [];
        if (!cats.length) {
            cont.innerHTML = '<p class="loading">No hay categorías disponibles.</p>';
            return;
        }

        cont.innerHTML = cats.map(htmlCategoria).join('');

        // Enganchar eventos
        cont.querySelectorAll('.categoria-card input[type="checkbox"]').forEach((chk) => {
            chk.addEventListener('change', onCambioCheckbox);
        });

        // Restaurar selección previa (si el usuario vuelve al paso 2)
        seleccionadas.forEach((id) => {
            const chk = cont.querySelector(`input[type="checkbox"][value="${cssEscape(id)}"]`);
            if (chk) {
                chk.checked = true;
                chk.closest('.categoria-card').classList.add('seleccionada');
            }
        });

        actualizarTotalDOM();
    }

    /**
     * Maneja el cambio de un checkbox.
     * @param {Event} e
     */
    function onCambioCheckbox(e) {
        const chk = e.target;
        const id = chk.value;
        const card = chk.closest('.categoria-card');

        if (chk.checked) {
            seleccionadas.add(id);
            card.classList.add('seleccionada');
        } else {
            seleccionadas.delete(id);
            card.classList.remove('seleccionada');
        }

        actualizarTotalDOM();
    }

    /**
     * Escapa un id para usarlo en querySelector (por si trae caracteres raros).
     * @param {string} str
     * @returns {string}
     */
    function cssEscape(str) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(str);
        }
        return String(str).replace(/["\\]/g, '\\$&');
    }

    /**
     * Limpia la selección (útil al reiniciar el formulario).
     */
    function limpiar() {
        seleccionadas.clear();
        const cont = document.getElementById('categoriasListaAdultos');
        if (cont) {
            cont.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
                chk.checked = false;
                const card = chk.closest('.categoria-card');
                if (card) card.classList.remove('seleccionada');
            });
        }
        actualizarTotalDOM();
    }

    // API pública para otros scripts
    window.GC2 = window.GC2 || {};
    window.GC2.categorias = {
        render,
        obtenerSeleccionadas,
        calcularTotal,
        limpiar,
        get seleccionadas() { return Array.from(seleccionadas); }
    };

    // Renderizar cuando la config esté lista
    document.addEventListener('gc2:config-listo', () => {
        render();
    });

    console.info('[GC2] Categorías listas.');
})();