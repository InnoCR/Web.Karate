/* =========================================================
   GUANACUP2 · liberacion.js
   Renderiza el texto legal (secciones), maneja el canvas
   de firma (mouse + touch), valida la aceptación y expone
   los datos de la firma para el POST y el PDF.
   ========================================================= */

(function () {
    'use strict';

    // ============================================
    // ESTADO DE LA FIRMA
    // ============================================
    const firma = {
        ctx: null,
        canvas: null,
        dibujada: false,
        dibujando: false,
        ultimoPunto: null,
        anchoCSS: 0,
        altoCSS: 0,
        fechaAceptacion: null
    };

    // Referencias DOM
    let contenedorTexto, inputNombre, inputIdentificacion, checkAcepto, campoCheck;

    // ============================================
    // RENDER DEL TEXTO
    // ============================================
    function renderTexto() {
        contenedorTexto = document.getElementById('liberacionTexto');
        if (!contenedorTexto) {
            console.warn('[GC2] liberacion.js: no se encontró #liberacionTexto');
            return;
        }

        const data = window.GC2.liberacion;
        if (!data || !Array.isArray(data.secciones)) {
            contenedorTexto.innerHTML = '<p class="error">No se pudo cargar el texto de liberación.</p>';
            return;
        }

        const esc = window.GC2.utils.escaparHTML;

        let html = '';
        if (data.titulo) {
            html += `<h3 class="liberacion-titulo">${esc(data.titulo)}</h3>`;
        }
        html += '<div class="liberacion-secciones">';
        data.secciones.forEach((sec) => {
            html += `<h4 class="liberacion-seccion-titulo">${esc(sec.titulo)}</h4>`;
            sec.parrafos.forEach((p) => {
                html += `<p>${esc(p)}</p>`;
            });
        });
        html += '</div>';

        contenedorTexto.innerHTML = html;

        console.info('[GC2] Texto de liberación renderizado:', data.secciones.length, 'secciones');
    }

    // ============================================
    // CANVAS DE FIRMA
    // ============================================
    function configurarContexto() {
        const canvas = firma.canvas;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        firma.anchoCSS = rect.width || 600;
        firma.altoCSS = rect.height || 180;

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

    function initCanvas() {
        const canvas = document.getElementById('ad_firmaCanvas');
        if (!canvas) {
            console.warn('[GC2] liberacion.js: no se encontró #ad_firmaCanvas');
            return;
        }

        firma.canvas = canvas;
        configurarContexto();

        canvas.addEventListener('pointerdown', iniciarTrazo);
        canvas.addEventListener('pointermove', trazar);
        canvas.addEventListener('pointerup', finalizarTrazo);
        canvas.addEventListener('pointercancel', finalizarTrazo);
        canvas.addEventListener('pointerleave', finalizarTrazo);

        const btnLimpiar = document.getElementById('ad_btnLimpiarFirma');
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

        console.info('[GC2] Canvas de firma inicializado.');
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
        const rect = firma.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function iniciarTrazo(e) {
        e.preventDefault();
        firma.canvas.setPointerCapture(e.pointerId);
        firma.dibujando = true;
        firma.dibujada = true;
        firma.ultimoPunto = getPos(e);

        const wrap = document.getElementById('ad_firmaWrap');
        if (wrap) wrap.classList.remove('error');
        const err = document.getElementById('ad_firmaError');
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

        const wrap = document.getElementById('ad_firmaWrap');
        if (wrap) wrap.classList.remove('error');
        const err = document.getElementById('ad_firmaError');
        if (err) err.textContent = '';
    }

    function firmaEstaFirmada() {
        return firma.dibujada;
    }

    function obtenerFirmaDataURL() {
        if (!firma.canvas || !firma.dibujada) return null;
        return firma.canvas.toDataURL('image/png');
    }

    // ============================================
    // CAMPOS DE FIRMA (readonly, vienen del Paso 1)
    // ============================================
    function initCamposFirma() {
        inputNombre = document.getElementById('ad_firmaNombre');
        inputIdentificacion = document.getElementById('ad_firmaIdentificacion');
        checkAcepto = document.getElementById('ad_aceptoLiberacion');
        campoCheck = checkAcepto ? checkAcepto.closest('.campo-check') : null;

        if (!inputNombre || !inputIdentificacion || !checkAcepto) {
            console.warn('[GC2] liberacion.js: faltan campos de firma en el DOM');
            return;
        }

        // Los inputs son readonly, no necesitan listeners de input.
        // Solo el check cambia estado.
        checkAcepto.addEventListener('change', () => {
            if (campoCheck) {
                if (checkAcepto.checked) {
                    campoCheck.classList.remove('invalido');
                }
            }
        });

        console.info('[GC2] Campos de firma enganchados.');
    }

    /**
     * Auto-rellena los inputs readonly con los datos del competidor.
     * Se llama al entrar al Paso 2.
     * @param {object} datos  { nombreCompleto, identificacion }
     */
    function prellenarFirmante(datos) {
        if (!datos) return;
        if (inputNombre) inputNombre.value = datos.nombreCompleto || '';
        if (inputIdentificacion) inputIdentificacion.value = datos.identificacion || '';
    }

    // ============================================
    // VALIDACIÓN
    // ============================================
    function validarFirma() {
        let ok = true;

        // Nombre (readonly, viene del Paso 1)
        if (inputNombre) {
            const campo = inputNombre.closest('.campo');
            if (!inputNombre.value.trim() || inputNombre.value.trim().length < 5) {
                marcarInvalido(campo, 'Falta el nombre del firmante. Vuelve al Paso 1.');
                ok = false;
            } else {
                limpiarInvalido(campo);
            }
        } else {
            ok = false;
        }

        // Identificación (readonly, viene del Paso 1)
        if (inputIdentificacion) {
            const campo = inputIdentificacion.closest('.campo');
            if (!inputIdentificacion.value.trim()) {
                marcarInvalido(campo, 'Falta la identificación del firmante. Vuelve al Paso 1.');
                ok = false;
            } else {
                limpiarInvalido(campo);
            }
        } else {
            ok = false;
        }

        // Canvas de firma
        if (!firmaEstaFirmada()) {
            const wrap = document.getElementById('ad_firmaWrap');
            if (wrap) wrap.classList.add('error');
            const err = document.getElementById('ad_firmaError');
            if (err) err.textContent = 'Por favor dibuja tu firma en el recuadro.';
            ok = false;
        } else {
            const wrap = document.getElementById('ad_firmaWrap');
            if (wrap) wrap.classList.remove('error');
            const err = document.getElementById('ad_firmaError');
            if (err) err.textContent = '';
        }

        // Check de aceptación
        if (checkAcepto) {
            if (!checkAcepto.checked) {
                marcarInvalido(campoCheck, 'Debes aceptar la liberación de responsabilidad para continuar.');
                ok = false;
            } else {
                limpiarInvalido(campoCheck);
            }
        } else {
            ok = false;
        }

        return ok;
    }

    function marcarInvalido(campo, msg) {
        if (!campo) return;
        campo.classList.add('invalido');
        const err = campo.querySelector('.error-msg');
        if (err) err.textContent = msg || 'Campo inválido.';
    }

    function limpiarInvalido(campo) {
        if (!campo) return;
        campo.classList.remove('invalido');
        const err = campo.querySelector('.error-msg');
        if (err) err.textContent = '';
    }

    // ============================================
    // DATOS DE LA FIRMA
    // ============================================
    function obtenerDatosFirma() {
        return {
            nombre: inputNombre ? inputNombre.value.trim() : '',
            identificacion: inputIdentificacion ? inputIdentificacion.value.trim() : '',
            acepto: checkAcepto ? checkAcepto.checked : false,
            fechaAceptacion: firma.fechaAceptacion || new Date().toISOString(),
            firmaImagen: obtenerFirmaDataURL()
        };
    }

    function finalizarFirma() {
        firma.fechaAceptacion = new Date().toISOString();
    }

    // ============================================
    // RESET
    // ============================================
    function reset() {
        if (inputNombre) inputNombre.value = '';
        if (inputIdentificacion) inputIdentificacion.value = '';
        if (checkAcepto) checkAcepto.checked = false;

        [inputNombre, inputIdentificacion, campoCheck].forEach((el) => {
            if (!el) return;
            const campo = el.closest('.campo') || el.closest('.campo-check');
            if (campo) limpiarInvalido(campo);
        });

        limpiarFirma();
        firma.fechaAceptacion = null;
    }

    // ============================================
    // API PÚBLICA
    // ============================================
    window.GC2 = window.GC2 || {};
    window.GC2.liberacionUI = {
        renderTexto,
        initCanvas,
        initCamposFirma,
        prellenarFirmante,
        validarFirma,
        obtenerDatosFirma,
        finalizarFirma,
        limpiarFirma,
        firmaEstaFirmada,
        reset
    };

    // ============================================
    // ARRANQUE
    // ============================================
    function init() {
        renderTexto();
        initCanvas();
        initCamposFirma();
        console.info('[GC2] liberacion.js inicializado.');
    }

    document.addEventListener('gc2:config-listo', init);
    if (window.GC2 && window.GC2.listo) init();

    console.info('[GC2] liberacion.js cargado.');
})();