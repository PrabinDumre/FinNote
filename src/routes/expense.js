const express = require("express");
const router = express.Router();
const Expense = require("../models/expense");
const auth = require("../middleware/auth");

// Add new expense
router.post("/add", auth, async (req, res) => {
    try {
        const { category, amount, date } = req.body;
        
        if (!category || !amount || !date) {
            return res.status(400).json({ error: "Category, amount, and date are required" });
        }

        const expense = new Expense({
            userId: req.user._id,
            category,
            amount,
            date: new Date(date)
        });

        await expense.save();
        res.status(201).json(expense);
    } catch (error) {
        console.error("Error adding expense:", error);
        res.status(500).json({ error: "Failed to add expense. Please try again." });
    }
});

// Get user's expenses
router.get("/", auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

// Update expense
router.put("/:id", auth, async (req, res) => {
    try {
        const { category, amount } = req.body;
        
        if (!category || !amount) {
            return res.status(400).json({ error: "Category and amount are required" });
        }

        const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
        
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }

        expense.category = category;
        expense.amount = amount;
        await expense.save();
        
        res.json(expense);
    } catch (error) {
        console.error("Error updating expense:", error);
        res.status(500).json({ error: "Failed to update expense" });
    }
});

// Delete expense
router.delete("/:id", auth, async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        
        res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});

module.exports = router; 