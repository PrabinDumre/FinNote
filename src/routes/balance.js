const express = require("express");
const router = express.Router();
const Balance = require("../models/balance");
const auth = require("../middleware/auth");

// Get user's balance
router.get("/", auth, async (req, res) => {
    try {
        let balance = await Balance.findOne({ userId: req.user._id });
        if (!balance) {
            balance = new Balance({ userId: req.user._id });
            await balance.save();
        }
        res.json(balance);
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Failed to fetch balance" });
    }
});

// Update net amount
router.post("/update", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: "Amount is required" });
        }

        let balance = await Balance.findOne({ userId: req.user._id });
        if (!balance) {
            balance = new Balance({ userId: req.user._id });
        }

        balance.netAmount = parseFloat(amount);
        balance.lastUpdated = new Date();
        await balance.save();

        res.json(balance);
    } catch (error) {
        console.error("Error updating balance:", error);
        res.status(500).json({ error: "Failed to update balance" });
    }
});

// Add to net amount
router.post("/add", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: "Amount is required" });
        }

        let balance = await Balance.findOne({ userId: req.user._id });
        if (!balance) {
            balance = new Balance({ userId: req.user._id });
        }

        balance.netAmount += parseFloat(amount);
        balance.lastUpdated = new Date();
        await balance.save();

        res.json(balance);
    } catch (error) {
        console.error("Error adding to balance:", error);
        res.status(500).json({ error: "Failed to add to balance" });
    }
});

module.exports = router; 