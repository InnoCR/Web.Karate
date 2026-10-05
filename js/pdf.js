/* =========================================================
   GUANA-CUP 2026 · pdf.js
   Genera el PDF de la liberación de responsabilidad usando
   jsPDF. Incluye la firma dibujada en canvas como imagen.
   ========================================================= */

(function () {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    // ------------------------------------------------------
    // Quita las etiquetas HTML del texto de la liberación
    // para usarlo como texto plano en el PDF
    // ------------------------------------------------------
    function htmlATexto(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        temp.querySelectorAll('h3').forEach(h => {
            h.textContent = '\n' + h.textContent.toUpperCase() + '\n';
        });
        temp.querySelectorAll('p').forEach(p => {
            p.textContent = p.textContent.trim() + '\n';
        });
        return temp.textContent.replace(/\n{3,}/g, '\n\n').trim();
    }

    // ------------------------------------------------------
    // Divide un texto largo en líneas que quepan en el PDF
    // ------------------------------------------------------
    function dividirTexto(doc, texto, anchoMax) {
        return doc.splitTextToSize(texto, anchoMax);
    }

    // ------------------------------------------------------
    // Genera el PDF y devuelve el objeto jsPDF
    // ------------------------------------------------------
    function generarPDF(datos) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF no está cargado. Revisa libs/jspdf.umd.min.js');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const cfg = window.APP.config || {};
        const simbolo = cfg.simboloMoneda || '₡';
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margen = 15;
        const anchoUtil = pageW - margen * 2;
        let y = margen;

        // ------- Colores -------
        const ROJO = [200, 16, 46];
        const NEGRO = [10, 10, 10];
        const GRIS = [90, 90, 90];
        const DORADO = [180, 140, 40];

        // =========================================
        // ENCABEZADO
        // =========================================
        doc.setFillColor(...NEGRO);
        doc.rect(0, 0, pageW, 30, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('TORNEO GUANA-CUP 2026', margen, 13);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('International Budokai Union — Kyokushin', margen, 19);
        doc.text('Liberación de Responsabilidad', margen, 25);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...DORADO);
        doc.text(`Folio: ${datos.folio}`, pageW - margen, 19, { align: 'right' });

        y = 40;

        // =========================================
        // DATOS DEL COMPETIDOR
        // =========================================
        doc.setTextColor(...ROJO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DATOS DEL COMPETIDOR', margen, y);
        y += 2;
        doc.setDrawColor(...ROJO);
        doc.setLineWidth(0.4);
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const filasCompetidor = [
            ['Nombre:', datos.competidor.nombre],
            ['Identificación:', datos.competidor.identificacion],
            ['Fecha de nacimiento:', datos.competidor.fechaNacimiento],
            ['Edad al torneo:', `${datos.competidor.edad} años`],
            ['Sexo:', datos.competidor.sexo],
            ['Dojo / Academia:', datos.competidor.dojo],
            ['Grado:', datos.competidor.grado],
            ['Correo:', datos.competidor.email],
            ['Teléfono:', datos.competidor.telefono]
        ];

        filasCompetidor.forEach(([label, valor]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, margen, y);
            doc.setFont('helvetica', 'normal');
            doc.text(String(valor || '—'), margen + 45, y);
            y += 5.5;
        });

        // =========================================
        // DATOS DEL TUTOR (si aplica)
        // =========================================
        if (datos.tutor && datos.tutor.nombre) {
            y += 3;
            doc.setTextColor(...ROJO);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('DATOS DEL TUTOR RESPONSABLE', margen, y);
            y += 2;
            doc.line(margen, y, pageW - margen, y);
            y += 6;

            doc.setTextColor(...NEGRO);
            doc.setFontSize(10);
            const filasTutor = [
                ['Nombre:', datos.tutor.nombre],
                ['Parentesco:', datos.tutor.parentesco],
                ['Identificación:', datos.tutor.identificacion],
                ['Teléfono:', datos.tutor.telefono],
                ['Correo:', datos.tutor.email]
            ];
            filasTutor.forEach(([label, valor]) => {
                doc.setFont('helvetica', 'bold');
                doc.text(label, margen, y);
                doc.setFont('helvetica', 'normal');
                doc.text(String(valor || '—'), margen + 45, y);
                y += 5.5;
            });
        }

        // =========================================
        // CATEGORÍAS
        // =========================================
        y += 3;
        doc.setTextColor(...ROJO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('CATEGORÍAS INSCRITAS', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        doc.setTextColor(...NEGRO);
        doc.setFontSize(10);
        datos.categorias.forEach(cat => {
            doc.setFont('helvetica', 'normal');
            doc.text(`• ${cat.nombre}`, margen, y);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DORADO);
            doc.text(
                window.formatMoneda(cat.precio, simbolo, cfg.locale),
                pageW - margen, y,
                { align: 'right' }
            );
            doc.setTextColor(...NEGRO);
            y += 5.5;
        });

        y += 2;
        doc.setDrawColor(...DORADO);
        doc.setLineWidth(0.5);
        doc.line(pageW - margen - 60, y, pageW - margen, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TOTAL A PAGAR:', pageW - margen - 60, y);
        doc.setTextColor(...ROJO);
        doc.text(
            window.formatMoneda(datos.total, simbolo, cfg.locale),
            pageW - margen, y,
            { align: 'right' }
        );

        // =========================================
        // TEXTO DE LA LIBERACIÓN
        // =========================================
        y += 12;
        doc.setTextColor(...ROJO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TEXTO DE LA LIBERACIÓN', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 6;

        doc.setTextColor(...NEGRO);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const textoPlano = htmlATexto(datos.liberacion.texto);
        const lineas = dividirTexto(doc, textoPlano, anchoUtil);

        lineas.forEach(linea => {
            if (y > pageH - 40) {
                doc.addPage();
                y = margen;
            }
            doc.text(linea, margen, y);
            y += 4.5;
        });

        // =========================================
        // FIRMA ELECTRÓNICA
        // =========================================
        // Verificar que quepa el bloque completo (datos + firma + línea)
        const alturaBloqueFirma = 70;
        if (y > pageH - alturaBloqueFirma) {
            doc.addPage();
            y = margen;
        }

        y += 8;
        doc.setTextColor(...ROJO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('FIRMA ELECTRÓNICA', margen, y);
        y += 2;
        doc.line(margen, y, pageW - margen, y);
        y += 8;

        // Datos del firmante
        doc.setTextColor(...NEGRO);
        doc.setFontSize(10);

        doc.setFont('helvetica', 'bold');
        doc.text('Firmado por:', margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.liberacion.firmaNombre || '—', margen + 35, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Identificación:', margen, y);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.liberacion.firmaIdentificacion || '—', margen + 35, y);
        y += 6;

        if (datos.liberacion.firmaParentesco) {
            doc.setFont('helvetica', 'bold');
            doc.text('Parentesco:', margen, y);
            doc.setFont('helvetica', 'normal');
            doc.text(datos.liberacion.firmaParentesco, margen + 35, y);
            y += 6;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Fecha:', margen, y);
        doc.setFont('helvetica', 'normal');
        const fechaTexto = new Date(datos.liberacion.fechaAceptacion).toLocaleString('es-CR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        doc.text(fechaTexto, margen + 35, y);
        y += 10;

        // Imagen de la firma dibujada
        if (datos.liberacion.firmaImagen) {
            try {
                const anchoFirma = 70;   // mm
                const altoFirma = 25;   // mm

                // Verificar que quepa
                if (y + altoFirma + 12 > pageH - margen) {
                    doc.addPage();
                    y = margen + 10;
                }

                doc.addImage(
                    datos.liberacion.firmaImagen,
                    'PNG',
                    margen,
                    y,
                    anchoFirma,
                    altoFirma
                );
                y += altoFirma + 3;
            } catch (e) {
                console.warn('[pdf.js] No se pudo insertar la firma:', e);
            }
        }

        // Línea de firma
        doc.setDrawColor(...NEGRO);
        doc.setLineWidth(0.3);
        doc.line(margen, y, margen + 80, y);
        doc.setFontSize(8);
        doc.setTextColor(...GRIS);
        doc.text('Firma', margen, y + 4);

        // =========================================
        // PIE DE PÁGINA
        // =========================================
        const totalPaginas = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...GRIS);
            doc.text(
                `Documento generado electrónicamente · ${cfg.torneo || ''} · Página ${i} de ${totalPaginas}`,
                pageW / 2, pageH - 8,
                { align: 'center' }
            );
        }

        return doc;
    }

    // ------------------------------------------------------
    // Descarga el PDF con un nombre de archivo específico
    // ------------------------------------------------------
    function descargarPDF(datos) {
        try {
            const doc = generarPDF(datos);
            const nombre = `Liberacion_${datos.folio}_${(datos.competidor.nombre || 'competidor').replace(/\s+/g, '_')}.pdf`;
            doc.save(nombre);
            return true;
        } catch (err) {
            console.error('[pdf.js] Error al generar PDF:', err);
            alert('No se pudo generar el PDF. Revisa la consola para más detalles.');
            return false;
        }
    }

    // ------------------------------------------------------
    // API pública
    // ------------------------------------------------------
    window.PDF = {
        generarPDF,
        descargarPDF
    };

})();