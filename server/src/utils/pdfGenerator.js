import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_PATH = path.join(__dirname, '../assets/fonts/NotoSansArmenian-Regular.ttf');

const generatePdfBuffer = (docBuilder) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            docBuilder(doc);
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

function drawRow(doc, y, texts, widths, startX) {
    let currentX = startX;
    texts.forEach((text, i) => {
        doc.text(text, currentX, y, { width: widths[i], align: i === 0 ? 'left' : 'right' });
        currentX += widths[i];
    });
}

function drawTable(doc, startX, startY, headers, rows, widths) {
    let y = startY;

    // Draw Headers
    doc.fontSize(9).font(FONT_PATH); // Using base font since we don't have bold TTS loaded separately

    // Background for header
    doc.rect(startX, y - 5, widths.reduce((a, b) => a + b, 0), 20).fillAndStroke('#f0f0f0', '#cccccc');
    doc.fillColor('#000000');

    drawRow(doc, y, headers, widths, startX);
    y += 20;

    // Draw Rows
    doc.fontSize(8);
    rows.forEach((row, i) => {
        // Stripe background
        if (i % 2 === 0) {
            doc.rect(startX, y - 5, widths.reduce((a, b) => a + b, 0), 20).fill('#fafafa');
            doc.fillColor('#000000');
        }

        drawRow(doc, y, row, widths, startX);
        y += 20;

        // Page break logic if table gets too long
        if (y > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
            y = doc.page.margins.top;
        }
    });

    // Bottom border
    doc.moveTo(startX, y - 5).lineTo(startX + widths.reduce((a, b) => a + b, 0), y - 5).stroke('#cccccc');

    return y;
}

export const generateLoanContractPdf = async (application) => {
    return await generatePdfBuffer((doc) => {
        const { applicant, finalCalculatedAmount, approvedTenure, assignedRate, serviceFee, bankAccountNumber, repaymentSchedule } = application;
        const font = FONT_PATH;

        // Header Title
        doc.font(font).fontSize(18).text('ՎԱՐԿԱՅԻՆ ՊԱՅՄԱՆԱԳԻՐ', { align: 'center' });
        doc.moveDown(0.5);

        // Metadata Box
        doc.rect(40, doc.y, doc.page.width - 80, 40).stroke('#aaaaaa');
        doc.fontSize(10).text(`Պայմանագրի համարը: L-CONT-${application.id.substring(0, 8).toUpperCase()}`, 50, doc.y + 10);
        doc.text(`Ամսաթիվ: ${new Date().toLocaleDateString('hy-AM')}`, 50, doc.y + 10, { align: 'right', width: doc.page.width - 100 });
        doc.moveDown(3);

        // Section 1: Parties
        doc.fontSize(14).text('1. ԿՈՂՄԵՐԸ', 40, doc.y, { underline: true });
        doc.moveDown(0.5);

        // Custom simple grid mapping
        const partyStartX = 40;
        let pY = doc.y;

        doc.fontSize(10).fillColor('#555555').text('Վարկատու:', partyStartX, pY);
        doc.fillColor('#000000').text(`"ՎիստՕՍ Բանկ" ՓԲԸ`, partyStartX + 120, pY);
        pY += 18;

        doc.fillColor('#555555').text('Վարկառու:', partyStartX, pY);
        doc.fillColor('#000000').text(`${applicant.firstName} ${applicant.lastName}`, partyStartX + 120, pY);
        pY += 18;

        doc.fillColor('#555555').text('Անձնագիր / ՀԾՀ:', partyStartX, pY);
        doc.fillColor('#000000').text(`${applicant.passport || 'Ն/Ա'} / ${applicant.ssn || 'Ն/Ա'}`, partyStartX + 120, pY);
        pY += 18;

        doc.fillColor('#555555').text('Հասցե:', partyStartX, pY);
        doc.fillColor('#000000').text(`${applicant.address || 'Ն/Ա'}`, partyStartX + 120, pY);
        pY += 18;

        doc.fillColor('#555555').text('Բանկային հաշիվ:', partyStartX, pY);
        doc.fillColor('#000000').text(`${bankAccountNumber || 'Ն/Ա'}`, partyStartX + 120, pY);

        doc.y = pY + 30;

        // Section 2: Terms
        doc.fontSize(14).text('2. ՎԱՐԿԻ ՊԱՅՄԱՆՆԵՐԸ', 40, doc.y, { underline: true });
        doc.moveDown(0.5);

        doc.rect(40, doc.y, doc.page.width - 80, 80).fillAndStroke('#f9fcff', '#b3d4fc');
        doc.fillColor('#000000');

        pY = doc.y + 10;
        doc.fontSize(10).fillColor('#333333').text('Վարկի գումար:', 50, pY);
        doc.fillColor('#000000').text(`${finalCalculatedAmount?.toLocaleString() || 0} ՀՀԴ`, 180, pY);
        pY += 18;

        doc.fillColor('#333333').text('Տարեկան տոկոսադրույք:', 50, pY);
        doc.fillColor('#000000').text(`${assignedRate || 0}%`, 180, pY);
        pY += 18;

        doc.fillColor('#333333').text('Ժամկետ:', 50, pY);
        doc.fillColor('#000000').text(`${approvedTenure || 0} ամիս`, 180, pY);
        pY += 18;

        doc.fillColor('#333333').text('Սպասարկման վճար:', 50, pY);
        doc.fillColor('#000000').text(`${serviceFee ? serviceFee + ' ՀՀԴ' : '0 ՀՀԴ'}`, 180, pY);

        doc.y = pY + 30;

        // Section 3: Schedule
        doc.fontSize(14).text('3. ՄԱՐՄԱՆ ԺԱՄԱՆԱԿԱՑՈՒՅՑ', 40, doc.y, { underline: true });
        doc.moveDown(1);

        if (repaymentSchedule && Array.isArray(repaymentSchedule)) {
            const headers = ['Ամիս - Ամսաթիվ', 'Ընդհանուր վճարում', 'Մայր գումար', 'Տոկոսագումար', 'Մնացորդ (ՀՀԴ)'];
            const widths = [100, 100, 100, 100, 115];

            const tableRows = repaymentSchedule.map(row => [
                `${row.month}  (${row.paymentDate})`,
                `${row.paymentAmount.toLocaleString()}`,
                `${row.principal.toLocaleString()}`,
                `${row.interest.toLocaleString()}`,
                `${row.remainingBalance.toLocaleString()}`
            ]);

            doc.y = drawTable(doc, 40, doc.y, headers, tableRows, widths);
        }

        doc.moveDown(3);

        // Page break if signatures don't fit
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
        }

        // Signatures
        doc.fontSize(14).text('ԿՈՂՄԵՐԻ ՍՏՈՐԱԳՐՈՒԹՅՈՒՆՆԵՐԸ', 40, doc.y, { underline: true });
        doc.moveDown(1.5);

        const sigY = doc.y;
        doc.fontSize(10).text('ՎԱՐԿԱՏՈՒ', 40, sigY);
        doc.text('_____________________________', 40, sigY + 30);
        doc.text('"ՎիստՕՍ Բանկ" ՓԲԸ լիազոր', 40, sigY + 45);

        doc.text('ՎԱՐԿԱՌՈՒ', 350, sigY, { align: 'right', width: 200 });
        doc.text('_____________________________', 350, sigY + 30, { align: 'right', width: 200 });
        doc.text('Էլեկտրոնային ստորագրված է', 350, sigY + 45, { align: 'right', width: 200, color: '#00cc00' });
    });
};

export const generateIndividualPaperPdf = async (application) => {
    return await generatePdfBuffer((doc) => {
        const { applicant, finalCalculatedAmount, approvedTenure, assignedRate, bankAccountNumber } = application;
        const font = FONT_PATH;

        doc.font(font).fontSize(18).text('ԱՆՀԱՏԱԿԱՆ ԹԵՐԹԻԿ', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(10).fillColor('#666666').text(`Հայտի համարը: ${application.id}`, { align: 'center' });
        doc.text(`Գեներացման ամսաթիվ: ${new Date().toLocaleString('hy-AM')}`, { align: 'center' });
        doc.moveDown(3);

        // Content Box
        doc.rect(50, doc.y, doc.page.width - 100, 200).stroke('#cccccc');

        let pY = doc.y + 20;

        doc.fillColor('#000000');
        doc.fontSize(14).text('Վարկառուի Տվյալներ', 70, pY, { underline: true });
        pY += 25;

        doc.fontSize(11);
        doc.text('Անուն Ազգանուն:', 70, pY);
        doc.text(`${applicant.firstName} ${applicant.lastName}`, 200, pY);
        pY += 20;

        doc.text('ՀԾՀ (SSN):', 70, pY);
        doc.text(`${applicant.ssn || 'Ն/Ա'}`, 200, pY);
        pY += 20;

        doc.text('Բանկային հաշիվ:', 70, pY);
        doc.text(`${bankAccountNumber || 'Ն/Ա'}`, 200, pY);
        pY += 35;

        doc.fontSize(14).text('Վարկի Էական Պայմաններ', 70, pY, { underline: true });
        pY += 25;

        doc.fontSize(11);
        doc.text('Վարկի Գումար:', 70, pY);
        doc.text(`${finalCalculatedAmount?.toLocaleString() || 0} ՀՀԴ`, 200, pY);
        pY += 20;

        doc.text('Տարեկան Տոկոսադրույք:', 70, pY);
        doc.text(`${assignedRate || 0}%`, 200, pY);
        pY += 20;

        doc.text('Մարման Ժամկետ:', 70, pY);
        doc.text(`${approvedTenure || 0} ամիս`, 200, pY);

        doc.y = pY + 60;

        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#eeeeee');
        doc.moveDown(1);
        doc.fontSize(10).fillColor('#4CAF50').text('✓ Էլեկտրոնային եղանակով հաստատված է վարկառուի կողմից (OTP Նույնականացում):', { align: 'center' });
    });
};
