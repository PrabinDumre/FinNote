const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Links note to the user
    title: { type: String, required: true },
    content: { 
        type: mongoose.Schema.Types.Mixed, // This allows both String and Array
        required: true 
    },
    type: { type: String, required: true },
    noteType: { 
        type: String, 
        enum: ['text', 'list', 'image'], 
        default: 'text' 
    },
    image: { type: String },
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
notesSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Note = mongoose.model("Note", notesSchema);
module.exports = Note;
