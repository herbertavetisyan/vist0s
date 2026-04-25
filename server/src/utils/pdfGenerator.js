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
        const { applicant, finalCalculatedAmount, approvedTenure, assignedRate, serviceFee, bankAccountNumber, repaymentSchedule, scoringData } = application;
        const font = FONT_PATH;
        
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + (approvedTenure || 0));

        const dateStr = now.toLocaleDateString('hy-AM');

        doc.font(font).fontSize(14).text('ՍՊԱՌՈՂԱԿԱՆ ՎԱՐԿԻ ՊԱՅՄԱՆԱԳԻՐ', { align: 'center' });
        doc.fontSize(10);
        doc.moveDown(1);
        doc.text('ք. Երևան', { align: 'left', continued: true }).text(`${dateStr} թ.`, { align: 'right' });
        doc.moveDown(1.5);

        doc.text(`«X Կրեդիտ» ՈՒՎԿ ՍՊ ընկերությունը (Հասցե՝ ՀՀ, ք․Երևան, Հրաչյա Քոչար 27շ., թիվ 55 ոչ բնակելի տարածք), այսուհետ\` «Վարկատու և/կամ Գրավառու», ի դեմս կազմակերպության գործադիր տնօրեն Նշան Վահանի Մելիքսեթյանի, ով գործում է վարկային կազմակերպության Կանոնադրության հիման վրա, մի կողմից,`);
        doc.moveDown(0.5);

        const birthDateYear = applicant.birthDate ? new Date(applicant.birthDate).getFullYear() : '________';
        const issueDateYear = applicant.issueDate ? new Date(applicant.issueDate).getFullYear() : '________';
        
        doc.text(`${applicant.firstName} ${applicant.lastName}ը (անձը հաստատող փաստաթուղթ ՝ ${applicant.passport || 'Ն/Ա'}, տրված\` ${issueDateYear} թվականին, ${applicant.issuedBy || '________'}-ի կողմից, ծնված՝ ${birthDateYear} թվականին, հաշվառման հասցե՝ ՀՀ, ${applicant.address || 'Ն/Ա'}), այսուհետ՝ «Վարկառու և/կամ Գնորդ և/կամ Գրավատու», մյուս կողմից,`);
        doc.moveDown(0.5);
        doc.text(`միասին նաև՝ «Կողմեր», կնքեցին սույն պայմանագիրը (այսուհետ՝ Պայմանագիր) հետևյալի մասին.`);
        doc.moveDown(1);

        doc.fontSize(12).text('1. Պայմանագրի առարկա').fontSize(10).moveDown(0.5);
        doc.text(`1.1. Վարկատուն պարտավորվում է Վարկառուին տրամադրել սպառողական վարկ՝ (${finalCalculatedAmount?.toLocaleString() || 0} ՀՀ դրամ), իսկ Վարկառուն պարտավորվում է օգտագործել այն սպառողական նպատակներով (չի կարող օգտագործվել ձեռնարկատիրական գործունեության համար) և վերադարձնել Վարկատուին սույն պայմանագրով սահմանված կարգով և ժամկետներում՝ վճարելով տոկոսներ [1.3 կետ]:`);
        doc.moveDown(0.5);
        doc.text(`1.2. Պայմանագիրը կնքվում է պարզ գրավոր ձևով: Պայմանագրի գրավոր ձևը չպահպանելու դեպքում այն առոչինչ է (ՀՀ քաղաքացիական օրենսգրքի 1120-րդ հոդված):`);
        doc.moveDown(0.5);
        doc.text(`1.3. Վարկի տոկոսադրույքը սահմանվում է ${assignedRate || 0}%:`);
        doc.text(`(ՀՀ օրենսդրության համաձայն՝ տոկոսադրույքը չի կարող գերազանցել ՀՀ Կենտրոնական բանկի կողմից սահմանված բանկային տոկոսադրույքի կրկնապատիկը: Ընթացիկ տվյալներով՝ այն կազմում է 24%, սակայն խորհուրդ է տրվում ճշտել ընթացիկ ցուցանիշը) .`);
        doc.moveDown(1);

        doc.fontSize(12).text('2. Վարկի տրամադրման կարգ և ժամկետներ').fontSize(10).moveDown(0.5);
        doc.text(`2.1. Վարկատուն Վարկառուին վարկը տրամադրում է սույն պայմանագիրը ստորագրելուց հետո՝ 3 (երեք) աշխատանքային օրվա ընթացքում:`);
        doc.moveDown(0.5);
        doc.text(`2.2. Վարկը տրամադրվում է հետևյալ եղանակներից մեկով՝ \nԿանխիկ գումարի փոխանցմամբ՝ Վարկառուի ստորագրության դիմաց.\nԱնկանխիկ եղանակով՝ Վարկառուի բանկային հաշվին փոխանցմամբ (հաշվեհամար՝ ${bankAccountNumber || '________________'}):`);
        doc.moveDown(0.5);
        doc.text(`2.3. Վարկի տրամադրման օր է համարվում Վարկառուի կողմից գումարի ստացման օրը (կանխիկի դեպքում) կամ Վարկառուի բանկային հաշվին գումարի մուտքագրման օրը (անկանխիկի դեպքում): Այդ պահից պայմանագիրը համարվում է կնքված :`);
        doc.moveDown(1);

        doc.fontSize(12).text('3. Վարկի վերադարձման կարգ և ժամկետներ').fontSize(10).moveDown(0.5);
        doc.text(`3.1. Վարկառուն պարտավորվում է վարկը վերադարձնել մինչև «${endDate.getDate()}» ${endDate.getMonth() + 1} 20${String(endDate.getFullYear()).slice(-2)} թ.-ը ներառյալ:`);
        doc.moveDown(0.5);
        doc.text(`3.2. Վարկի մարումը կատարվում է հավասարաչափ (անուիտետ) կամ տարբերակված վճարներով՝ համաձայն կից վճարումների գրաֆիկի (Ժամկետ՝ ${approvedTenure || 0} ամիս), որը հանդիսանում է սույն պայմանագրի անբաժանելի մասը:`);
        doc.moveDown(0.5);
        doc.text(`3.3. Վճարումները կատարվում են հետևյալ եղանակով՝ \nԿանխիկ վճարում Վարկատուի դրամարկղ.\nԱնկանխիկ փոխանցում Վարկատուի հաշվեհամարին (հաշվեհամար՝ 12345678901234):`);
        doc.moveDown(0.5);
        doc.text(`3.4. Վարկը համարվում է մարված Վարկատուի դրամարկղ գումարի մուտքագրման (կանխիկի դեպքում) կամ Վարկատուի բանկային հաշվին գումարի մուտքագրման պահից :`);
        doc.moveDown(0.5);
        doc.text(`3.5. Վարկառուն իրավունք ունի վաղաժամկետ մարել վարկը (ամբողջությամբ կամ մասնակի)՝ առանց տույժերի, սակայան պարտավոր է առնվազն 10 աշխատանքային օր առաջ գրավոր ծանուցել Վարկատուին:\n(Տոկոսային վարկի վաղաժամկետ մարումը հնարավոր է միայն Վարկատուի համաձայնությամբ, եթե այլ բան նախատեսված չէ պայմանագրում) :`);
        doc.moveDown(1);

        doc.fontSize(12).text('4. Տոկոսների և տույժերի հաշվարկ').fontSize(10).moveDown(0.5);
        doc.text(`4.1. Վարկի օգտագործման համար տոկոսները հաշվարկվում են վարկի փաստացի մնացորդի վրա:`);
        doc.moveDown(0.5);
        doc.text(`4.2. Վարկի մարման ժամկետը խախտելու դեպքում Վարկառուն վճարում է տույժ՝ ուշացման յուրաքանչյուր օրվա համար վարկի չմարված մասի 0.13%-ի չափով:`);
        doc.moveDown(0.5);
        doc.text(`4.3. Եթե Վարկառուն չի կատարում իր պարտավորությունը, ապա պայմանագրով նախատեսված տոկոսները դադարում են գործել, և կիրառվում է ՀՀ քաղաքացիական օրենսգրքի 411-րդ հոդվածի 1-ին կետով նախատեսված տոկոսը՝ սկսած այն օրվանից, երբ գումարը պետք է վերադարձվեր .`);
        doc.moveDown(1);
        
        doc.addPage();

        doc.fontSize(12).text('5. Կողմերի իրավունքները և պարտականությունները').fontSize(10).moveDown(0.5);
        doc.text(`5.1. Վարկառուն պարտավոր է`);
        doc.text(`   5.1.1. Օգտագործել վարկը բացառապես սպառողական նպատակների համար.`);
        doc.text(`   5.1.2. Վերադարձնել վարկը և վճարել տոկոսները սույն պայմանագրով սահմանված ժամկետներում.`);
        doc.text(`   5.1.3. Վարկատուի պահանջով տեղեկատվություն տրամադրել իր ֆինանսական վիճակի մասին.`);
        doc.moveDown(0.5);
        doc.text(`5.2. Վարկատուն իրավունք ունի`);
        doc.text(`   5.2.1. Պահանջել վարկի ժամկետից շուտ վերադարձ, եթե Վարկառուն խախտել է վարկի օգտագործման կամ վերադարձման պայմանները:`);
        doc.text(`   5.2.2. Վարկի գծով առաջացած պարտավորությունները զիջել երրորդ անձանց:`);
        doc.moveDown(1);

        doc.fontSize(12).text('6. Այլ պայմաններ').fontSize(10).moveDown(0.5);
        doc.text(`6.1. Վեճերի լուծման կարգ. Կողմերը կփորձեն վեճերը լուծել բանակցությունների միջոցով: Համաձայնության չգալու դեպքում վեճը լուծվում է ՀՀ օրենսդրությամբ սահմանված կարգով՝ հայցային վարույթի միջոցով:`);
        doc.moveDown(0.5);
        doc.text(`6.2. Ֆորս-մաժոր. Կողմերն ազատվում են պատասխանատվությունից, եթե պարտավորությունների չկատարումը պայմանավորված է անհաղթահարելի ուժով (բնական աղետներ, ռազմական գործողություններ և այլն):`);
        doc.moveDown(0.5);
        doc.text(`6.3. Պայմանագրում կատարված բոլոր փոփոխությունները կատարվում են գրավոր ձևով և ստորագրվում երկու կողմերի կողմից:`);
        doc.moveDown(0.5);
        doc.text(`6.4. Պայմանագիրը կազմված է 2 օրինակից՝ յուրաքանչյուր կողմի համար մեկական օրինակ, որոնք ունեն հավասար իրավական ուժ:`);
        doc.moveDown(2);

        doc.fontSize(12).text('7. Կողմերի ստորագրությունները և տվյալները').fontSize(10).moveDown(0.5);
        
        let sigY = doc.y;
        doc.text('Վարկատու', 40, sigY, { underline: true });
        doc.text('Անվանումը: «X Կրեդիտ» ՈՒՎԿ ՍՊ', 40, sigY + 15);
        doc.text('Հասցեն: ք․Երևան, Հրաչյա Քոչար 27շ.', 40, sigY + 30);
        doc.text('Հեռ./Էլ. փոստ: info@vistos.am', 40, sigY + 45);
        doc.text('Ստորագրություն: __________________', 40, sigY + 65);

        doc.text('Վարկառու', 300, sigY, { underline: true });
        doc.text(`Անուն, Ազգանուն: ${applicant.firstName} ${applicant.lastName}`, 300, sigY + 15);
        doc.text(`Հասցե: ${applicant.address || 'Ն/Ա'}`, 300, sigY + 30);
        doc.text(`Հեռ./Էլ. փոստ: ${applicant.phone || 'Ն/Ա'} / ${applicant.email || 'Ն/Ա'}`, 300, sigY + 45);
        doc.text(`Անձը հաստ. փաստաթուղթ: ${applicant.passport || 'Ն/Ա'} / ՀԾՀ: ${applicant.ssn || 'Ն/Ա'}`, 300, sigY + 60);
        doc.text(`Ստորագրություն: __________________`, 300, sigY + 80);

        doc.y = sigY + 110;
        doc.moveDown(2);

        // Section 8 (Schedule) -> using the drawTable
        doc.fontSize(12).text('ՎՃԱՐՈՒՄՆԵՐԻ ԳՐԱՖԻԿ', { align: 'center' });
        doc.fontSize(10).text('(Կցվում է որպես առանձին աղյուսակ)', { align: 'center'}).moveDown(1);
        
        if (repaymentSchedule && Array.isArray(repaymentSchedule)) {
            const headers = ['Ամսաթիվ', 'Ընդհանուր վճար', 'Մայր գումարի մաս', 'Տոկոսներ', 'Մնացորդ'];
            const widths = [100, 100, 100, 100, 115];

            const tableRows = repaymentSchedule.map(row => [
                `${row.paymentDate}`,
                `${row.paymentAmount.toLocaleString()}`,
                `${row.principal.toLocaleString()}`,
                `${row.interest.toLocaleString()}`,
                `${row.remainingBalance.toLocaleString()}`
            ]);

            drawTable(doc, 40, doc.y, headers, tableRows, widths);
        }
        
        doc.moveDown(1);
        doc.fontSize(8).text(`Խորհուրդ. Նախքան պայմանագիրը ստորագրելը ուշադիր կարդացեք բոլոր կետերը, հատկապես մանրատառով գրված պայմանները (եթե առկա են), և համոզվեք, որ տոկոսադրույքը չի գերազանցում ՀՀ Կենտրոնական բանկի կողմից սահմանված առավելագույն շեմը :`);
    });
};

export const generateIndividualPaperPdf = async (application) => {
    return await generatePdfBuffer((doc) => {
        const { applicant, finalCalculatedAmount, approvedTenure, assignedRate, bankAccountNumber, scoringData } = application;
        const font = FONT_PATH;

        doc.font(font).fontSize(18).text('ԱՆՀԱՏԱԿԱՆ ԹԵՐԹԻԿ', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(10).fillColor('#666666').text(`Հայտի համարը: ${application.id}`, { align: 'center' });
        doc.text(`Գեներացման ամսաթիվ: ${new Date().toLocaleString('hy-AM')}`, { align: 'center' });
        doc.moveDown(3);

        // Content Box
        doc.rect(50, doc.y, doc.page.width - 100, 320).stroke('#cccccc');

        let pY = doc.y + 20;

        doc.fillColor('#000000');
        doc.fontSize(14).text('Վարկառուի Տվյալներ', 70, pY, { underline: true });
        pY += 25;

        doc.fontSize(11);
        doc.text('Անուն Ազգանուն:', 70, pY);
        doc.text(`${applicant.firstName} ${applicant.lastName}`, 230, pY);
        pY += 20;

        doc.text('Անձնագրի համար:', 70, pY);
        doc.text(`${applicant.passport || 'Ն/Ա'}`, 230, pY);
        pY += 20;

        doc.text('ՀԾՀ (SSN):', 70, pY);
        doc.text(`${applicant.ssn || 'Ն/Ա'}`, 230, pY);
        pY += 20;

        doc.text('Հասցե:', 70, pY);
        doc.text(`${applicant.address || 'Ն/Ա'}`, 230, pY);
        pY += 20;

        doc.text('Հեռախոսահամար:', 70, pY);
        doc.text(`${applicant.phone || 'Ն/Ա'}`, 230, pY);
        pY += 20;

        doc.text('Բանկային հաշիվ:', 70, pY);
        doc.text(`${bankAccountNumber || 'Ն/Ա'}`, 230, pY);
        pY += 35;

        doc.fontSize(14).text('Վարկի Էական Պայմաններ', 70, pY, { underline: true });
        pY += 25;

        doc.fontSize(11);
        doc.text('Վարկի Գումար (ՀՀԴ):', 70, pY);
        doc.text(`${finalCalculatedAmount?.toLocaleString() || 0} ՀՀԴ`, 230, pY);
        pY += 20;

        doc.text('Անվանական Տարեկան Տոկոսադրույք:', 70, pY);
        doc.text(`${assignedRate || 0}%`, 230, pY);
        pY += 20;

        const effectiveRate = scoringData?.EffectiveAnnualRate || scoringData?.APR || 0;
        doc.text('Տարեկան Փաստացի Տոկոսադրույք:', 70, pY);
        doc.text(`${effectiveRate}%`, 230, pY);
        pY += 20;

        doc.text('Մարման Ժամկետ (Ամիս):', 70, pY);
        doc.text(`${approvedTenure || 0} ամիս`, 230, pY);
        pY += 20;

        const monthlyPayment = scoringData?.MonthlyPayment || 0;
        doc.text('Ամսական Վճար (Մոտավոր ՀՀԴ):', 70, pY);
        doc.text(`${monthlyPayment?.toLocaleString() || 0} ՀՀԴ`, 230, pY);
        pY += 20;

        doc.y = pY + 40;

        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#eeeeee');
        doc.moveDown(1);
        doc.fontSize(10).fillColor('#4CAF50').text('✓ Էլեկտրոնային եղանակով հաստատված է վարկառուի կողմից (OTP Նույնականացում):', { align: 'center' });
    });
};
