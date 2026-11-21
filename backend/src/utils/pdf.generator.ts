import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export interface CertificateData {
  certificateNumber: string;
  candidateName: string;
  guardianName: string;
  courseName: string;
  courseCode: string;
  trainingCentreName: string;
  districtName: string;
  issueDate: Date;
  verificationCode: string;
  verificationUrl: string;
  issuingAuthority: string;
}

export class CertificatePdfGenerator {
  /**
   * Generates a high-resolution, landscape A4 certificate PDF with verification QR code.
   * Stores the file in the configured storage directory.
   */
  static async generatePdf(data: CertificateData, storageDir: string): Promise<string> {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileName = `${data.certificateNumber}.pdf`;
    const filePath = path.join(storageDir, fileName);

    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(data.verificationUrl, {
      width: 100,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    return new Promise((resolve, reject) => {
      // Landscape A4 (841.89 x 595.28 points)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Decorative Borders
      // Outer border (Navy)
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .strokeColor('#0f172a')
        .stroke();

      // Inner border (Sky Blue)
      doc.rect(26, 26, width - 52, height - 52)
        .lineWidth(1)
        .strokeColor('#0284c7')
        .stroke();

      // Corner Accents
      const accentSize = 20;
      doc.rect(20, 20, accentSize, accentSize).fill('#0284c7');
      doc.rect(width - 20 - accentSize, 20, accentSize, accentSize).fill('#0284c7');
      doc.rect(20, height - 20 - accentSize, accentSize, accentSize).fill('#0284c7');
      doc.rect(width - 20 - accentSize, height - 20 - accentSize, accentSize, accentSize).fill('#0284c7');

      // 2. Header & Emblem Text
      doc.fillColor('#0369a1')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('GOVERNMENT OF INDIA • PRAGATI SKILLS MISSION', 0, 50, { align: 'center', characterSpacing: 1.5 });

      doc.fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text('CENTRAL CERTIFICATION & QUALITY ASSURANCE DIRECTORATE', 0, 66, { align: 'center', characterSpacing: 1 });

      // 3. Certificate Title
      doc.fillColor('#0f172a')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF SKILL COMPETENCE', 0, 95, { align: 'center' });

      doc.fillColor('#64748b')
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('This is to certify that', 0, 140, { align: 'center' });

      // 4. Candidate Name
      doc.fillColor('#0369a1')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(data.candidateName.toUpperCase(), 0, 165, { align: 'center' });

      // Subtle underline under name
      const nameWidth = doc.widthOfString(data.candidateName.toUpperCase());
      const nameX = (width - nameWidth) / 2;
      doc.moveTo(nameX - 20, 200).lineTo(nameX + nameWidth + 20, 200).lineWidth(1.5).strokeColor('#0284c7').stroke();

      // 5. Guardian & Course Statement
      doc.fillColor('#334155')
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Son / Daughter of ${data.guardianName}, has successfully undergone rigorous competency training and met all standards prescribed for`,
          80,
          215,
          { align: 'center', width: width - 160, lineGap: 4 }
        );

      // Course Name Banner
      doc.fillColor('#0f172a')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`${data.courseName} (${data.courseCode})`, 0, 260, { align: 'center' });

      doc.fillColor('#475569')
        .fontSize(11)
        .font('Helvetica')
        .text(
          `Conducted at affiliated training partner ${data.trainingCentreName}, District of ${data.districtName}.`,
          0,
          295,
          { align: 'center' }
        );

      // 6. QR Code & Public Verification Block
      doc.image(qrBuffer, 60, height - 160, { width: 75, height: 75 });

      doc.fillColor('#0f172a')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('SCAN TO VERIFY', 60, height - 78, { width: 75, align: 'center' });

      doc.fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text(`Code: ${data.verificationCode}`, 60, height - 68, { width: 75, align: 'center' });

      // 7. Official Metadata Block (Center)
      doc.fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Certificate No: `, 260, height - 130)
        .font('Helvetica')
        .text(data.certificateNumber, 340, height - 130);

      doc.font('Helvetica-Bold')
        .text(`Date of Issue: `, 260, height - 110)
        .font('Helvetica')
        .text(new Date(data.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 340, height - 110);

      doc.font('Helvetica-Bold')
        .text(`Issuing Body: `, 260, height - 90)
        .font('Helvetica')
        .text(data.issuingAuthority, 340, height - 90);

      // 8. Signatures Block (Right)
      const sigLineX = width - 230;
      doc.moveTo(sigLineX, height - 90).lineTo(sigLineX + 160, height - 90).lineWidth(1).strokeColor('#64748b').stroke();

      doc.fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Mission Director', sigLineX, height - 82, { width: 160, align: 'center' });

      doc.fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text('Pragati Skills Mission, Govt of India', sigLineX, height - 68, { width: 160, align: 'center' });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', (err) => reject(err));
    });
  }
}
