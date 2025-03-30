const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI, {

}).then(() => {
    console.log("connection Successful");
}).catch((e) => {
    console.log("No connection");
    console.error(e);
})