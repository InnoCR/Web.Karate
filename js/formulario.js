/* =========================================================
   GUANA-CUP 2026 · formulario.js
   Lógica del formulario multi-paso (4 pasos)
   - Fecha de nacimiento con 3 dropdowns (día/mes/año)
   - Identificación y correo opcionales
   - Peso y altura obligatorios
   - Precio fijo desde config
   - Sin categorías
   - Envío OBLIGATORIO al backend con folio de respuesta
   - Sin fallback local: si falla, muestra error y no avanza
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // ------------------------------------------------------
    // Constantes
    // ------------------------------------------------------
    const MESES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // ------------------------------------------------------
    // Estado del formulario
    // ------------------------------------------------------
    const state = {
        pasoActual: 1,
        totalPasos: 4,
        bloqueEdad: null,
        folio: null,
        datos: null,
        iniciado: false,
        confirmado: false
    };

    // ------------------------------------------------------
    // Referencias
    // ------------------------------------------------------
    const refs = {
        form: null,
        pasos: [],
        btnAnterior: null,
        btnSiguiente: null,
        btnConfirmar: null,
        progressFill: null,
        progressSteps: []
    };

    function cachearRefs() {
        refs.form = $('#formInscripcion');
        refs.pasos = $$('.paso');
        refs.btnAnterior = $('#btnAnterior');
        refs.btnSiguiente = $('#btnSiguiente');
        refs.btnConfirmar = $('#btnConfirmar');
        refs.progressFill = $('#progressFill');
        refs.progressSteps = $$('.progress-steps li');
    }

    // ======================================================
    // DROPDOWNS DE FECHA DE NACIMIENTO
    // ======================================================
    function poblarFechaNacimiento() {
        const diaSel = $('#diaNacimiento');
        const mesSel = $('#mesNacimiento');
        const anioSel = $('#anioNacimiento');
        if (!diaSel || !mesSel || !anioSel) return;

        // Días 1-31
        if (diaSel.options.length <= 1) {
            for (let i = 1; i <= 31; i++) {
                const opt = document.createElement('option');
                opt.value = String(i).padStart(2, '0');
                opt.textContent = String(i);
                diaSel.appendChild(opt);
            }
        }

        // Meses
        if (mesSel.options.length <= 1) {
            MESES.forEach((nombre, idx) => {
                const opt = document.createElement('option');
                opt.value = String(idx + 1).padStart(2, '0');
                opt.textContent = nombre;
                mesSel.appendChild(opt);
            });
        }

        // Años descendente desde rangoAniosNacimiento
        const cfg = window.APP.config || {};
        const rango = cfg.rangoAniosNacimiento || { min: 2008, max: 2022 };
        if (anioSel.options.length <= 1) {
            for (let anio = rango.max; anio >= rango.min; anio--) {
                const opt = document.createElement('option');
                opt.value = String(anio);
                opt.textContent = String(anio);
                anioSel.appendChild(opt);
            }
        }
    }

    function ajustarDiasDelMes() {
        const diaSel = $('#diaNacimiento');
        const mesSel = $('#mesNacimiento');
        const anioSel = $('#anioNacimiento');
        if (!diaSel || !mesSel) return;

        const mes = parseInt(mesSel.value, 10);
        const anio = parseInt(anioSel?.value, 10) || 2020;

        if (!mes) return;

        const diasEnMes = new Date(anio, mes, 0).getDate();

        Array.from(diaSel.options).forEach(opt => {
            if (opt.value === '') return;
            const dia = parseInt(opt.value, 10);
            opt.hidden = dia > diasEnMes;
            opt.disabled = dia > diasEnMes;
        });

        const diaActual = parseInt(diaSel.value, 10);
        if (diaActual > diasEnMes) {
            diaSel.value = '';
        }
    }

    function obtenerFechaNacimiento() {
        const dia = $('#diaNacimiento')?.value || '';
        const mes = $('#mesNacimiento')?.value || '';
        const anio = $('#anioNacimiento')?.value || '';
        if (!dia || !mes || !anio) return '';
        return `${anio}-${mes}-${dia}`;
    }

    function formatearFechaNacimiento() {
        const dia = $('#diaNacimiento')?.value || '';
        const mes = $('#mesNacimiento')?.value || '';
        const anio = $('#anioNacimiento')?.value || '';
        if (!dia || !mes || !anio) return '';
        return `${dia}/${mes}/${anio}`;
    }

    // ======================================================
    // NAVEGACIÓN
    // ======================================================
    function irAPaso(n) {
        if (n < 1 || n > state.totalPasos) return;

        if (n > state.pasoActual) {
            const validacion = validarPaso(state.pasoActual);
            if (!validacion.valido) {
                mostrarErrores();
                return;
            }
        }

        refs.pasos.forEach(p => p.classList.remove('activo'));
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === n);
        if (paso) paso.classList.add('activo');

        state.pasoActual = n;

        alEntrarPaso(n);
        actualizarProgreso();
        actualizarBotones();

        refs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function alEntrarPaso(n) {
        switch (n) {
            case 1:
                recalcularEdadYBloque();
                break;
            case 2:
                break;
            case 3:
                prellenarFirma();
                break;
            case 4:
                generarResumen();
                break;
        }
    }

    // ======================================================
    // CÁLCULO DE EDAD Y BLOQUE
    // ======================================================
    function recalcularEdadYBloque() {
        const edadInput = $('#edadCalculada');
        const fechaNacimiento = obtenerFechaNacimiento();

        if (!fechaNacimiento) {
            if (edadInput) edadInput.value = '';
            state.bloqueEdad = null;
            return;
        }

        const cfg = window.APP.config;
        const edad = window.calcularEdad(fechaNacimiento, cfg.fechaTorneo);
        const bloque = window.obtenerBloqueEdad(edad);

        if (edadInput) edadInput.value = edad >= 0 ? `${edad} años` : '';
        state.bloqueEdad = bloque ? bloque.id : null;
    }

    // ======================================================
    // PRELLENAR FIRMA
    // ======================================================
    function prellenarFirma() {
        const firmaNombre = $('#firmaNombre');
        const firmaId = $('#firmaIdentificacion');
        const firmaParen = $('#firmaParentesco');

        const tutorNombre = $('#tutorNombre')?.value || '';
        const tutorId = $('#tutorIdentificacion')?.value || '';
        const tutorParen = $('#tutorParentesco')?.value || '';

        if (firmaNombre && !firmaNombre.value) firmaNombre.value = tutorNombre;
        if (firmaId && !firmaId.value) firmaId.value = tutorId;
        if (firmaParen && !firmaParen.value) firmaParen.value = tutorParen;
    }

    // ======================================================
    // VALIDACIONES
    // ======================================================
    function validarPaso(n) {
        const errores = [];
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === n);
        if (!paso) return { valido: true, errores };

        $$('.campo, .campo-check', paso).forEach(c => c.classList.remove('error'));
        $$('.error-msg', paso).forEach(e => e.textContent = '');

        switch (n) {
            case 1: return validarPaso1(paso);
            case 2: return validarPaso2(paso);
            case 3: return window.Liberacion.validarPasoLiberacion();
            case 4: return { valido: true, errores: [] };
            default: return { valido: true, errores };
        }
    }

    function validarPaso1(paso) {
        const errores = [];

        const campos = [
            { id: 'nombreCompleto', msg: 'Ingresa el nombre completo' },
            { id: 'sexo', msg: 'Selecciona el sexo' },
            { id: 'telefono', msg: 'Ingresa el teléfono' },
            { id: 'dojo', msg: 'Ingresa el dojo' },
            { id: 'grado', msg: 'Selecciona el grado' },
            { id: 'peso', msg: 'Ingresa el peso' },
            { id: 'altura', msg: 'Ingresa la altura' }
        ];

        campos.forEach(({ id, msg }) => {
            const input = document.getElementById(id);
            if (!input || !input.value.trim()) {
                marcarError(input, msg);
                errores.push(msg);
            }
        });

        // Fecha de nacimiento
        const dia = $('#diaNacimiento')?.value;
        const mes = $('#mesNacimiento')?.value;
        const anio = $('#anioNacimiento')?.value;

        if (!dia || !mes || !anio) {
            marcarError($('#diaNacimiento'), 'Selecciona la fecha completa');
            errores.push('Fecha de nacimiento incompleta');
        } else {
            const fechaNacimiento = `${anio}-${mes}-${dia}`;
            const cfg = window.APP.config;
            const edad = window.calcularEdad(fechaNacimiento, cfg.fechaTorneo);
            const bloque = window.obtenerBloqueEdad(edad);

            if (!bloque) {
                marcarError($('#diaNacimiento'), 'Edad fuera del rango del torneo');
                errores.push('Edad fuera de rango');
            }
        }

        // Correo solo si tiene valor
        const email = $('#email');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            marcarError(email, 'Correo inválido');
            errores.push('Correo inválido');
        }

        return { valido: errores.length === 0, errores };
    }

    function validarPaso2(paso) {
        const errores = [];

        const campos = [
            { id: 'tutorNombre', msg: 'Ingresa el nombre del tutor' },
            { id: 'tutorParentesco', msg: 'Ingresa el parentesco' },
            { id: 'tutorIdentificacion', msg: 'Ingresa la identificación del tutor' },
            { id: 'tutorTelefono', msg: 'Ingresa el teléfono del tutor' },
            { id: 'tutorEmail', msg: 'Ingresa el correo del tutor' }
        ];

        campos.forEach(({ id, msg }) => {
            const input = document.getElementById(id);
            if (!input || !input.value.trim()) {
                marcarError(input, msg);
                errores.push(msg);
            }
        });

        const email = $('#tutorEmail');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            marcarError(email, 'Correo inválido');
            errores.push('Correo inválido del tutor');
        }

        return { valido: errores.length === 0, errores };
    }

    function marcarError(input, msg) {
        if (!input) return;
        const campo = input.closest('.campo') || input.closest('.campo-check');
        if (campo) {
            campo.classList.add('error');
            const small = campo.querySelector('.error-msg');
            if (small) small.textContent = msg;
        }
    }

    function mostrarErrores() {
        const primerError = document.querySelector('.campo.error, .campo-check.error, .firma-wrap.error');
        if (primerError) {
            primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ======================================================
    // PROGRESO Y BOTONES
    // ======================================================
    function actualizarProgreso() {
        const total = state.totalPasos;
        const pct = (state.pasoActual / total) * 100;
        if (refs.progressFill) refs.progressFill.style.width = `${pct}%`;

        refs.progressSteps.forEach((li, idx) => {
            const n = idx + 1;
            li.classList.remove('active', 'done');
            if (n === state.pasoActual) li.classList.add('active');
            else if (n < state.pasoActual) li.classList.add('done');
        });
    }

    function actualizarBotones() {
        const esPrimero = state.pasoActual === 1;
        const esUltimo = state.pasoActual === state.totalPasos;

        if (refs.btnAnterior) {
            refs.btnAnterior.disabled = esPrimero;
            refs.btnAnterior.style.display = esPrimero ? 'none' : '';
        }

        if (refs.btnSiguiente) {
            refs.btnSiguiente.hidden = esUltimo;
            refs.btnSiguiente.style.display = esUltimo ? 'none' : '';
        }

        if (refs.btnConfirmar) {
            refs.btnConfirmar.hidden = !esUltimo;
            refs.btnConfirmar.style.display = esUltimo ? '' : 'none';
        }
    }

    // ======================================================
    // RECOLECCIÓN DE DATOS
    // ======================================================
    function recolectarDatos() {
        const cfg = window.APP.config;

        const datos = {
            folio: state.folio,
            competidor: {
                nombre: $('#nombreCompleto')?.value.trim() || '',
                fechaNacimiento: formatearFechaNacimiento(),
                edad: parseInt($('#edadCalculada')?.value) || 0,
                sexo: $('#sexo')?.value || '',
                identificacion: $('#identificacion')?.value.trim() || '',
                email: $('#email')?.value.trim() || '',
                telefono: $('#telefono')?.value.trim() || '',
                dojo: $('#dojo')?.value.trim() || '',
                sensei: $('#sensei')?.value.trim() || '',
                grado: $('#grado')?.value || '',
                peso: $('#peso')?.value || '',
                altura: $('#altura')?.value || '',
                condiciones: $('#condiciones')?.value.trim() || ''
            },
            tutor: {
                nombre: $('#tutorNombre')?.value.trim() || '',
                parentesco: $('#tutorParentesco')?.value.trim() || '',
                identificacion: $('#tutorIdentificacion')?.value.trim() || '',
                telefono: $('#tutorTelefono')?.value.trim() || '',
                email: $('#tutorEmail')?.value.trim() || ''
            },
            total: cfg.precioInscripcion || 0,
            liberacion: window.Liberacion.obtenerDatosLiberacion()
        };

        state.datos = datos;
        return datos;
    }

    // ======================================================
    // RESUMEN (PASO 4)
    // ======================================================
    function generarResumen() {
        const contenedor = $('#resumenInscripcion');
        if (!contenedor) return;

        const datos = recolectarDatos();
        const cfg = window.APP.config;
        const simbolo = cfg.simboloMoneda || '₡';

        const filasCompetidor = [
            ['Nombre', datos.competidor.nombre],
            ['Fecha de nacimiento', datos.competidor.fechaNacimiento],
            ['Edad al torneo', `${datos.competidor.edad} años`],
            ['Identificación', datos.competidor.identificacion],
            ['Correo', datos.competidor.email],
            ['Teléfono', datos.competidor.telefono],
            ['Dojo', datos.competidor.dojo],
            ['Sensei', datos.competidor.sensei],
            ['Grado', datos.competidor.grado],
            ['Peso', `${datos.competidor.peso} kg`],
            ['Altura', `${datos.competidor.altura} cm`],
            ['Condiciones médicas', datos.competidor.condiciones]
        ].filter(([, v]) => v && String(v).trim() !== '');

        const htmlCompetidor = filasCompetidor.map(
            ([k, v]) => `<div class="resumen-fila"><span>${k}</span><span>${v}</span></div>`
        ).join('');

        const filasTutor = [
            ['Nombre', datos.tutor.nombre],
            ['Parentesco', datos.tutor.parentesco],
            ['Identificación', datos.tutor.identificacion],
            ['Teléfono', datos.tutor.telefono],
            ['Correo', datos.tutor.email]
        ].filter(([, v]) => v && String(v).trim() !== '');

        const htmlTutor = filasTutor.map(
            ([k, v]) => `<div class="resumen-fila"><span>${k}</span><span>${v}</span></div>`
        ).join('');

        contenedor.innerHTML = `
      <div class="resumen-bloque">
        <h3>Competidor</h3>
        ${htmlCompetidor}
      </div>

      <div class="resumen-bloque">
        <h3>Tutor responsable</h3>
        ${htmlTutor}
      </div>

      <div class="resumen-bloque">
        <h3>Liberación</h3>
        <div class="resumen-fila"><span>Firmado por</span><span>${datos.liberacion.firmaNombre}</span></div>
        <div class="resumen-fila"><span>Identificación</span><span>${datos.liberacion.firmaIdentificacion}</span></div>
        ${datos.liberacion.firmaParentesco ? `<div class="resumen-fila"><span>Parentesco</span><span>${datos.liberacion.firmaParentesco}</span></div>` : ''}
        <div class="resumen-fila"><span>Aceptada</span><span>✅ Sí</span></div>
      </div>

      <div class="resumen-total">
        <span>Total a pagar</span>
        <strong>${window.formatMoneda(datos.total, simbolo, cfg.locale)}</strong>
      </div>
    `;
    }

    // ======================================================
    // ENVIAR AL BACKEND (App Script)
    // Lanza error si falla. El caller decide qué hacer.
    // ======================================================
    async function enviarAlBackend(datos) {
        const cfg = window.APP.config || {};
        const url = cfg.endpointInscripcion;

        if (!url) {
            throw new Error('El endpoint de inscripción no está configurado. Contacta al organizador.');
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(datos)
        });

        if (!res.ok) {
            throw new Error(`Error del servidor (HTTP ${res.status})`);
        }

        const data = await res.json();

        if (!data || !data.ok) {
            throw new Error(data?.error || 'Respuesta inválida del servidor');
        }

        return data;
    }

    // ======================================================
    // MENSAJES DE ERROR DEL BACKEND
    // ======================================================
    function mostrarErrorBackend(mensaje) {
        const nav = document.querySelector('.form-nav');
        if (!nav) return;

        limpiarErrorBackend();

        const div = document.createElement('div');
        div.id = 'errorBackend';
        div.style.cssText = `
      background: rgba(255,77,77,.08);
      border-left: 4px solid var(--color-error);
      border-radius: var(--radius-sm);
      padding: .85rem 1rem;
      margin-top: 1rem;
      color: var(--color-error);
      font-size: .9rem;
      line-height: 1.5;
      text-align: left;
    `;
        div.innerHTML = `
      <strong>⚠️ No se pudo completar la inscripción</strong><br>
      ${mensaje}<br>
      <small>Si el problema persiste, contacta al organizador por WhatsApp.</small>
    `;

        nav.insertAdjacentElement('afterend', div);
        div.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function limpiarErrorBackend() {
        const prev = document.getElementById('errorBackend');
        if (prev) prev.remove();
    }

    // ======================================================
    // CONFIRMAR INSCRIPCIÓN
    // Si el backend falla, muestra error y NO avanza.
    // ======================================================
    async function confirmar() {
        // Validar todos los pasos
        for (let i = 1; i <= state.totalPasos; i++) {
            const v = validarPaso(i);
            if (!v.valido) {
                irAPaso(i);
                mostrarErrores();
                return;
            }
        }

        const datos = recolectarDatos();

        limpiarErrorBackend();

        if (refs.btnConfirmar) {
            refs.btnConfirmar.disabled = true;
            refs.btnConfirmar.textContent = '⏳ Enviando…';
        }

        let respuesta;
        try {
            respuesta = await enviarAlBackend(datos);
        } catch (err) {
            console.error('[formulario.js] Error al confirmar:', err);
            mostrarErrorBackend(
                err.message || 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.'
            );
            if (refs.btnConfirmar) {
                refs.btnConfirmar.disabled = false;
                refs.btnConfirmar.textContent = '✔ Confirmar inscripción';
            }
            return;
        }

        if (!respuesta || !respuesta.folio) {
            const msg = respuesta?.error || 'No se recibió un folio válido del servidor.';
            mostrarErrorBackend(msg);
            if (refs.btnConfirmar) {
                refs.btnConfirmar.disabled = false;
                refs.btnConfirmar.textContent = '✔ Confirmar inscripción';
            }
            return;
        }

        // ✅ Éxito
        datos.folio = respuesta.folio;
        state.folio = datos.folio;

        const datosFinales = JSON.parse(JSON.stringify(datos));
        state.datos = datosFinales;
        state.confirmado = true;

        // Descargar PDF automáticamente
        try {
            window.PDF.descargarPDF(datosFinales);
        } catch (e) {
            console.warn('[formulario.js] No se pudo descargar el PDF:', e);
        }

        pintarConfirmacion(datosFinales);
        window.Navegacion.irA('confirmacion');
        limpiarFormulario();

        if (refs.btnConfirmar) {
            refs.btnConfirmar.disabled = false;
            refs.btnConfirmar.textContent = '✔ Confirmar inscripción';
        }
    }

    // ======================================================
    // LIMPIAR
    // ======================================================
    function limpiarFormulario() {
        refs.form?.reset();

        state.pasoActual = 1;
        state.bloqueEdad = null;
        state.folio = null;

        window.Liberacion.reset();

        const edadInput = $('#edadCalculada');
        if (edadInput) edadInput.value = '';

        limpiarErrorBackend();

        refs.pasos.forEach(p => p.classList.remove('activo'));
        const paso1 = refs.pasos.find(p => Number(p.dataset.paso) === 1);
        if (paso1) paso1.classList.add('activo');

        actualizarProgreso();
        actualizarBotones();
    }

    // ======================================================
    // PINTAR CONFIRMACIÓN
    // ======================================================
    function pintarConfirmacion(datos) {
        const cfg = window.APP.config;
        const simbolo = cfg.simboloMoneda || '₡';

        const folioLabel = $('#folioLabel');
        if (folioLabel) {
            const nombre = datos.competidor.nombre || 'participante';
            folioLabel.textContent = `Folio de ${nombre}`;
        }

        const folioTexto = $('#folioTexto');
        if (folioTexto) folioTexto.textContent = datos.folio || '—';

        const sinpeMonto = $('#sinpeMonto');
        if (sinpeMonto) {
            sinpeMonto.textContent = window.formatMoneda(datos.total, simbolo, cfg.locale);
        }
    }

    function resetCompleto() {
        limpiarFormulario();
        state.datos = null;
        state.confirmado = false;
    }

    // ======================================================
    // EVENTOS
    // ======================================================
    function engancharEventos() {
        refs.btnSiguiente?.addEventListener('click', () => irAPaso(state.pasoActual + 1));
        refs.btnAnterior?.addEventListener('click', () => irAPaso(state.pasoActual - 1));
        refs.btnConfirmar?.addEventListener('click', confirmar);

        ['#diaNacimiento', '#mesNacimiento', '#anioNacimiento'].forEach(sel => {
            const el = $(sel);
            if (!el) return;
            el.addEventListener('change', () => {
                ajustarDiasDelMes();
                recalcularEdadYBloque();
            });
        });

        $('#btnDescargarLiberacion')?.addEventListener('click', () => {
            if (!state.datos) {
                alert('No hay datos de inscripción para descargar.');
                return;
            }
            window.PDF.descargarPDF(state.datos);
        });

        $('#btnEnviarWhatsapp')?.addEventListener('click', () => {
            if (!state.datos) {
                alert('No hay datos de inscripción para enviar.');
                return;
            }
            window.WhatsApp.abrirWhatsApp(state.datos);
        });

        $('#btnContactarAsesorHero')?.addEventListener('click', () => {
            window.WhatsApp.contactarAsesor();
        });
        $('#btnContactarAsesorFooter')?.addEventListener('click', () => {
            window.WhatsApp.contactarAsesor();
        });

        document.addEventListener('vista:change', (e) => {
            if (e.detail.vista === 'formulario' && state.confirmado) {
                resetCompleto();
            }
        });
    }

    // ======================================================
    // INIT
    // ======================================================
    function init() {
        if (state.iniciado) return;
        cachearRefs();
        if (!refs.form) return;

        poblarFechaNacimiento();
        engancharEventos();
        irAPaso(1);
        state.iniciado = true;
    }

    window.Formulario = {
        irAPaso,
        reset: resetCompleto,
        getBloqueEdad: () => state.bloqueEdad,
        getPasoActual: () => state.pasoActual
    };

    document.addEventListener('app:listo', init);
    if (window.APP && window.APP.listo) init();

})();