const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    image: String,
    sign: String,
    binarry: Buffer 
    // Resultado do teste ao tentar guardar a máscara binária com outros tipos de atribuções
    //boolean: 522,24kb 4.1s
    //Number: 712 kb 5.8s
    //buffer: 71,68kb 0,2s
},{
    timestamps: true,
});

module.exports = mongoose.model('Post', PostSchema);