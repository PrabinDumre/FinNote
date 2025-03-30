const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    currency: { type: String, default: "INR" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    otp: { type: String },
    otpExpiry: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    theme: { type: String, default: "light" }
});

const Register = new mongoose.model("User", userSchema);
module.exports = Register;