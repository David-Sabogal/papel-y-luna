const morgan = require('morgan');

// Formato: METHOD /ruta STATUS tiempo
module.exports = morgan(':method :url :status :res[content-length] - :response-time ms');