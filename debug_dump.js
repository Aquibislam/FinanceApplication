const fs = require('fs');
try {
    const pdfLib = require('pdf-parse');
    const info = {
        type: typeof pdfLib,
        keys: Object.keys(pdfLib),
        defaultType: pdfLib.default ? typeof pdfLib.default : 'undefined'
    };
    fs.writeFileSync('debug_output.txt', JSON.stringify(info, null, 2));
} catch (e) {
    fs.writeFileSync('debug_output.txt', 'Error: ' + e.message);
}
