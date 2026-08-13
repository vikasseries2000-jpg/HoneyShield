const mongoose = require("mongoose");

const connectDB = async () => {

    try {

       const conn = await mongoose.connect(process.env.MONGO_URI, {
    family: 4
});

        console.log("================================");
        console.log("MongoDB Connected");
        console.log(conn.connection.host);
        console.log("================================");

    } catch (error) {

        console.log(error.message);

        process.exit(1);

    }

};

module.exports = connectDB;