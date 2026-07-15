import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MeasurementRow {
  position: string;
  diameter1: string;
  diameter2: string;
  corrosionSeverity: string;
  damageNature: string;
  damageSeverity: string;
  brokenWires: string;
  brokenWiresSeverity: string;
  overallAssessment: string;
}

interface PhotoEntry {
  preview: string;
  caption: string;
}

interface ReportData {
  reportNumber: string;
  inspectionDate: string;
  inspector: string;
  client: string;
  location: string;
  jbr: string;
  application: string;
  manufacturer: string;
  installationDate: string;
  manufacturingDate: string;
  originalCertificate: string;
  construction: string;
  nominalDiameter: string;
  referenceDiameter: string;
  measuredDiameter: string;
  originalLength: string;
  magneticHead: string;
  magneticHeadSerial: string;
  sensorUsed: string;
  dataLoggerSerial: string;
  measurements: MeasurementRow[];
  lmaGraphPreview: string;
  lfGraphPreview: string;
  velocityGraphPreview: string;
  lmaObservations: string;
  lfObservations: string;
  photos: PhotoEntry[];
  conclusion: string;
  recommendations: string;
  conductedBy: string;
  approvedBy: string;
}

export const generateWireRopeReportPDF = async (data: ReportData) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE INSPEÇÃO VISUAL, DIMENSIONAL E ELETROMAGNÉTICA (MRT)', 105, yPos, { align: 'center' });
  yPos += 10;
  doc.text('CABO DE AÇO', 105, yPos, { align: 'center' });
  yPos += 15;

  // Report Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = 110;
  
  doc.text(`Relatório / Report: ${data.reportNumber}`, leftCol, yPos);
  doc.text(`Data / Inspection Date: ${data.inspectionDate}`, rightCol, yPos);
  yPos += 7;
  
  doc.text(`Inspetor / Inspector: ${data.inspector}`, leftCol, yPos);
  doc.text(`Cliente / Client: ${data.client}`, rightCol, yPos);
  yPos += 7;
  
  doc.text(`Local / Location: ${data.location}`, leftCol, yPos);
  doc.text(`JBR: ${data.jbr}`, rightCol, yPos);
  yPos += 15;

  // Wire Rope Data Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CABO DE AÇO', leftCol, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Aplicação / Application: ${data.application}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Fabricante / Manufacturer: ${data.manufacturer}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Data de Instalação / Installation Date: ${data.installationDate}`, leftCol, yPos);
  doc.text(`Data de Fabricação / Manufacturing Date: ${data.manufacturingDate}`, rightCol, yPos);
  yPos += 7;
  doc.text(`Certificado Original / Original Certificate: ${data.originalCertificate}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Construção / Construction: ${data.construction}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Diâmetro Nominal / Nominal Diameter: ${data.nominalDiameter} mm`, leftCol, yPos);
  yPos += 7;
  doc.text(`Diâmetro de Referência / Reference Diameter: ${data.referenceDiameter} mm`, leftCol, yPos);
  yPos += 7;
  doc.text(`Diâmetro Medido / Measured Diameter: ${data.measuredDiameter} mm`, leftCol, yPos);
  yPos += 7;
  doc.text(`Comprimento Original / Original Length: ${data.originalLength} m`, leftCol, yPos);
  yPos += 15;

  // Equipment Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPAMENTO DE INSPEÇÃO', leftCol, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Cabeça Magnética / Magnetic Head: ${data.magneticHead}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Nº Série Cabeça Magnética / MH Serial Number: ${data.magneticHeadSerial}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Sensor Utilizado / Sensor Used: ${data.sensorUsed}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Nº Série Unidade de Dados / Datalogger Serial: ${data.dataLoggerSerial}`, leftCol, yPos);
  yPos += 15;

  // Measurements Table
  if (data.measurements.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TABELA DE AVALIAÇÃO DE SEVERIDADE', leftCol, yPos);
    yPos += 10;

    const tableData = data.measurements.map(m => [
      m.position,
      m.diameter1,
      m.diameter2,
      m.corrosionSeverity,
      m.damageNature,
      m.damageSeverity,
      m.brokenWires,
      m.brokenWiresSeverity,
      m.overallAssessment
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [[
        'Posição\n(m)',
        'Diâm. 1\n(mm)',
        'Diâm. 2\n(mm)',
        'Corrosão\n(%)',
        'Natureza\nDano',
        'Sever.\nDano (%)',
        'Arames\nRompidos',
        'Sever.\nArames (%)',
        'Aval.\nGeral (%)'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 20 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // MRT Results
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESULTADOS MRT', leftCol, yPos);
  yPos += 10;

  // Add graphs if available
  if (data.lmaGraphPreview) {
    try {
      doc.addImage(data.lmaGraphPreview, 'JPEG', leftCol, yPos, 80, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Gráfico LMA', leftCol, yPos + 65);
    } catch (e) {
      console.error('Error adding LMA graph:', e);
    }
  }

  if (data.lfGraphPreview) {
    try {
      doc.addImage(data.lfGraphPreview, 'JPEG', rightCol, yPos, 80, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Gráfico LF', rightCol, yPos + 65);
    } catch (e) {
      console.error('Error adding LF graph:', e);
    }
  }

  yPos += 75;

  if (data.velocityGraphPreview) {
    try {
      doc.addImage(data.velocityGraphPreview, 'JPEG', leftCol, yPos, 80, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Gráfico de Velocidade', leftCol, yPos + 65);
      yPos += 75;
    } catch (e) {
      console.error('Error adding velocity graph:', e);
    }
  }

  // Observations
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Observações LMA:', leftCol, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const lmaLines = doc.splitTextToSize(data.lmaObservations || 'N/A', 170);
  doc.text(lmaLines, leftCol, yPos);
  yPos += (lmaLines.length * 7) + 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Observações LF:', leftCol, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  const lfLines = doc.splitTextToSize(data.lfObservations || 'N/A', 170);
  doc.text(lfLines, leftCol, yPos);
  yPos += (lfLines.length * 7) + 15;

  // Photos
  if (data.photos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FOTOS DA INSPEÇÃO', leftCol, yPos);
    yPos += 10;

    for (const photo of data.photos) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      try {
        doc.addImage(photo.preview, 'JPEG', leftCol, yPos, 80, 60);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const captionLines = doc.splitTextToSize(photo.caption || '', 80);
        doc.text(captionLines, leftCol, yPos + 65);
        yPos += 75 + (captionLines.length * 5);
      } catch (e) {
        console.error('Error adding photo:', e);
      }
    }
  }

  // Conclusion
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCLUSÃO', leftCol, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const conclusionLines = doc.splitTextToSize(data.conclusion || 'N/A', 170);
  doc.text(conclusionLines, leftCol, yPos);
  yPos += (conclusionLines.length * 7) + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RECOMENDAÇÕES', leftCol, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const recommendationsLines = doc.splitTextToSize(data.recommendations || 'N/A', 170);
  doc.text(recommendationsLines, leftCol, yPos);
  yPos += (recommendationsLines.length * 7) + 20;

  // Approval
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Conduzido por / Conducted by: ${data.conductedBy}`, leftCol, yPos);
  yPos += 7;
  doc.text(`Aprovado por / Approved by: ${data.approvedBy}`, leftCol, yPos);

  // Save PDF
  doc.save(`Relatorio_Inspecao_${data.reportNumber.replace(/\s/g, '_')}.pdf`);
};

