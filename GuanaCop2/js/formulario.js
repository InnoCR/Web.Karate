/* =========================================================
   GUANACOP2 · formulario.js
   Orquesta el flujo de 2 pasos: navegación, validaciones,
   edad al torneo (con fecha en 3 selects), resumen,
   POST al backend con monto fijo, folio y confirmación
   ========================================================= */

(function () {
    'use strict';

    // ============================================
    // ESTADO DEL FORMULARIO
    // ============================================
    const estado = {
        pasoActual: 1,
        totalPasos: 2,
        datos: {},
        folio: null,
        monto: 0,
        enviando: false
    };

    // Referencias DOM
    let form, pasos, progressFill, steps, btnAnterior, btnSiguiente, btnConfirmar;

    // ============================================
    // ARRANQUE: esperar a que GC2 esté listo
    // ============================================
    function arrancar() {
        // Si config.js ya terminó, inicializar ya
        if (window.GC2 && window.GC2.config) {
            init();
            return;
        }

        // Si aún no, esperar el evento
        document.addEventListener('gc2:config-listo', init, { once: true });

        // Timeout de seguridad: si en 5s no llegó, mostrar error
        setTimeout(() => {
            if (!window.GC2 || !window.GC2.config) {
                console.error('[GC2] formulario.js: config no cargó en 5s. Revisa data/config.json.');
            }
        }, 5000);
    }

    // ============================================
    // INICIALIZACIÓN
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

        // Verificación de botones
        if (!btnAnterior || !btnSiguiente || !btnConfirmar) {
            console.error('[GC2] Faltan botones de navegación en el DOM');
            return;
        }

        // Monto fijo desde config
        estado.monto = Number(window.GC2.precioFijo) || 15000;

        // Eventos de navegación
        btnAnterior.addEventListener('click', irAnterior);
        btnSiguiente.addEventListener('click', irSiguiente);
        btnConfirmar.addEventListener('click', confirmar);

        // Poblar selects de fecha y enganchar eventos
        poblarSelectsFecha();
        ['ad_diaNacimiento', 'ad_mesNacimiento', 'ad_anioNacimiento'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', sincronizarFechaNacimiento);
        });

        // Botón WhatsApp
        const btnWa = document.getElementById('btnWhatsappAdultos');
        if (btnWa) btnWa.addEventListener('click', enviarWhatsApp);

        // Estado inicial
        mostrarPaso(1);

        console.info('[GC2] Formulario listo. Monto fijo:', estado.monto);
        console.info('[GC2] Botones enganchados:', {
            anterior: !!btnAnterior,
            siguiente: !!btnSiguiente,
            confirmar: !!btnConfirmar
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
        const anioTorneo = cfg ? new Date(cfg.fechaTorneo).getFullYear() : 2026;
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
    // NAVEGACIÓN ENTRE PASOS
    // ============================================
    function mostrarPaso(n) {
        estado.pasoActual = n;

        // Fieldset activo
        pasos.forEach((p) => {
            p.classList.toggle('activo', Number(p.dataset.paso) === n);
        });

        // Steps visuales
        steps.forEach((s) => {
            s.classList.toggle('active', Number(s.dataset.step) <= n);
        });

        // Barra
        if (progressFill) {
            progressFill.style.width = `${(n / estado.totalPasos) * 100}%`;
        }

        // ---- Botones: control robusto ----
        // Anterior: visible siempre, deshabilitado en paso 1
        btnAnterior.style.display = '';
        btnAnterior.disabled = n === 1;

        // Siguiente: visible solo en paso 1
        if (n === 1) {
            btnSiguiente.style.display = '';
            btnSiguiente.disabled = false;
            btnSiguiente.hidden = false;
        } else {
            btnSiguiente.style.display = 'none';
            btnSiguiente.hidden = true;
        }

        // Confirmar: visible solo en paso 2 (último)
        if (n === estado.totalPasos) {
            btnConfirmar.style.display = '';
            btnConfirmar.disabled = false;
            btnConfirmar.hidden = false;
        } else {
            btnConfirmar.style.display = 'none';
            btnConfirmar.hidden = true;
        }

        // Al entrar al paso 2, armar resumen
        if (n === 2) {
            armarResumen();
        }

        // Scroll arriba
        const wrap = form.closest('.formulario-wrap');
        if (wrap) {
            wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        console.info('[GC2] Paso actual:', n, '| Siguiente:', n === 1 ? 'visible' : 'oculto', '| Confirmar:', n === 2 ? 'visible' : 'oculto');
    }

    function irAnterior() {
        if (estado.enviando) return;
        if (estado.pasoActual > 1) {
            mostrarPaso(estado.pasoActual - 1);
        }
    }

    function irSiguiente() {
        if (estado.enviando) return;
        if (!validarPaso(estado.pasoActual)) return;

        if (estado.pasoActual === 1) {
            capturarDatosCompetidor();
            if (!validarEdadAdulto()) return;
        }

        if (estado.pasoActual < estado.totalPasos) {
            mostrarPaso(estado.pasoActual + 1);
        }
    }

    // ============================================
    // CAPTURA Y VALIDACIÓN DE DATOS
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

    function validarPaso(paso) {
        const fieldset = form.querySelector(`.paso[data-paso="${paso}"]`);
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

        if (paso === 1) {
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
        campo.classList.add('invalido');
        const err = campo.querySelector('.error-msg');
        if (err) err.textContent = msg || 'Campo inválido.';
    }

    function limpiarInvalido(campo) {
        campo.classList.remove('invalido');
        const err = campo.querySelector('.error-msg');
        if (err) err.textContent = '';
    }

    // ============================================
    // CÁLCULO DE EDAD
    // ============================================
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
        if (aviso) {
            aviso.hidden = edad >= min;
        }
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
    // RESUMEN
    // ============================================
    function armarResumen() {
        const cont = document.getElementById('resumenAdultos');
        if (!cont) return;

        const esc = window.GC2.utils.escaparHTML;
        const fmt = window.GC2.utils.formatearMonto;
        const d = estado.datos;
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
      <div class="resumen-total">
        <span>Total a pagar</span>
        <strong>${fmt(total)}</strong>
      </div>
    `;
    }

    // ============================================
    // CONFIRMACIÓN
    // ============================================
    async function confirmar() {
        if (estado.enviando) return;

        const cfg = window.GC2.config;
        if (!cfg || !cfg.backend || !cfg.backend.url) {
            alert('Falta configurar el backend en config.json');
            return;
        }

        estado.enviando = true;
        btnConfirmar.disabled = true;
        const textoOriginal = btnConfirmar.textContent;
        btnConfirmar.textContent = 'Enviando…';

        try {
            const payload = {
                tipo: 'peleas-acordadas',
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