/* =========================================================
   GUANA-CUP 2027 · liberacion.js
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
    // Texto de la liberación (actualizado 2027)
    // ------------------------------------------------------
    const TEXTO_LIBERACION = `
    <h3>1. Autorización de participación</h3>
    <p>
      Por medio de la presente autorizo <strong>voluntariamente</strong> al menor
      anteriormente indicado a participar en el <strong>Torneo de Karate
      "Guana-Cup 2027"</strong>, organizado por la International Budokai Union —
      Kyokushin.
    </p>

    <h3>2. Conocimiento de la naturaleza de la competencia</h3>
    <p>
      Declaro que conozco la naturaleza de esta competencia y entiendo que el
      <strong>Kumite</strong> es una modalidad de Karate Kyokushin que implica
      <strong>contacto físico</strong> entre los participantes. Por esta razón,
      comprendo que, aun cuando se respeten las reglas establecidas, exista
      supervisión de árbitros y jueces y se utilicen las protecciones
      correspondientes, <strong>pueden presentarse riesgos propios de la
      actividad deportiva</strong>.
    </p>

    <h3>3. Riesgos inherentes</h3>
    <p>
      Entre estos riesgos pueden encontrarse golpes, caídas, contusiones,
      lesiones musculares, articulares u óseas, así como otras lesiones que
      eventualmente podrían requerir valoración o atención médica.
    </p>
    <p>
      También comprendo que, aunque se adopten medidas razonables de prevención y
      seguridad, <strong>no es posible eliminar completamente los riesgos</strong>
      inherentes a una competencia de contacto físico y que, en circunstancias
      excepcionales, podrían producirse lesiones de mayor gravedad.
    </p>

    <h3>4. Exención de responsabilidad</h3>
    <p>
      En consecuencia, <strong>eximo de toda responsabilidad</strong> al
      organizador, a la International Budokai Union — Kyokushin, a los árbitros,
      jueces, staff, patrocinadores, sede y colaboradores, por cualquier lesión,
      daño o perjuicio que pudiera sufrir durante mi participación en el torneo
      o en actividades relacionadas.
    </p>

    <h3>5. Veracidad de la información y compromisos</h3>
    <p>
      Declaro que he tenido la oportunidad de conocer las condiciones y reglas
      generales de participación y que, teniendo conocimiento de los riesgos
      propios de esta actividad, <strong>otorgo mi autorización</strong> para que
      el menor participe en la competencia.
    </p>
    <p>
      Asimismo, manifiesto que la <strong>información proporcionada sobre el
      menor es verdadera</strong> y que he informado a la organización sobre
      cualquier condición física, lesión, limitación, alergia, tratamiento médico
      o circunstancia que pueda ser relevante para su participación.
    </p>
    <p>
      Me comprometo a <strong>comunicar a la organización</strong> cualquier
      cambio en la condición del menor que pudiera afectar su participación.
    </p>

    <h3>6. Uso de imagen</h3>
    <p>
      Autorizo el <strong>uso de mi imagen</strong> (fotografías y videos)
      capturada durante el torneo, con fines informativos, promocionales y de
      difusión del evento, sin derecho a compensación económica.
    </p>

    <h3>7. Disciplina y facultades de la organización</h3>
    <p>
      Entiendo que el menor deberá <strong>respetar las instrucciones</strong>
      de los árbitros, jueces, instructores y organizadores durante toda la
      actividad. Asimismo, acepto que los responsables del torneo podrán
      <strong>detener su participación o retirarlo de un combate</strong> cuando
      consideren que continuar representa un riesgo para su integridad física o
      para la de otro participante.
    </p>

    <h3>8. Atención en caso de emergencia</h3>
    <p>
      En caso de que el menor sufra una lesión, accidente, malestar o cualquier
      situación que requiera atención durante el torneo, <strong>autorizo</strong>
      a los responsables de la organización a solicitar asistencia médica o de
      emergencia cuando sea necesario, procurando contactar al padre, madre o
      representante legal a la mayor brevedad posible.
    </p>

    <h3>9. Aceptación</h3>
    <p>
      Declaro que he <strong>leído y comprendido completamente</strong> este
      documento, que he podido realizar las consultas que considero necesarias
      y que otorgo esta autorización de manera <strong>libre y voluntaria</strong>.
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