const mongoose = require("mongoose");

function connectDB(){
    mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("CONNECTED TO DB");
    })
    .catch(err=>{
        console.log("ERROR CONNECTING TO DB")
    })
}