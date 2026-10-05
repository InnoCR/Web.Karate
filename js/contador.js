/* =========================================================
   GUANA-CUP 2026 · contador.js
   Contador regresivo hasta la fecha del torneo.
   Se detiene cuando llega a cero o cuando las inscripciones
   están cerradas.
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    // Referencias a los nodos del contador
    const nodos = {
        dias: null,
        horas: null,
        minutos: null,
        segundos: null,
        estado: null
    };

    let intervalo = null;

    // ------------------------------------------------------
    // Rellena un número con ceros a la izquierda
    // ------------------------------------------------------
    function pad(n, len = 2) {
        return String(n).padStart(len, '0');
    }

    // ------------------------------------------------------
    // Actualiza los nodos del DOM con los valores calculados
    // ------------------------------------------------------
    function pintar({ dias, horas, minutos, segundos }) {
        if (nodos.dias) nodos.dias.textContent = pad(dias, 2);
        if (nodos.horas) nodos.horas.textContent = pad(horas, 2);
        if (nodos.minutos) nodos.minutos.textContent = pad(minutos, 2);
        if (nodos.segundos) nodos.segundos.textContent = pad(segundos, 2);
    }

    // ------------------------------------------------------
    // Calcula la diferencia entre ahora y la fecha objetivo
    // ------------------------------------------------------
    function calcularDiferencia(objetivo, ahora) {
        const diff = objetivo.getTime() - ahora.getTime();
        if (diff <= 0) {
            return { dias: 0, horas: 0, minutos: 0, segundos: 0, terminado: true };
        }
        const segTotal = Math.floor(diff / 1000);
        const dias = Math.floor(segTotal / 86400);
        const horas = Math.floor((segTotal % 86400) / 3600);
        const minutos = Math.floor((segTotal % 3600) / 60);
        const segundos = segTotal % 60;
        return { dias, horas, minutos, segundos, terminado: false };
    }

    // ------------------------------------------------------
    // Actualiza el mensaje de estado bajo el contador
    // ------------------------------------------------------
    function actualizarEstado(terminado) {
        if (!nodos.estado) return;

        // Si las inscripciones están cerradas por bandera o fecha límite
        if (!window.APP.inscripcionesActivas) {
            nodos.estado.textContent = '⚠️ Las inscripciones están cerradas. Contacta al organizador por WhatsApp.';
            nodos.estado.style.color = 'var(--color-warning)';
            return;
        }

        if (terminado) {
            nodos.estado.textContent = '🥋 ¡Hoy es el gran día!';
            nodos.estado.style.color = 'var(--color-gold)';
            return;
        }

        nodos.estado.textContent = 'Inscripciones abiertas — asegura tu lugar antes del cierre.';
        nodos.estado.style.color = 'var(--color-text-muted)';
    }

    // ------------------------------------------------------
    // Tick: se ejecuta cada segundo
    // ------------------------------------------------------
    function tick() {
        const cfg = window.APP.config;
        if (!cfg || !cfg.fechaTorneo) return;

        const objetivo = new Date(cfg.fechaTorneo + 'T00:00:00');
        const ahora = new Date();
        const diff = calcularDiferencia(objetivo, ahora);

        pintar(diff);
        actualizarEstado(diff.terminado);

        if (diff.terminado && intervalo) {
            clearInterval(intervalo);
            intervalo = null;
        }
    }

    // ------------------------------------------------------
    // Inicializa el contador
    // ------------------------------------------------------
    function iniciar() {
        nodos.dias = $('#cdDias');
        nodos.horas = $('#cdHoras');
        nodos.minutos = $('#cdMinutos');
        nodos.segundos = $('#cdSegundos');
        nodos.estado = $('#contadorEstado');

        // Verificación mínima
        if (!nodos.dias || !nodos.horas || !nodos.minutos || !nodos.segundos) {
            console.warn('[contador.js] No se encontraron los nodos del contador.');
            return;
        }

        tick();
        intervalo = setInterval(tick, 1000);
    }

    // ------------------------------------------------------
    // Arranque: esperamos a que config.js haya cargado los JSON
    // ------------------------------------------------------
    document.addEventListener('app:listo', iniciar);

    // Fallback por si el evento ya se disparó antes de registrar el listener
    if (window.APP && window.APP.listo) {
        iniciar();
    }

})();