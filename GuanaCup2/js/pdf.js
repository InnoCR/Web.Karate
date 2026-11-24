/* =========================================================
   GUANACUP2 · pdf.js
   Genera el PDF de liberación de responsabilidad con jsPDF.
   Incluye: encabezado, datos del competidor, firmante,
   texto legal con secciones, firma dibujada (canvas) y
   pie de página con folio + timestamp.
   ========================================================= */

(function () {
    'use strict';

    // ============================================
    // GENERACIÓN DEL PDF
    // ============================================
    function generarPDF(registro) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF no está cargado. Verifica libs/jspdf.umd.min.js');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const c = registro.competidor || {};
        const f = registro.firma || {};
        const cfg = registro.config || window.GC2.config || {};
        const lib = registro.liberacion || window.GC2.liberacion || {};

        // ============================================
        // CONFIGURACIÓN
        // ============================================
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margen = 15;
        const anchoUtil = pageW - margen * 2;
        let y = margen;

        const ROJO = [200, 16, 46];
        const NEGRO = [10, 10, 10];
        const GRIS = [90, 90, 90];
        const GRIS_CLARO = [180, 180, 180];
        const DORADO = [180, 140, 40];

        function setColor(rgb) {
            doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        }

        function checkPageBreak(alturaNecesaria) {
            if (y + alturaNecesaria > pageH - 20) {
                doc.addPage();
                y = margen;
            }
        }

        function separador() {
            doc.setDrawColor(GRIS_CLARO[0], GRIS_CLARO[1], GRIS_CLARO[2]);
            doc.setLineWidth(0.2);
            doc.line(margen, y, pageW - margen, y);
        }

        function dibujarCampo(label, valor) {
            if (valor == null || valor === '') valor = '—';
            checkPageBreak(6);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            setColor(GRIS);
            doc.text(label + ':', margen, y);

            doc.setFont('helvetica', 'normal');
            setColor(NEGRO);

            const valorStr = String(valor);
            const lineas = doc.splitTextToSize(valorStr, anchoUtil - 40);
            doc.text(lineas[0] || '—', margen + 38, y);
            y += 4.8;

            for (let i = 1; i < lineas.length; i++) {
                checkPageBreak(4);
                doc.text(lineas[i], margen + 38, y);
                y += 4.8;
            }
        }

        // ============================================
        // ENCABEZADO
        // ============================================
        doc.setFillColor(NEGRO[0], NEGRO[1], NEGRO[2]);
        doc.rect(0, 0, pageW, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('TORNEO GUANA-CUP 2027', margen, 11);

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text('International Budokai Union — Kyokushin', margen, 17);
        doc.text('Liberación de Responsabilidad · Peleas Pactadas', margen, 23);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(DORADO[0], DORADO[1], DORADO[2]);
        doc.text(`Folio: ${registro.folio || '—'}`, pageW - margen, 15, { align: 'right' });

        y = 38;

        // ============================================
        // DATOS DEL COMPETIDOR
        // ============================================
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        setColor(ROJO);
        doc.text('DATOS DEL COMPETIDOR', margen, y);
        y += 2;
        doc.setDrawColor(ROJO[0], ROJO[1], ROJO[2]);
        doc.setLineWidth(0.4);
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        dibujarCampo('Nombre completo', c.nombreCompleto);
        dibujarCampo('Fecha de nacimiento', c.fechaNacimiento);
        dibujarCampo('Edad al torneo', c.edadCalculada);
        dibujarCampo('Sexo', c.sexo === 'M' ? 'Masculino' : c.sexo === 'F' ? 'Femenino' : c.sexo);
        dibujarCampo('Identificación', c.identificacion);
        dibujarCampo('Email', c.email);
        dibujarCampo('Teléfono', c.telefono);
        dibujarCampo('Dojo / Academia', c.dojo);
        dibujarCampo('Sensei / Instructor', c.sensei || '—');
        dibujarCampo('Grado', c.grado);
        dibujarCampo('Peso', c.peso ? c.peso + ' kg' : '—');
        if (c.condiciones) {
            dibujarCampo('Condiciones médicas', c.condiciones);
        }

        y += 3;
        separador();
        y += 5;

        // ============================================
        // DATOS DEL FIRMANTE
        // ============================================
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        setColor(ROJO);
        doc.text('DATOS DEL FIRMANTE', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        dibujarCampo('Nombre completo', f.nombre);
        dibujarCampo('Identificación', f.identificacion);
        dibujarCampo('Aceptación', f.acepto ? 'SÍ' : 'NO');
        dibujarCampo('Versión del documento', f.version || lib.version || 'v1.0-2027');

        y += 3;
        separador();
        y += 5;

        // ============================================
        // TEXTO DE LA LIBERACIÓN (secciones)
        // ============================================
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        setColor(ROJO);
        doc.text('TEXTO DE LA LIBERACIÓN', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        const secciones = lib.secciones || [];

        secciones.forEach((sec) => {
            checkPageBreak(15);

            // Título de sección
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold');
            setColor(NEGRO);
            const tituloLineas = doc.splitTextToSize(sec.titulo, anchoUtil);
            tituloLineas.forEach((linea) => {
                checkPageBreak(5);
                doc.text(linea, margen, y);
                y += 4.8;
            });

            // Párrafos
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            setColor(NEGRO);

            sec.parrafos.forEach((p) => {
                const lineas = doc.splitTextToSize(p, anchoUtil);
                lineas.forEach((linea) => {
                    checkPageBreak(4.2);
                    doc.text(linea, margen, y);
                    y += 4.2;
                });
                y += 1.5;
            });

            y += 2;
        });

        y += 3;
        separador();
        y += 6;

        // ============================================
        // FIRMA ELECTRÓNICA
        // ============================================
        const alturaBloqueFirma = 70;
        if (y + alturaBloqueFirma > pageH - 20) {
            doc.addPage();
            y = margen;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        setColor(ROJO);
        doc.text('FIRMA ELECTRÓNICA', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 8;

        // Datos de validez
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        setColor(NEGRO);

        doc.setFont('helvetica', 'bold');
        doc.text('Firmado por:', margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(f.nombre || '—', margen + 32, y);
        y += 5.5;

        doc.setFont('helvetica', 'bold');
        doc.text('Identificación:', margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(f.identificacion || '—', margen + 32, y);
        y += 5.5;

        doc.setFont('helvetica', 'bold');
        doc.text('Fecha:', margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(formatearFecha(f.fechaAceptacion || new Date().toISOString()), margen + 32, y);
        y += 8;

        // Imagen de la firma (canvas)
        if (f.firmaImagen) {
            try {
                const anchoFirma = 75;
                const altoFirma = 25;

                if (y + altoFirma + 15 > pageH - margen) {
                    doc.addPage();
                    y = margen + 10;
                }

                // Caja con borde alrededor de la firma
                doc.setDrawColor(GRIS[0], GRIS[1], GRIS[2]);
                doc.setLineWidth(0.3);
                doc.rect(margen, y, anchoFirma, altoFirma);

                doc.addImage(f.firmaImagen, 'PNG', margen + 1, y + 1, anchoFirma - 2, altoFirma - 2);
                y += altoFirma + 4;

                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'italic');
                setColor(GRIS);
                doc.text('Firma electrónica del participante', margen, y);
                y += 4;
            } catch (e) {
                console.warn('[GC2] No se pudo insertar la imagen de la firma:', e);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                setColor(GRIS);
                doc.text('(No se pudo renderizar la firma dibujada)', margen, y);
                y += 5;
            }
        } else {
            // Línea de firma vacía si no hay imagen
            doc.setDrawColor(NEGRO[0], NEGRO[1], NEGRO[2]);
            doc.setLineWidth(0.3);
            doc.line(margen, y, margen + 75, y);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            setColor(GRIS);
            doc.text('Firma del participante', margen, y + 4);
            y += 8;
        }

        // ============================================
        // PIE DE PÁGINA
        // ============================================
        const totalPaginas = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            setColor(GRIS_CLARO);
            doc.text(
                `${cfg.torneo || 'Guana-Cup 2027'} · Liberación de responsabilidad · Página ${i} de ${totalPaginas}`,
                pageW / 2,
                pageH - 8,
                { align: 'center' }
            );
        }

        return doc;
    }

    // ============================================
    // HELPERS
    // ============================================
    function formatearFecha(isoString) {
        try {
            const d = new Date(isoString);
            if (isNaN(d)) return String(isoString);
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const anio = d.getFullYear();
            const hora = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${anio} ${hora}:${min}`;
        } catch (e) {
            return String(isoString);
        }
    }

    function construirNombreArchivo(registro) {
        const folio = (registro.folio || 'sin-folio').replace(/[^A-Za-z0-9-]/g, '');
        const nombre = String((registro.competidor && registro.competidor.nombreCompleto) || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 40);
        return `Liberacion_${folio}_${nombre || 'Competidor'}.pdf`;
    }

    // ============================================
    // DESCARGA
    // ============================================
    function descargarPDF(registro, nombreArchivo) {
        try {
            const doc = generarPDF(registro);
            const nombre = nombreArchivo || construirNombreArchivo(registro);
            doc.save(nombre);
            console.info('[GC2] PDF descargado:', nombre);
            return true;
        } catch (err) {
            console.error('[GC2] Error al generar PDF:', err);
            alert('No se pudo generar el PDF: ' + err.message);
            return false;
        }
    }

    // ============================================
    // API PÚBLICA
    // ============================================
    window.GC2 = window.GC2 || {};
    window.GC2.pdf = {
        generarPDF,
        descargarPDF,
        construirNombreArchivo
    };

    console.info('[GC2] pdf.js cargado. jsPDF:', !!(window.jspdf && window.jspdf.jsPDF));
})();