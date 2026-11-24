/* =========================================================
   GUANACUP2 · formulario.js
   Orquesta el flujo de 3 pasos: datos → liberación (con
   canvas de firma) → resumen. POST al backend, folio,
   confirmación y descarga AUTOMÁTICA del PDF.
   ========================================================= */

(function () {
    'use strict';

    // ============================================
    // ESTADO
    // ============================================
    const estado = {
        pasoActual: 1,
        totalPasos: 3,
        datos: {},
        firma: null,
        folio: null,
        monto: 0,
        fechaAceptacion: null,
        enviando: false
    };

    let form, pasos, progressFill, steps, btnAnterior, btnSiguiente, btnConfirmar;

    // ============================================
    // ARRANQUE
    // ============================================
    function arrancar() {
        if (window.GC2 && window.GC2.config) {
            init();
            return;
        }
        document.addEventListener('gc2:config-listo', init, { once: true });
        setTimeout(() => {
            if (!window.GC2 || !window.GC2.config) {
                console.error('[GC2] formulario.js: config no cargó en 5s. Revisa data/config.json.');
            }
        }, 5000);
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        form = document.getElementById('formAdultos');
        if (!form) {
            console.error('[GC2] No se encontró #formAdultos');
            return;
        }

        pasos = form.querySelectorAll('.paso');
        progressFill = document.getElementById('progressFillAdultos');
        steps = document.querySelectorAll('.progress-steps .step');
        btnAnterior = document.getElementById('btnAnteriorAdultos');
        btnSiguiente = document.getElementById('btnSiguienteAdultos');
        btnConfirmar = document.getElementById('btnConfirmarAdultos');

        if (!btnAnterior || !btnSiguiente || !btnConfirmar) {
            console.error('[GC2] Faltan botones de navegación en el DOM');
            return;
        }

        estado.monto = Number(window.GC2.precioFijo) || 15000;

        btnAnterior.addEventListener('click', irAnterior);
        btnSiguiente.addEventListener('click', irSiguiente);
        btnConfirmar.addEventListener('click', confirmar);

        poblarSelectsFecha();
        ['ad_diaNacimiento', 'ad_mesNacimiento', 'ad_anioNacimiento'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', sincronizarFechaNacimiento);
        });

        const btnWa = document.getElementById('btnWhatsappAdultos');
        if (btnWa) btnWa.addEventListener('click', enviarWhatsApp);

        const btnPdf = document.getElementById('btnDescargarLiberacion');
        if (btnPdf) btnPdf.addEventListener('click', descargarLiberacion);

        mostrarPaso(1);

        console.info('[GC2] Formulario listo. Monto fijo:', estado.monto);
        console.info('[GC2] Botones enganchados:', {
            anterior: !!btnAnterior,
            siguiente: !!btnSiguiente,
            confirmar: !!btnConfirmar,
            whatsapp: !!btnWa,
            descargarPdf: !!btnPdf
        });
    }

    // ============================================
    // FECHA DE NACIMIENTO · 3 SELECTS
    // ============================================
    function poblarSelectsFecha() {
        const diaSel = document.getElementById('ad_diaNacimiento');
        const anioSel = document.getElementById('ad_anioNacimiento');
        if (!diaSel || !anioSel) return;

        if (diaSel.options.length <= 1) {
            for (let d = 1; d <= 31; d++) {
                const opt = document.createElement('option');
                opt.value = String(d).padStart(2, '0');
                opt.textContent = String(d).padStart(2, '0');
                diaSel.appendChild(opt);
            }
        }

        const cfg = window.GC2 && window.GC2.config;
        const anioTorneo = cfg ? new Date(cfg.fechaTorneo).getFullYear() : 2027;
        const minAnio = 1920;
        const maxAnio = anioTorneo - 18;

        if (anioSel.options.length <= 1) {
            for (let a = maxAnio; a >= minAnio; a--) {
                const opt = document.createElement('option');
                opt.value = String(a);
                opt.textContent = String(a);
                anioSel.appendChild(opt);
            }
        }
    }

    function sincronizarFechaNacimiento() {
        const diaSel = document.getElementById('ad_diaNacimiento');
        const mesSel = document.getElementById('ad_mesNacimiento');
        const anioSel = document.getElementById('ad_anioNacimiento');
        const hidden = document.getElementById('ad_fechaNacimiento');
        const campo = hidden ? hidden.closest('.campo') : null;

        if (!diaSel || !mesSel || !anioSel || !hidden) return;

        const d = diaSel.value;
        const m = mesSel.value;
        const a = anioSel.value;

        if (!d || !m || !a) {
            hidden.value = '';
            if (campo) limpiarInvalido(campo);
            calcularEdadYValidar();
            return;
        }

        const fecha = new Date(`${a}-${m}-${d}T00:00:00`);
        const valida =
            fecha.getFullYear() === Number(a) &&
            fecha.getMonth() + 1 === Number(m) &&
            fecha.getDate() === Number(d);

        if (!valida) {
            hidden.value = '';
            if (campo) marcarInvalido(campo, 'Fecha inválida (ese día no existe en ese mes).');
            calcularEdadYValidar();
            return;
        }

        if (campo) limpiarInvalido(campo);
        hidden.value = `${a}-${m}-${d}`;
        calcularEdadYValidar();
    }

    // ============================================
    // NAVEGACIÓN
    // ============================================
    function mostrarPaso(n) {
        estado.pasoActual = n;

        pasos.forEach((p) => {
            p.classList.toggle('activo', Number(p.dataset.paso) === n);
        });

        steps.forEach((s) => {
            s.classList.toggle('active', Number(s.dataset.step) <= n);
        });

        if (progressFill) {
            progressFill.style.width = `${(n / estado.totalPasos) * 100}%`;
        }

        btnAnterior.style.display = '';
        btnAnterior.disabled = n === 1;

        if (n === estado.totalPasos) {
            btnSiguiente.style.display = 'none';
            btnSiguiente.hidden = true;
            btnConfirmar.style.display = '';
            btnConfirmar.hidden = false;
            btnConfirmar.disabled = false;
        } else {
            btnSiguiente.style.display = '';
            btnSiguiente.hidden = false;
            btnSiguiente.disabled = false;
            btnConfirmar.style.display = 'none';
            btnConfirmar.hidden = true;
        }

        if (n === 3) {
            armarResumen();
        }

        const wrap = form.closest('.formulario-wrap');
        if (wrap) {
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        console.info('[GC2] Paso actual:', n);
    }

    function irAnterior() {
        if (estado.enviando) return;
        if (estado.pasoActual > 1) {
            mostrarPaso(estado.pasoActual - 1);
        }
    }

    function irSiguiente() {
        if (estado.enviando) return;

        if (estado.pasoActual === 1) {
            if (!validarPaso1()) return;
            capturarDatosCompetidor();
            if (!validarEdadAdulto()) return;
        }

        if (estado.pasoActual === 2) {
            if (!window.GC2.liberacionUI.validarFirma()) return;
            estado.firma = window.GC2.liberacionUI.obtenerDatosFirma();
        }

        if (estado.pasoActual < estado.totalPasos) {
            const siguiente = estado.pasoActual + 1;
            mostrarPaso(siguiente);

            if (siguiente === 2) {
                window.GC2.liberacionUI.prellenarFirmante(estado.datos);
            }
        }
    }

    // ============================================
    // VALIDACIONES
    // ============================================
    function validarPaso1() {
        const fieldset = form.querySelector('.paso[data-paso="1"]');
        if (!fieldset) return true;

        let ok = true;

        fieldset.querySelectorAll('input[required], select[required], textarea[required]').forEach((input) => {
            const campo = input.closest('.campo');
            if (!campo) return;

            if (!input.checkValidity() || !input.value.trim()) {
                marcarInvalido(campo, mensajeError(input));
                ok = false;
            } else {
                limpiarInvalido(campo);
            }
        });

        const email = fieldset.querySelector('#ad_email');
        if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            marcarInvalido(email.closest('.campo'), 'Correo electrónico inválido.');
            ok = false;
        }

        const tel = fieldset.querySelector('#ad_telefono');
        if (tel && tel.value && tel.value.replace(/\D/g, '').length < 8) {
            marcarInvalido(tel.closest('.campo'), 'Teléfono inválido (mínimo 8 dígitos).');
            ok = false;
        }

        const hiddenFecha = fieldset.querySelector('#ad_fechaNacimiento');
        const diaSel = fieldset.querySelector('#ad_diaNacimiento');
        const mesSel = fieldset.querySelector('#ad_mesNacimiento');
        const anioSel = fieldset.querySelector('#ad_anioNacimiento');
        if (hiddenFecha && diaSel && mesSel && anioSel) {
            if (!diaSel.value || !mesSel.value || !anioSel.value || !hiddenFecha.value) {
                const campo = hiddenFecha.closest('.campo');
                if (campo) marcarInvalido(campo, 'Debes indicar día, mes y año de nacimiento.');
                ok = false;
            }
        }

        if (!ok) {
            const primerInvalido = fieldset.querySelector('.campo.invalido');
            if (primerInvalido) {
                primerInvalido.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return ok;
    }

    function mensajeError(input) {
        if (input.type === 'email') return 'Correo inválido.';
        if (input.type === 'date') return 'Fecha inválida.';
        if (input.type === 'number') return 'Número inválido.';
        return 'Este campo es obligatorio.';
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
    // CAPTURA Y EDAD
    // ============================================
    function capturarDatosCompetidor() {
        estado.datos = {
            nombreCompleto: form.querySelector('#ad_nombreCompleto').value.trim(),
            fechaNacimiento: form.querySelector('#ad_fechaNacimiento').value,
            edadCalculada: form.querySelector('#ad_edadCalculada').value,
            sexo: form.querySelector('#ad_sexo').value,
            identificacion: form.querySelector('#ad_identificacion').value.trim(),
            email: form.querySelector('#ad_email').value.trim(),
            telefono: form.querySelector('#ad_telefono').value.trim(),
            dojo: form.querySelector('#ad_dojo').value.trim(),
            sensei: form.querySelector('#ad_sensei').value.trim(),
            grado: form.querySelector('#ad_grado').value,
            peso: form.querySelector('#ad_peso').value,
            condiciones: form.querySelector('#ad_condiciones').value.trim()
        };
    }

    function calcularEdadYValidar() {
        const hiddenFecha = document.getElementById('ad_fechaNacimiento');
        const edadInput = document.getElementById('ad_edadCalculada');
        const aviso = document.getElementById('ad_avisoEdad');

        if (!hiddenFecha || !edadInput) return;

        if (!hiddenFecha.value) {
            edadInput.value = '';
            if (aviso) aviso.hidden = true;
            return;
        }

        const cfg = window.GC2.config;
        if (!cfg) return;

        const edad = window.GC2.utils.calcularEdad(hiddenFecha.value, cfg.fechaTorneo);
        if (isNaN(edad)) {
            edadInput.value = '';
            return;
        }

        edadInput.value = `${edad} años`;

        const min = (cfg.reglas && cfg.reglas.edadMinima) || 18;
        if (aviso) aviso.hidden = edad >= min;
    }

    function validarEdadAdulto() {
        const cfg = window.GC2.config;
        const min = (cfg.reglas && cfg.reglas.edadMinima) || 18;
        const edad = Number((estado.datos.edadCalculada || '').replace(/\D/g, ''));

        if (isNaN(edad) || edad < min) {
            const aviso = document.getElementById('ad_avisoEdad');
            if (aviso) {
                aviso.hidden = false;
                aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    }

    // ============================================
    // RESUMEN (PASO 3) — SIN datos del firmante
    // ============================================
    function armarResumen() {
        const cont = document.getElementById('resumenAdultos');
        if (!cont) return;

        const esc = window.GC2.utils.escaparHTML;
        const fmt = window.GC2.utils.formatearMonto;
        const d = estado.datos;
        const f = estado.firma || window.GC2.liberacionUI.obtenerDatosFirma();
        const total = estado.monto;

        cont.innerHTML = `
      <div class="resumen-seccion">
        <h4>Competidor</h4>
        <p><strong>${esc(d.nombreCompleto)}</strong><br />
          Edad al torneo: ${esc(d.edadCalculada)} · Sexo: ${d.sexo === 'M' ? 'Masculino' : 'Femenino'}<br />
          Identificación: ${esc(d.identificacion)}<br />
          Email: ${esc(d.email)} · Tel: ${esc(d.telefono)}
        </p>
      </div>
      <div class="resumen-seccion">
        <h4>Dojo</h4>
        <p>${esc(d.dojo)}${d.sensei ? ' · Sensei: ' + esc(d.sensei) : ''}<br />
          Grado: ${esc(d.grado)} · Peso: ${esc(d.peso)} kg
        </p>
      </div>
      ${d.condiciones ? `<div class="resumen-seccion"><h4>Condiciones médicas</h4><p>${esc(d.condiciones)}</p></div>` : ''}
      <div class="resumen-seccion">
        <h4>Liberación de responsabilidad</h4>
        <p>✅ Aceptada · Versión ${esc(f.version || 'v1.0-2027')}</p>
      </div>
      <div class="resumen-total">
        <span>Total a pagar</span>
        <strong>${fmt(total)}</strong>
      </div>
    `;
    }

    // ============================================
    // CONFIRMACIÓN → POST + DESCARGA AUTOMÁTICA
    // ============================================
    async function confirmar() {
        if (estado.enviando) return;

        const cfg = window.GC2.config;
        if (!cfg || !cfg.backend || !cfg.backend.url) {
            alert('Falta configurar el backend en config.json');
            return;
        }

        if (!window.GC2.liberacionUI.validarFirma()) {
            mostrarPaso(2);
            return;
        }
        window.GC2.liberacionUI.finalizarFirma();
        estado.firma = window.GC2.liberacionUI.obtenerDatosFirma();
        estado.fechaAceptacion = estado.firma.fechaAceptacion;

        estado.enviando = true;
        btnConfirmar.disabled = true;
        const textoOriginal = btnConfirmar.textContent;
        btnConfirmar.textContent = 'Enviando…';

        try {
            const payload = {
                tipo: 'peleas-pactadas',
                competidor: {
                    nombreCompleto: estado.datos.nombreCompleto,
                    fechaNacimiento: estado.datos.fechaNacimiento,
                    edadCalculada: estado.datos.edadCalculada,
                    sexo: estado.datos.sexo,
                    identificacion: estado.datos.identificacion,
                    email: estado.datos.email,
                    telefono: estado.datos.telefono,
                    dojo: estado.datos.dojo,
                    sensei: estado.datos.sensei,
                    grado: estado.datos.grado,
                    peso: estado.datos.peso,
                    condiciones: estado.datos.condiciones
                },
                firma: {
                    nombre: estado.firma.nombre,
                    identificacion: estado.firma.identificacion,
                    acepto: estado.firma.acepto,
                    fechaAceptacion: estado.firma.fechaAceptacion,
                    version: estado.firma.version,
                    firmaImagen: estado.firma.firmaImagen
                },
                totalPagar: estado.monto
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), cfg.backend.timeoutMs || 15000);

            let res;
            try {
                res = await fetch(cfg.backend.url, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeoutId);
            }

            if (!res.ok) throw new Error(`Servidor respondió ${res.status}`);

            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'El servidor rechazó el registro');

            estado.folio = data.folio;

            // ============================================
            // DESCARGA AUTOMÁTICA DEL PDF
            // ============================================
            try {
                window.GC2.pdf.descargarPDF({
                    competidor: estado.datos,
                    firma: estado.firma,
                    folio: estado.folio,
                    monto: estado.monto,
                    fechaHora: estado.fechaAceptacion || new Date().toISOString(),
                    config: window.GC2.config,
                    liberacion: window.GC2.liberacion
                });
                console.info('[GC2] PDF de liberación descargado automáticamente.');
            } catch (e) {
                console.warn('[GC2] No se pudo descargar el PDF automáticamente:', e);
                // No bloquea el flujo — el usuario puede descargarlo manualmente
            }

            pintarConfirmacion();
            if (window.GC2.irA) window.GC2.irA('confirmacion');

            console.info('[GC2] Registro guardado. Folio:', estado.folio);

        } catch (err) {
            console.error('[GC2] Error al confirmar:', err);
            let msg = 'No se pudo guardar el registro. ';
            if (err.name === 'AbortError') msg += 'El servidor tardó demasiado en responder.';
            else if (err.message) msg += err.message;
            msg += '\n\nPuedes intentar de nuevo o contactar al organizador por WhatsApp.';
            alert(msg);

            estado.enviando = false;
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = textoOriginal;
        }
    }

    function pintarConfirmacion() {
        const cfg = window.GC2.config;
        const esc = window.GC2.utils.escaparHTML;
        const fmt = window.GC2.utils.formatearMonto;

        const folioEl = document.getElementById('folioTextoAdultos');
        if (folioEl) folioEl.textContent = estado.folio;

        const totalEl = document.getElementById('totalFinalAdultos');
        if (totalEl) totalEl.textContent = fmt(estado.monto);

        const sinpeNum = document.getElementById('sinpeNumeroAdultos');
        const sinpeTit = document.getElementById('sinpeTitularAdultos');
        if (sinpeNum && cfg.sinpe) sinpeNum.textContent = cfg.sinpe.numero;
        if (sinpeTit && cfg.sinpe) sinpeTit.textContent = cfg.sinpe.titular;

        const cont = document.getElementById('resumenFinalAdultos');
        if (cont) {
            const d = estado.datos;
            cont.innerHTML = `
        <div class="resumen-seccion">
          <h4>Competidor</h4>
          <p><strong>${esc(d.nombreCompleto)}</strong><br />
            Edad al torneo: ${esc(d.edadCalculada)}<br />
            Identificación: ${esc(d.identificacion)}<br />
            Tel: ${esc(d.telefono)}
          </p>
        </div>
        <div class="resumen-seccion">
          <h4>Dojo</h4>
          <p>${esc(d.dojo)}${d.sensei ? ' · Sensei: ' + esc(d.sensei) : ''}<br />
            Grado: ${esc(d.grado)} · Peso: ${esc(d.peso)} kg
          </p>
        </div>
      `;
        }
    }

    // ============================================
    // DESCARGA MANUAL DEL PDF (botón "Descargar de nuevo")
    // ============================================
    function descargarLiberacion() {
        if (!estado.folio) {
            alert('Primero debes confirmar el registro para generar el PDF.');
            return;
        }

        if (!window.GC2.pdf) {
            alert('El módulo de PDF no está disponible. Recarga la página.');
            return;
        }

        const firma = estado.firma || window.GC2.liberacionUI.obtenerDatosFirma();
        if (!firma || !firma.firmaImagen) {
            alert('La firma no está disponible. Vuelve al Paso 2 y dibuja tu firma.');
            return;
        }

        if (!window.GC2.liberacion || !Array.isArray(window.GC2.liberacion.secciones)) {
            alert('El texto de liberación no está cargado. Recarga la página.');
            return;
        }

        try {
            window.GC2.pdf.descargarPDF({
                competidor: estado.datos,
                firma: firma,
                folio: estado.folio,
                monto: estado.monto,
                fechaHora: estado.fechaAceptacion || new Date().toISOString(),
                config: window.GC2.config,
                liberacion: window.GC2.liberacion
            });
        } catch (err) {
            console.error('[GC2] Error al generar PDF:', err);
            alert('Error al generar PDF: ' + err.message);
        }
    }

    // ============================================
    // WHATSAPP
    // ============================================
    function enviarWhatsApp() {
        if (!estado.folio) {
            console.warn('[GC2] No hay folio generado.');
            return;
        }

        window.GC2.whatsapp.enviar({
            nombre: estado.datos.nombreCompleto,
            folio: estado.folio,
            monto: estado.monto
        });
    }

    // ============================================
    // ARRANQUE
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', arrancar);
    } else {
        arrancar();
    }
})();