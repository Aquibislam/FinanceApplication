const pdfLib = require('pdf-parse');
console.log('Type of require:', typeof pdfLib);
console.log('Keys:', Object.keys(pdfLib));
if (typeof pdfLib === 'object') {
    console.log('Is default a function?', typeof pdfLib.default);
}
try {
    console.log('Attempting call...');
    pdfLib(Buffer.from('test'));
} catch (e) {
    console.log('Call failed:', e.message);
}
