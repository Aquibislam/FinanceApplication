const fs = require('fs');
const pdfLib = require('pdf-parse');
let pdfClass = pdfLib;
if (typeof pdfClass !== 'function') {
    if (pdfClass.default) pdfClass = pdfClass.default;
    else if (pdfClass.PDFParse) pdfClass = pdfClass.PDFParse;
}

try {
    const instance = new pdfClass(Buffer.from('test'));
    const proto = Object.getPrototypeOf(instance);
    const methods = Object.getOwnPropertyNames(proto);
    fs.writeFileSync('debug_methods.txt', JSON.stringify(methods, null, 2));
} catch (e) {
    fs.writeFileSync('debug_methods.txt', 'Error: ' + e.message);
}
