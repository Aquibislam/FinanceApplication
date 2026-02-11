const pdfLib = require('pdf-parse');
let pdfClass = pdfLib;
if (typeof pdfClass !== 'function') {
    if (pdfClass.default) pdfClass = pdfClass.default;
    else if (pdfClass.PDFParse) pdfClass = pdfClass.PDFParse;
}

const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000216 00000 n\n0000000302 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n397\n%%EOF\n');
const u8 = new Uint8Array(buffer);

async function test() {
    try {
        console.log('Test 14: new pdfClass(u8)');
        // silence warnings if possible
        const instance = new pdfClass(u8);
        console.log('Success 14');

        if (instance.getText) {
            console.log('Calling getText()...');
            const result = await instance.getText();
            console.log('Result Type:', typeof result);
            if (typeof result === 'object') {
                console.log('Result Keys:', Object.keys(result));
                // try to output some content if string property exists
                if (result.text) console.log('Text content:', result.text);
                else console.log('JSON dump:', JSON.stringify(result).slice(0, 200));
            } else {
                console.log('Result:', result);
            }
        }
    } catch (e) { console.log('Error 14:', e.message, e.stack ? e.stack.split('\n')[0] : ''); }
}

test();
