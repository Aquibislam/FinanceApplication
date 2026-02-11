const pdfLib = require('pdf-parse');
let pdf = pdfLib;
if (typeof pdf !== 'function') {
    if (pdf.default) pdf = pdf.default;
    else if (pdf.PDFParse) pdf = pdf.PDFParse;
}

console.log('PDF Type:', typeof pdf);
console.log('PDF toString:', pdf.toString());
try {
    console.log('Attempting pdf(buffer)...');
    pdf(Buffer.from('test'));
} catch (e) {
    console.log('Function call failed:', e.message);
}

try {
    console.log('Attempting new pdf(buffer)...');
    new pdf(Buffer.from('test'));
} catch (e) {
    console.log('Constructor call failed:', e.message);
}
