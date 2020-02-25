const multer = require('multer');
const path = require('path');

module.exports = {
    storage: new multer.diskStorage({
        destination: path.resolve(__dirname,'..','..','uploads'),
        filename: function (req, file, callback) {
            // Salva a imagem com o seu nome original
            callback(null, file.originalname);
        }
    })
};