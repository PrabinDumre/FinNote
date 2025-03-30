const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const Expense = mongoose.model("Expense", expenseSchema);
module.exports = Expense; 