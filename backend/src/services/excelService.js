import ExcelJS from 'exceljs';

export const generarExcelIndicadores = async (indicadores) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Indicadores de Gestión');

  // Configure gridlines
  worksheet.views = [{ showGridLines: true }];

  // Column definitions
  worksheet.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Nombre', key: 'nombre', width: 35 },
    { header: 'Proceso', key: 'proceso', width: 25 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Meta', key: 'meta', width: 12 },
    { header: 'Último Valor', key: 'ultimo_valor', width: 15 },
    { header: 'Cumplimiento', key: 'cumplimiento', width: 15 },
    { header: 'Estado', key: 'estado', width: 12 },
  ];

  // Header styles (Dark Blue corporate #0f2044)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2044' },
    };
    cell.font = {
      name: 'Segoe UI',
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Populate rows
  indicadores.forEach((ind, index) => {
    const rowNumber = index + 2;
    const cumpl = ind.ultimo_cumplimiento != null ? parseFloat(ind.ultimo_cumplimiento) : null;
    
    const row = worksheet.addRow({
      codigo: ind.codigo,
      nombre: ind.nombre,
      proceso: ind.proceso || '—',
      tipo: ind.tipo.toUpperCase(),
      meta: ind.meta != null ? `${ind.meta} ${ind.unidad_medida || ''}` : '—',
      ultimo_valor: ind.ultimo_valor != null ? `${ind.ultimo_valor} ${ind.unidad_medida || ''}` : '—',
      cumplimiento: cumpl != null ? cumpl / 100 : null, // Store as fraction for Excel percentage format
      estado: ind.estado.toUpperCase(),
    });

    row.height = 22;

    // Default row styling & zebra striping
    const isEven = rowNumber % 2 === 0;
    const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Zebra striping

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // Default cell background
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg },
      };

      // Thin borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Specific column alignments
      if (colNumber === 1) cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Código
      if (colNumber === 4) cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Tipo
      if (colNumber === 5) cell.alignment = { vertical: 'middle', horizontal: 'right' };  // Meta
      if (colNumber === 6) cell.alignment = { vertical: 'middle', horizontal: 'right' };  // Último valor
      if (colNumber === 8) cell.alignment = { vertical: 'middle', horizontal: 'center' }; // Estado
    });

    // Formatting & color coding for Compliance Column (col 7)
    const cumplCell = row.getCell(7);
    cumplCell.alignment = { vertical: 'middle', horizontal: 'right' };

    if (cumpl != null) {
      cumplCell.numFmt = '0.0%';
      // Color-coding (Green for >= 95%, Yellow for >= 75%, Red for < 75%)
      let colorBg = 'FFFEE2E2'; // Light Red
      let colorText = 'FF991B1B'; // Dark Red
      
      if (cumpl >= 95) {
        colorBg = 'FFDCFCE7'; // Light Green
        colorText = 'FF166534'; // Dark Green
      } else if (cumpl >= 75) {
        colorBg = 'FFFEF9C3'; // Light Yellow
        colorText = 'FF854D0E'; // Dark Yellow
      }

      cumplCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colorBg },
      };
      cumplCell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: colorText },
      };
    } else {
      cumplCell.value = '—';
      cumplCell.alignment = { vertical: 'middle', horizontal: 'center' };
      cumplCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF94A3B8' } };
    }

    // Formatting for Status Column (col 8)
    const estadoCell = row.getCell(8);
    const estadoVal = ind.estado.toLowerCase();
    const isActivo = estadoVal === 'activo';
    estadoCell.font = {
      name: 'Segoe UI',
      size: 9,
      bold: true,
      color: { argb: isActivo ? 'FF166534' : 'FF64748B' },
    };
    estadoCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isActivo ? 'FFDCFCE7' : 'FFF1F5F9' },
    };
  });

  return await workbook.xlsx.writeBuffer();
};
