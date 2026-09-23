
const mongoose = require('mongoose');

async function conectarDB(){
    try{
        await mongoose.connect(process.env.MONGO_URL)
        console.log('Conectado');
    }catch(error){
        console.log('Error:', error);
        process.exit(1);
    }
}

module.exports = conectarDB; 
