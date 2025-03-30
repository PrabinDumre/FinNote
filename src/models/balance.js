const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    netAmount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

const Balance = mongoose.model("Balance", balanceSchema);
module.exports = Balance; 