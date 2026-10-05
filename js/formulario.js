/* =========================================================
   GUANA-CUP 2026 · formulario.js
   Lógica del formulario multi-paso
   - Validación condicional: identificación y email opcionales
     para menores de edad
   - Indicadores visuales dinámicos (asteriscos y hints)
   - Resumen que oculta filas vacías
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // ------------------------------------------------------
    // Estado del formulario
    // ------------------------------------------------------
    const state = {
        pasoActual: 1,
        totalPasos: 5,
        esMenor: false,
        bloqueEdad: null,
        folio: null,
        datos: null,
        iniciado: false,
        confirmado: false
    };

    // ------------------------------------------------------
    // Referencias a elementos clave
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

    // ------------------------------------------------------
    // Cachear referencias
    // ------------------------------------------------------
    function cachearRefs() {
        refs.form = $('#formInscripcion');
        refs.pasos = $$('.paso');
        refs.btnAnterior = $('#btnAnterior');
        refs.btnSiguiente = $('#btnSiguiente');
        refs.btnConfirmar = $('#btnConfirmar');
        refs.progressFill = $('#progressFill');
        refs.progressSteps = $$('.progress-steps li');
    }

    // ------------------------------------------------------
    // Navegación entre pasos
    // ------------------------------------------------------
    function irAPaso(n) {
        if (n < 1 || n > state.totalPasos) return;

        // Si va hacia atrás, saltar el paso 2 cuando no es menor
        if (n < state.pasoActual && n === 2 && !state.esMenor) {
            n = 1;
        }

        // Si va hacia adelante y el paso destino es 2 sin ser menor, saltar al 3
        if (n > state.pasoActual && n === 2 && !state.esMenor) {
            n = 3;
        }

        // Validar paso actual antes de avanzar
        if (n > state.pasoActual) {
            const validacion = validarPaso(state.pasoActual);
            if (!validacion.valido) {
                mostrarErrores();
                return;
            }
        }

        // Ocultar todos los pasos
        refs.pasos.forEach(p => p.classList.remove('activo'));

        // Mostrar el solicitado
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === n);
        if (paso) paso.classList.add('activo');

        // Actualizar estado
        state.pasoActual = n;

        // Acciones al entrar al paso
        alEntrarPaso(n);

        // Actualizar barra de progreso y botones
        actualizarProgreso();
        actualizarBotones();

        // Scroll al inicio del formulario
        refs.form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ------------------------------------------------------
    // Acciones al entrar a un paso
    // ------------------------------------------------------
    function alEntrarPaso(n) {
        switch (n) {
            case 1:
                recalcularEdadYBloque();
                break;

            case 2:
                // Solo llegamos aquí si es menor
                break;

            case 3:
                window.Categorias.renderFormulario(state.bloqueEdad);
                break;

            case 4:
                prellenarFirma();
                break;

            case 5:
                generarResumen();
                if (!state.folio) generarFolio();
                break;
        }
    }

    // ------------------------------------------------------
    // Recalcular edad y bloque
    // ------------------------------------------------------
    function recalcularEdadYBloque() {
        const fechaInput = $('#fechaNacimiento');
        const edadInput = $('#edadCalculada');
        const aviso = $('#avisoMenor');

        if (!fechaInput || !fechaInput.value) {
            if (edadInput) edadInput.value = '';
            if (aviso) aviso.hidden = true;
            state.esMenor = false;
            state.bloqueEdad = null;
            actualizarIndicadoresOpcionales();
            return;
        }

        const cfg = window.APP.config;
        const fechaTorneo = cfg.fechaTorneo;
        const edad = window.calcularEdad(fechaInput.value, fechaTorneo);
        const bloque = window.obtenerBloqueEdad(edad);

        if (edadInput) edadInput.value = edad >= 0 ? `${edad} años` : '';

        state.esMenor = edad < 18 && edad >= 0;
        state.bloqueEdad = bloque ? bloque.id : null;

        if (aviso) aviso.hidden = !state.esMenor;

        if (state.esMenor) habilitarPaso2();
        else deshabilitarPaso2();

        // Actualizar indicadores visuales de campos opcionales
        actualizarIndicadoresOpcionales();
    }

    // ------------------------------------------------------
    // Actualizar asteriscos y hints según edad
    // ------------------------------------------------------
    function actualizarIndicadoresOpcionales() {
        const esMenor = state.esMenor;

        const labelId = $('#labelIdentificacionReq');
        const labelMail = $('#labelEmailReq');
        const hintId = $('#hintIdentificacion');
        const hintMail = $('#hintEmail');

        if (labelId) labelId.style.display = esMenor ? 'none' : '';
        if (labelMail) labelMail.style.display = esMenor ? 'none' : '';
        if (hintId) hintId.hidden = !esMenor;
        if (hintMail) hintMail.hidden = !esMenor;

        const inputId = $('#identificacion');
        const inputMail = $('#email');
        if (inputId) inputId.required = !esMenor;
        if (inputMail) inputMail.required = !esMenor;

        // Limpiar errores visuales de esos campos si se vuelven opcionales
        if (esMenor) {
            const campoId = inputId?.closest('.campo');
            const campoMail = inputMail?.closest('.campo');
            if (campoId) {
                campoId.classList.remove('error');
                const err = campoId.querySelector('.error-msg');
                if (err) err.textContent = '';
            }
            if (campoMail) {
                campoMail.classList.remove('error');
                const err = campoMail.querySelector('.error-msg');
                if (err) err.textContent = '';
            }
        }
    }

    // ------------------------------------------------------
    // Habilitar / deshabilitar paso 2
    // ------------------------------------------------------
    function habilitarPaso2() {
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === 2);
        if (!paso) return;
        $$('input, select', paso).forEach(el => el.disabled = false);
    }

    function deshabilitarPaso2() {
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === 2);
        if (!paso) return;
        $$('input, select', paso).forEach(el => {
            el.disabled = true;
            const campo = el.closest('.campo');
            if (campo) campo.classList.remove('error');
            const err = campo?.querySelector('.error-msg');
            if (err) err.textContent = '';
        });
    }

    // ------------------------------------------------------
    // Prellenar firma del Paso 4
    // ------------------------------------------------------
    function prellenarFirma() {
        const firmaNombre = $('#firmaNombre');
        const firmaId = $('#firmaIdentificacion');
        const firmaParen = $('#firmaParentesco');

        if (state.esMenor) {
            const tutorNombre = $('#tutorNombre')?.value || '';
            const tutorId = $('#tutorIdentificacion')?.value || '';
            const tutorParen = $('#tutorParentesco')?.value || '';
            const tutorParenOtro = $('#tutorParentescoOtro')?.value || '';

            if (firmaNombre && !firmaNombre.value) firmaNombre.value = tutorNombre;
            if (firmaId && !firmaId.value) firmaId.value = tutorId;
            if (firmaParen && !firmaParen.value) {
                firmaParen.value = tutorParen === 'otro'
                    ? (tutorParenOtro || 'Otro')
                    : traducirParentesco(tutorParen);
            }
        } else {
            const nombre = $('#nombreCompleto')?.value || '';
            const id = $('#identificacion')?.value || '';

            if (firmaNombre && !firmaNombre.value) firmaNombre.value = nombre;
            if (firmaId && !firmaId.value) firmaId.value = id;
        }
    }

    function traducirParentesco(valor) {
        const mapa = {
            padre: 'Padre',
            madre: 'Madre',
            encargado: 'Encargado legal',
            otro: 'Otro'
        };
        return mapa[valor] || valor;
    }

    // ------------------------------------------------------
    // Validaciones por paso
    // ------------------------------------------------------
    function validarPaso(n) {
        const errores = [];
        const paso = refs.pasos.find(p => Number(p.dataset.paso) === n);
        if (!paso) return { valido: true, errores };

        // Limpiar errores previos
        $$('.campo, .campo-check', paso).forEach(c => c.classList.remove('error'));
        $$('.error-msg', paso).forEach(e => e.textContent = '');

        switch (n) {
            case 1: return validarPaso1(paso);
            case 2: return validarPaso2(paso);
            case 3: return validarPaso3(paso);
            case 4: return window.Liberacion.validarPasoLiberacion();
            case 5: return { valido: true, errores: [] };
            default: return { valido: true, errores };
        }
    }

    function validarPaso1(paso) {
        const errores = [];
        const esMenor = state.esMenor;

        // Campos obligatorios base
        const campos = [
            { id: 'nombreCompleto', msg: 'Ingresa el nombre completo' },
            { id: 'fechaNacimiento', msg: 'Ingresa la fecha de nacimiento' },
            { id: 'sexo', msg: 'Selecciona el sexo' },
            { id: 'telefono', msg: 'Ingresa el teléfono' },
            { id: 'dojo', msg: 'Ingresa el dojo' },
            { id: 'grado', msg: 'Selecciona el grado' }
        ];

        // Identificación y email solo obligatorios si es adulto
        if (!esMenor) {
            campos.push({ id: 'identificacion', msg: 'Ingresa la identificación' });
            campos.push({ id: 'email', msg: 'Ingresa el correo' });
        }

        campos.forEach(({ id, msg }) => {
            const input = document.getElementById(id);
            if (!input || !input.value.trim()) {
                marcarError(input, msg);
                errores.push(msg);
            }
        });

        // Validar formato de email solo si tiene valor
        const email = $('#email');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            marcarError(email, 'Correo inválido');
            errores.push('Correo inválido');
        }

        // Validar que la edad esté en rango
        if (!state.bloqueEdad) {
            const fechaInput = $('#fechaNacimiento');
            marcarError(fechaInput, 'Edad fuera de rango del torneo (4 a 99 años)');
            errores.push('Edad fuera de rango');
        }

        return { valido: errores.length === 0, errores };
    }

    function validarPaso2(paso) {
        const errores = [];
        if (!state.esMenor) return { valido: true, errores };

        const campos = [
            { id: 'tutorNombre', msg: 'Ingresa el nombre del tutor' },
            { id: 'tutorParentesco', msg: 'Selecciona el parentesco' },
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

        const parentesco = $('#tutorParentesco');
        if (parentesco?.value === 'otro') {
            const otro = $('#tutorParentescoOtro');
            if (!otro || !otro.value.trim()) {
                marcarError(otro, 'Especifica el parentesco');
                errores.push('Especifica el parentesco');
            }
        }

        const email = $('#tutorEmail');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            marcarError(email, 'Correo inválido');
            errores.push('Correo inválido del tutor');
        }

        return { valido: errores.length === 0, errores };
    }

    function validarPaso3(paso) {
        const errores = [];
        const seleccionadas = window.Categorias.obtenerSeleccionadas();

        if (seleccionadas.length === 0) {
            errores.push('Selecciona al menos una categoría');
            let contenedorErr = $('#categoriasLista')?.parentElement?.querySelector('.error-general');
            if (!contenedorErr) {
                const lista = $('#categoriasLista');
                if (lista) {
                    const p = document.createElement('p');
                    p.className = 'error-msg error-general';
                    p.textContent = '⚠️ Selecciona al menos una categoría para continuar.';
                    lista.parentElement.appendChild(p);
                }
            }
        } else {
            const errGen = $('#categoriasLista')?.parentElement?.querySelector('.error-general');
            if (errGen) errGen.remove();
        }

        return { valido: errores.length === 0, errores };
    }

    // ------------------------------------------------------
    // Helpers de error
    // ------------------------------------------------------
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

    // ------------------------------------------------------
    // Progreso y botones
    // ------------------------------------------------------
    function actualizarProgreso() {
        const esMenor = state.esMenor;
        const pasosVisibles = esMenor ? [1, 2, 3, 4, 5] : [1, 3, 4, 5];
        const totalVisibles = pasosVisibles.length;
        const posicionActual = pasosVisibles.indexOf(state.pasoActual) + 1;

        const pct = totalVisibles > 0 ? (posicionActual / totalVisibles) * 100 : 0;
        if (refs.progressFill) refs.progressFill.style.width = `${pct}%`;

        refs.progressSteps.forEach((li, idx) => {
            const n = idx + 1;
            li.classList.remove('active', 'done');

            if (n === 2 && !esMenor) {
                li.style.display = 'none';
            } else {
                li.style.display = '';
            }

            if (n === state.pasoActual) {
                li.classList.add('active');
            } else if (pasosVisibles.includes(n) && pasosVisibles.indexOf(n) < posicionActual - 1) {
                li.classList.add('done');
            }
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
            if (esUltimo) {
                refs.btnSiguiente.hidden = true;
                refs.btnSiguiente.style.display = 'none';
            } else {
                refs.btnSiguiente.hidden = false;
                refs.btnSiguiente.style.display = '';
            }
        }

        if (refs.btnConfirmar) {
            if (esUltimo) {
                refs.btnConfirmar.hidden = false;
                refs.btnConfirmar.style.display = '';
            } else {
                refs.btnConfirmar.hidden = true;
                refs.btnConfirmar.style.display = 'none';
            }
        }
    }

    // ------------------------------------------------------
    // Generar folio
    // ------------------------------------------------------
    function generarFolio() {
        const year = new Date().getFullYear();
        const aleatorio = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        state.folio = `GC${year}-${aleatorio}`;
        return state.folio;
    }

    // ------------------------------------------------------
    // Recolectar datos
    // ------------------------------------------------------
    function recolectarDatos() {
        const categorias = window.Categorias.obtenerSeleccionadas();
        const total = categorias.reduce((acc, c) => acc + Number(c.precio || 0), 0);

        const datos = {
            folio: state.folio,
            competidor: {
                nombre: $('#nombreCompleto')?.value.trim() || '',
                fechaNacimiento: $('#fechaNacimiento')?.value || '',
                edad: parseInt($('#edadCalculada')?.value) || 0,
                sexo: $('#sexo')?.value || '',
                identificacion: $('#identificacion')?.value.trim() || '',
                email: $('#email')?.value.trim() || '',
                telefono: $('#telefono')?.value.trim() || '',
                dojo: $('#dojo')?.value.trim() || '',
                sensei: $('#sensei')?.value.trim() || '',
                grado: $('#grado')?.value || '',
                peso: $('#peso')?.value || '',
                condiciones: $('#condiciones')?.value.trim() || ''
            },
            categorias: categorias.map(c => ({
                id: c.id,
                nombre: c.nombre,
                precio: c.precio
            })),
            total: total,
            liberacion: window.Liberacion.obtenerDatosLiberacion()
        };

        if (state.esMenor) {
            let parentescoTexto = '';
            const parentescoValor = $('#tutorParentesco')?.value || '';
            if (parentescoValor === 'otro') {
                parentescoTexto = $('#tutorParentescoOtro')?.value.trim() || 'Otro';
            } else {
                parentescoTexto = traducirParentesco(parentescoValor);
            }

            datos.tutor = {
                nombre: $('#tutorNombre')?.value.trim() || '',
                parentesco: parentescoTexto,
                identificacion: $('#tutorIdentificacion')?.value.trim() || '',
                telefono: $('#tutorTelefono')?.value.trim() || '',
                email: $('#tutorEmail')?.value.trim() || ''
            };
        }

        state.datos = datos;
        return datos;
    }

    // ------------------------------------------------------
    // Generar resumen
    // ------------------------------------------------------
    function generarResumen() {
        const contenedor = $('#resumenInscripcion');
        if (!contenedor) return;

        const datos = recolectarDatos();
        const cfg = window.APP.config;
        const simbolo = cfg.simboloMoneda || '₡';

        // Filtrar filas vacías del competidor
        const filasCompetidor = [
            ['Nombre', datos.competidor.nombre],
            ['Edad', `${datos.competidor.edad} años`],
            ['Identificación', datos.competidor.identificacion],
            ['Correo', datos.competidor.email],
            ['Teléfono', datos.competidor.telefono],
            ['Dojo', datos.competidor.dojo],
            ['Grado', datos.competidor.grado]
        ].filter(([, v]) => v && String(v).trim() !== '' && v !== '0 años');

        const htmlCompetidor = filasCompetidor.map(
            ([k, v]) => `<div class="resumen-fila"><span>${k}</span><span>${v}</span></div>`
        ).join('');

        const htmlCategorias = datos.categorias.map(c =>
            `<li><span>${c.nombre}</span><span>${window.formatMoneda(c.precio, simbolo, cfg.locale)}</span></li>`
        ).join('');

        let htmlTutor = '';
        if (datos.tutor) {
            const filasTutor = [
                ['Nombre', datos.tutor.nombre],
                ['Parentesco', datos.tutor.parentesco],
                ['Identificación', datos.tutor.identificacion],
                ['Teléfono', datos.tutor.telefono],
                ['Correo', datos.tutor.email]
            ].filter(([, v]) => v && String(v).trim() !== '');

            htmlTutor = `
        <div class="resumen-bloque">
          <h3>Tutor responsable</h3>
          ${filasTutor.map(([k, v]) => `<div class="resumen-fila"><span>${k}</span><span>${v}</span></div>`).join('')}
        </div>
      `;
        }

        contenedor.innerHTML = `
      <div class="resumen-bloque">
        <h3>Competidor</h3>
        ${htmlCompetidor}
      </div>

      ${htmlTutor}

      <div class="resumen-bloque">
        <h3>Categorías inscritas</h3>
        <ul class="resumen-categorias">
          ${htmlCategorias}
        </ul>
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

    // ------------------------------------------------------
    // Confirmar inscripción
    // ------------------------------------------------------
    function confirmar() {
        for (let i = 1; i <= state.totalPasos; i++) {
            if (i === 2 && !state.esMenor) continue;
            const v = validarPaso(i);
            if (!v.valido) {
                irAPaso(i);
                mostrarErrores();
                return;
            }
        }

        const datos = recolectarDatos();
        if (!datos.folio) {
            datos.folio = generarFolio();
            state.folio = datos.folio;
        }

        const datosFinales = JSON.parse(JSON.stringify(datos));
        state.datos = datosFinales;
        state.confirmado = true;

        try {
            window.PDF.descargarPDF(datosFinales);
        } catch (e) {
            console.warn('[formulario.js] No se pudo descargar el PDF:', e);
        }

        pintarConfirmacion(datosFinales);
        window.Navegacion.irA('confirmacion');
        limpiarFormulario();
    }

    // ------------------------------------------------------
    // Limpiar el formulario (sin tocar la vista)
    // ------------------------------------------------------
    function limpiarFormulario() {
        refs.form?.reset();

        state.pasoActual = 1;
        state.esMenor = false;
        state.bloqueEdad = null;
        state.folio = null;

        window.Categorias.reset();
        window.Liberacion.reset();

        const edadInput = $('#edadCalculada');
        if (edadInput) edadInput.value = '';
        const aviso = $('#avisoMenor');
        if (aviso) aviso.hidden = true;

        const parentescoOtroWrap = $('#parentescoOtroWrap');
        if (parentescoOtroWrap) parentescoOtroWrap.hidden = true;

        deshabilitarPaso2();
        actualizarIndicadoresOpcionales();

        refs.pasos.forEach(p => p.classList.remove('activo'));
        const paso1 = refs.pasos.find(p => Number(p.dataset.paso) === 1);
        if (paso1) paso1.classList.add('activo');

        actualizarProgreso();
        actualizarBotones();
    }

    // ------------------------------------------------------
    // Pintar vista de confirmación
    // ------------------------------------------------------
    function pintarConfirmacion(datos) {
        const cfg = window.APP.config;
        const simbolo = cfg.simboloMoneda || '₡';

        const folioTexto = $('#folioTexto');
        if (folioTexto) folioTexto.textContent = datos.folio;

        const totalFinal = $('#totalFinal');
        if (totalFinal) totalFinal.textContent = window.formatMoneda(datos.total, simbolo, cfg.locale);

        const resumenFinal = $('#resumenFinal');
        if (resumenFinal) {
            const resumenPaso5 = $('#resumenInscripcion');
            if (resumenPaso5) resumenFinal.innerHTML = resumenPaso5.innerHTML;
        }
    }

    // ------------------------------------------------------
    // Reset completo
    // ------------------------------------------------------
    function resetCompleto() {
        limpiarFormulario();
        state.datos = null;
        state.confirmado = false;
    }

    // ------------------------------------------------------
    // Eventos
    // ------------------------------------------------------
    function engancharEventos() {
        refs.btnSiguiente?.addEventListener('click', () => irAPaso(state.pasoActual + 1));
        refs.btnAnterior?.addEventListener('click', () => irAPaso(state.pasoActual - 1));
        refs.btnConfirmar?.addEventListener('click', confirmar);

        $('#fechaNacimiento')?.addEventListener('change', recalcularEdadYBloque);
        $('#fechaNacimiento')?.addEventListener('input', recalcularEdadYBloque);

        $('#tutorParentesco')?.addEventListener('change', (e) => {
            const wrap = $('#parentescoOtroWrap');
            if (wrap) wrap.hidden = e.target.value !== 'otro';
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

        document.addEventListener('categorias:change', () => {
            if (state.pasoActual === 5) generarResumen();
        });

        document.addEventListener('vista:change', (e) => {
            if (e.detail.vista === 'formulario' && state.confirmado) {
                resetCompleto();
            }
        });
    }

    // ------------------------------------------------------
    // Init
    // ------------------------------------------------------
    function init() {
        if (state.iniciado) return;
        cachearRefs();
        if (!refs.form) return;

        deshabilitarPaso2();
        actualizarIndicadoresOpcionales();
        engancharEventos();
        irAPaso(1);
        state.iniciado = true;
    }

    window.Formulario = {
        irAPaso,
        reset: resetCompleto,
        esMenorEdad: () => state.esMenor,
        getBloqueEdad: () => state.bloqueEdad,
        getPasoActual: () => state.pasoActual
    };

    document.addEventListener('app:listo', init);
    if (window.APP && window.APP.listo) init();

})();