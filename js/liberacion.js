/* =========================================================
   GUANA-CUP 2026 · liberacion.js
   - Texto de la liberación de responsabilidad
   - Modal en la landing
   - Render en el Paso 3
   - Firma dibujada en canvas (mouse + touch)
   - Validación de aceptación
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // ------------------------------------------------------
    // Texto de la liberación (borrador editable)
    // ------------------------------------------------------
    const TEXTO_LIBERACION = `
    <h3>1. Declaración del competidor</h3>
    <p>
      Yo, el/la firmante, declaro que participo de forma <strong>voluntaria</strong>
      en el <strong>Torneo Guana-Cup 2026</strong>, organizado por la
      <strong>International Budokai Union — Kyokushin</strong>, y que he leído,
      comprendido y aceptado el presente documento en su totalidad.
    </p>

    <h3>2. Estado físico y médico</h3>
    <p>
      Declaro encontrarme en <strong>condiciones físicas y médicas aptas</strong>
      para la práctica del Karate Kyokushin y para participar en la competencia
      de <strong>kumite</strong>. Asimismo, manifiesto no padecer ninguna
      condición que me impida competir y me comprometo a informar al organizador
      cualquier situación relevante.
    </p>

    <h3>3. Conocimiento de los riesgos</h3>
    <p>
      Reconozco que el Karate Kyokushin es un deporte de contacto y que la
      participación en un torneo implica <strong>riesgos inherentes</strong> de
      lesión, incluyendo pero no limitándose a: contusiones, esguinces,
      fracturas, lesiones musculares o articulares, y en casos excepcionales,
      lesiones de mayor gravedad.
    </p>

    <h3>4. Exención de responsabilidad</h3>
    <p>
      En consecuencia, <strong>eximo de toda responsabilidad</strong> al
      organizador, a la International Budokai Union — Kyokushin, a los árbitros,
      jueces, staff, patrocinadores, sede y colaboradores, por cualquier lesión,
      daño o perjuicio que pudiera sufrir durante mi participación en el torneo
      o en actividades relacionadas.
    </p>

    <h3>5. Autorización de atención médica</h3>
    <p>
      En caso de requerirlo, <strong>autorizo</strong> al personal de primeros
      auxilios y a los servicios médicos disponibles a brindarme la atención
      necesaria, incluyendo traslado a un centro médico si fuera indispensable.
    </p>

    <h3>6. Uso de imagen</h3>
    <p>
      Autorizo el <strong>uso de mi imagen</strong> (fotografías y videos)
      capturada durante el torneo, con fines informativos, promocionales y de
      difusión del evento, sin derecho a compensación económica.
    </p>

    <h3>7. Menores de edad</h3>
    <p>
      El/la firmante declara ser <strong>padre, madre o encargado legal</strong>
      del competidor menor de edad, y acepta el presente documento en su nombre,
      asumiendo toda la responsabilidad que corresponda.
    </p>

    <h3>8. Aceptación</h3>
    <p>
      Declaro que he leído y comprendido los términos de esta liberación de
      responsabilidad, y que la acepto <strong>de forma libre y voluntaria</strong>.
    </p>
  `;

    // ------------------------------------------------------
    // Estado de la firma
    // ------------------------------------------------------
    const firma = {
        ctx: null,
        dibujada: false,
        dibujando: false,
        ultimoPunto: null,
        canvas: null,
        anchoCSS: 0,
        altoCSS: 0
    };

    // ------------------------------------------------------
    // Render del texto en el modal y en el Paso 3
    // ------------------------------------------------------
    function renderTexto() {
        const enModal = $('#modalLiberacionBody');
        if (enModal) enModal.innerHTML = TEXTO_LIBERACION;

        const enFormulario = $('#liberacionTexto');
        if (enFormulario) enFormulario.innerHTML = TEXTO_LIBERACION;
    }

    // ------------------------------------------------------
    // Abrir y cerrar el modal
    // ------------------------------------------------------
    function abrirModal() {
        const modal = $('#modalLiberacion');
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function cerrarModal() {
        const modal = $('#modalLiberacion');
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = '';
    }

    function engancharModal() {
        const btnVer = $('#btnVerLiberacionLanding');
        if (btnVer) btnVer.addEventListener('click', abrirModal);

        $$('[data-close-modal]').forEach(el => {
            el.addEventListener('click', cerrarModal);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarModal();
        });
    }

    // ======================================================
    // FIRMA EN CANVAS
    // ======================================================

    function configurarContexto() {
        const canvas = firma.canvas;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        firma.anchoCSS = rect.width || 600;
        firma.altoCSS = rect.height || 200;

        canvas.width = firma.anchoCSS * dpr;
        canvas.height = firma.altoCSS * dpr;

        firma.ctx = canvas.getContext('2d');
        firma.ctx.setTransform(1, 0, 0, 1, 0, 0);
        firma.ctx.scale(dpr, dpr);

        firma.ctx.lineWidth = 2.5;
        firma.ctx.lineCap = 'round';
        firma.ctx.lineJoin = 'round';
        firma.ctx.strokeStyle = '#0a0a0a';
    }

    function initFirmaCanvas() {
        const canvas = $('#firmaCanvas');
        if (!canvas) return;

        firma.canvas = canvas;
        configurarContexto();

        canvas.addEventListener('pointerdown', iniciarTrazo);
        canvas.addEventListener('pointermove', trazar);
        canvas.addEventListener('pointerup', finalizarTrazo);
        canvas.addEventListener('pointercancel', finalizarTrazo);
        canvas.addEventListener('pointerleave', finalizarTrazo);

        const btnLimpiar = $('#btnLimpiarFirma');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', (e) => {
                e.preventDefault();
                limpiarFirma();
            });
        }

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(redimensionarCanvas, 200);
        });
    }

    function redimensionarCanvas() {
        const canvas = firma.canvas;
        if (!canvas) return;

        const dataGuardada = firma.dibujada ? canvas.toDataURL() : null;

        configurarContexto();

        if (dataGuardada) {
            const img = new Image();
            img.onload = () => {
                firma.ctx.drawImage(img, 0, 0, firma.anchoCSS, firma.altoCSS);
            };
            img.src = dataGuardada;
        }
    }

    function getPos(e) {
        return {
            x: e.offsetX,
            y: e.offsetY
        };
    }

    function iniciarTrazo(e) {
        e.preventDefault();
        firma.canvas.setPointerCapture(e.pointerId);
        firma.dibujando = true;
        firma.dibujada = true;
        firma.ultimoPunto = getPos(e);

        const wrap = $('#firmaWrap');
        if (wrap) wrap.classList.remove('error');
        const err = $('#firmaError');
        if (err) err.textContent = '';
    }

    function trazar(e) {
        if (!firma.dibujando || !firma.ctx) return;
        e.preventDefault();

        const pos = getPos(e);
        firma.ctx.beginPath();
        firma.ctx.moveTo(firma.ultimoPunto.x, firma.ultimoPunto.y);
        firma.ctx.lineTo(pos.x, pos.y);
        firma.ctx.stroke();
        firma.ultimoPunto = pos;
    }

    function finalizarTrazo(e) {
        if (e) e.preventDefault();
        firma.dibujando = false;
        firma.ultimoPunto = null;
    }

    function limpiarFirma() {
        if (!firma.canvas || !firma.ctx) return;
        firma.ctx.clearRect(0, 0, firma.canvas.width, firma.canvas.height);
        firma.dibujada = false;

        const wrap = $('#firmaWrap');
        if (wrap) wrap.classList.remove('error');
        const err = $('#firmaError');
        if (err) err.textContent = '';
    }

    function firmaEstaFirmada() {
        return firma.dibujada;
    }

    function obtenerFirmaDataURL() {
        if (!firma.canvas || !firma.dibujada) return null;
        return firma.canvas.toDataURL('image/png');
    }

    // ======================================================
    // VALIDACIÓN DEL PASO 3 (LIBERACIÓN)
    // ======================================================
    function validarPasoLiberacion() {
        const errores = [];

        const nombre = $('#firmaNombre');
        const identificacion = $('#firmaIdentificacion');
        const parentesco = $('#firmaParentesco');
        const acepto = $('#aceptoLiberacion');

        if (!nombre || !nombre.value.trim() || nombre.value.trim().length < 5) {
            errores.push('Debes escribir el nombre completo de quien firma.');
            marcarError(nombre, 'Nombre inválido');
        } else {
            limpiarError(nombre);
        }

        if (!identificacion || !identificacion.value.trim()) {
            errores.push('Debes indicar la identificación de quien firma.');
            marcarError(identificacion, 'Identificación requerida');
        } else {
            limpiarError(identificacion);
        }

        // Todos son menores, así que parentesco siempre es obligatorio
        if (!parentesco || !parentesco.value.trim()) {
            errores.push('Indica el parentesco del tutor responsable.');
            marcarError(parentesco, 'Parentesco requerido');
        } else {
            limpiarError(parentesco);
        }

        if (!firmaEstaFirmada()) {
            errores.push('Debes dibujar tu firma en el recuadro.');
            const wrap = $('#firmaWrap');
            if (wrap) wrap.classList.add('error');
            const err = $('#firmaError');
            if (err) err.textContent = 'Por favor dibuja tu firma en el recuadro';
        } else {
            const wrap = $('#firmaWrap');
            if (wrap) wrap.classList.remove('error');
            const err = $('#firmaError');
            if (err) err.textContent = '';
        }

        if (!acepto || !acepto.checked) {
            errores.push('Debes aceptar la liberación de responsabilidad.');
            const wrap = acepto?.closest('.campo-check');
            if (wrap) wrap.classList.add('error');
        } else {
            const wrap = acepto?.closest('.campo-check');
            if (wrap) wrap.classList.remove('error');
        }

        return {
            valido: errores.length === 0,
            errores
        };
    }

    function marcarError(input, msg) {
        if (!input) return;
        const campo = input.closest('.campo') || input.parentElement;
        if (campo) {
            campo.classList.add('error');
            const small = campo.querySelector('.error-msg');
            if (small) small.textContent = msg;
        }
    }

    function limpiarError(input) {
        if (!input) return;
        const campo = input.closest('.campo') || input.parentElement;
        if (campo) {
            campo.classList.remove('error');
            const small = campo.querySelector('.error-msg');
            if (small) small.textContent = '';
        }
    }

    // ------------------------------------------------------
    // Devuelve los datos de la liberación
    // ------------------------------------------------------
    function obtenerDatosLiberacion() {
        return {
            texto: TEXTO_LIBERACION,
            firmaNombre: $('#firmaNombre')?.value.trim() || '',
            firmaIdentificacion: $('#firmaIdentificacion')?.value.trim() || '',
            firmaParentesco: $('#firmaParentesco')?.value.trim() || '',
            acepto: $('#aceptoLiberacion')?.checked || false,
            fechaAceptacion: new Date().toISOString(),
            firmaImagen: obtenerFirmaDataURL()
        };
    }

    // ------------------------------------------------------
    // Reset del paso 3
    // ------------------------------------------------------
    function reset() {
        const ids = ['firmaNombre', 'firmaIdentificacion', 'firmaParentesco', 'aceptoLiberacion'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
            limpiarError(el);
        });

        const wrapCheck = $('#aceptoLiberacion')?.closest('.campo-check');
        if (wrapCheck) wrapCheck.classList.remove('error');

        limpiarFirma();
    }

    // ------------------------------------------------------
    // API pública
    // ------------------------------------------------------
    window.Liberacion = {
        TEXTO_LIBERACION,
        abrirModal,
        cerrarModal,
        validarPasoLiberacion,
        obtenerDatosLiberacion,
        firmaEstaFirmada,
        limpiarFirma,
        reset
    };

    // ------------------------------------------------------
    // Arranque
    // ------------------------------------------------------
    function init() {
        renderTexto();
        engancharModal();
        initFirmaCanvas();
    }

    document.addEventListener('app:listo', init);
    if (window.APP && window.APP.listo) init();

})();