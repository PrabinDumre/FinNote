const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    type: { type: String, required: true },
    amount: { type: Number },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed: { type: Boolean, default: false },
    emailSent: {
        initial: { type: Boolean, default: false },
        oneDayBefore: { type: Boolean, default: false },
        onDueDate: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

const Reminder = new mongoose.model("Reminder", reminderSchema);
module.exports = Reminder; 