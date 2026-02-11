const pdfLib = require('pdf-parse');
let pdfClass = pdfLib;
if (typeof pdfClass !== 'function') {
    if (pdfClass.default) pdfClass = pdfClass.default;
    else if (pdfClass.PDFParse) pdfClass = pdfClass.PDFParse;
}

try {
    const instance = new pdfClass(Buffer.from('test'));
    console.log('Instance type:', typeof instance);
    console.log('Instance keys:', Object.keys(instance));
    // Check prototype methods
    console.log('Prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
} catch (e) {
    console.log('Instantiation failed:', e.message);
}
