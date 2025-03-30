require('dotenv').config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongoose = require("mongoose");
const hbs = require("hbs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const MongoStore = require('connect-mongo');
require("./db/conn");
const Register = require("./models/registers");
const Note = require("./models/notes"); 
const Expense = require("./models/expense");
const Balance = require("./models/balance");
const Transaction = require("./models/transaction");

const app = express();
const port = process.env.PORT || 3000;

// Import routes
const transactionRoutes = require('./routes/transaction');
const reminderRoutes = require('./routes/reminderRoutes');
const ReminderService = require('./services/reminderService');
const pdfRoutes = require('./routes/pdfRoutes');
const mlRoutes = require('./ml/routes/mlRoutes'); // Import ML routes
const userRoutes = require('./routes/userRoutes'); // Import user routes

// Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register Handlebars helper
hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

// Register formatDate helper
hbs.registerHelper("formatDate", function (date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60, // Session TTL (1 day)
        autoRemove: 'native',
        touchAfter: 24 * 3600 // Only update the session once per day unless changed
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Global middleware to set username for all routes
app.use((req, res, next) => {
    if (req.session.userId) {
        res.locals.username = req.session.username || "Budget Buddy";
        res.locals.isLoggedIn = true;
    } else {
        res.locals.username = "";
        res.locals.isLoggedIn = false;
    }
    next();
});

// Home/Login Page
app.get("/", (req, res) => {
    res.render("index", { message: req.session.message });
    req.session.message = null; 
});

// Signup Page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Generate OTP
function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit OTP
}

// Send OTP Route
app.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Check if email already exists
        const existingUser = await Register.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Email already exists! Please log in." });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        // Store OTP in session
        req.session.signupOTP = {
            email,
            otp,
            otpExpiry
        };

        console.log('Attempting to send OTP to:', email); // Debug log
        console.log('Using EMAIL_USER:', process.env.EMAIL_USER); // Debug log
        console.log('OTP generated:', otp); // Debug log

        // Configure email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'budgetbuddy.org@gmail.com',
                pass: process.env.EMAIL_PASS
            },
            debug: true, // Enable debug logs
            logger: true // Enable logger
        });

        // Verify transporter configuration
        await transporter.verify();
        console.log('Transporter verified successfully'); // Debug log

        // Send OTP email
        const mailOptions = {
            from: '"BUDGET BUDDY" <budgetbuddy.org@gmail.com>',
            to: email,
            subject: 'Email Verification OTP - Budget Buddy',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #46997D; text-align: center;">Budget Buddy Email Verification</h2>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
                        <p>Hello,</p>
                        <p>Your verification code is:</p>
                        <h1 style="text-align: center; color: #46997D; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                    </div>
                    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                        This is an automated message, please do not reply.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response); // Debug log

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Detailed error in sending OTP:", {
            message: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
        res.json({ 
            success: false, 
            message: "Failed to send OTP. Please try again.",
            error: error.message // Include error message in response
        });
    }
});

// Signup Handling
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password, otp } = req.body;

        // Debug logs for OTP verification
        console.log('Signup attempt with:', { email, providedOTP: otp });
        console.log('Session OTP data:', req.session.signupOTP);

        // Verify OTP
        if (!req.session.signupOTP || 
            req.session.signupOTP.email !== email || 
            req.session.signupOTP.otp !== otp || 
            Date.now() > req.session.signupOTP.otpExpiry) {
            
            // Detailed debug logs for OTP mismatch
            console.log('OTP verification failed:');
            console.log('- Session OTP exists:', !!req.session.signupOTP);
            if (req.session.signupOTP) {
                console.log('- Email match:', req.session.signupOTP.email === email);
                console.log('- OTP match:', req.session.signupOTP.otp === otp);
                console.log('- OTP expiry valid:', Date.now() <= req.session.signupOTP.otpExpiry);
            }
            
            req.session.message = { text: "Invalid or expired OTP. Please try again.", type: "error" };
            return res.redirect("/signup");
        }

        // Check if email already exists
        const existingUser = await Register.findOne({ email });
        if (existingUser) {
            req.session.message = { text: "Email already exists! Please log in.", type: "error" };
            return res.redirect("/");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Register({
            name: username,
            email: email,
            password: hashedPassword,
            currency: "INR",
            dateFormat: "DD/MM/YYYY",
            isEmailVerified: true,
            theme: "light"
        });

        await newUser.save();
        
        // Clear OTP from session
        delete req.session.signupOTP;
        
        req.session.message = { text: "Signup successful! Please log in.", type: "success" };
        res.redirect("/");
    } catch (error) {
        console.error("Signup error:", error);
        req.session.message = { text: "Error signing up. Please try again.", type: "error" };
        res.redirect("/signup");
    }
});

// Login Handling
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Register.findOne({ email });

        if (!user) {
            req.session.message = { text: "User not found. Please sign up first!", type: "error" };
            return res.redirect("/");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.session.message = { text: "Incorrect password! Please try again.", type: "error" };
            return res.redirect("/");
        }

        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.username = user.name;
        req.session.currency = user.currency;
        req.session.dateFormat = user.dateFormat;
        req.session.theme = user.theme || "light";

        res.redirect("/dashboard");
    } catch (error) {
        console.error("Login error:", error);
        req.session.message = { text: "Server error. Please try again.", type: "error" };
        res.redirect("/");
    }
});

// Forgot Password - Request Reset
app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Register.findOne({ email });

        // Always show success message even if email doesn't exist (security best practice)
        if (!user) {
            req.session.message = { text: "If an account exists with this email, a password reset link has been sent.", type: "success" };
            return res.redirect("/");
        }

        // Generate a unique reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour

        // Save the reset token and expiry to the user's document
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Send password reset email
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'budgetbuddy.org@gmail.com',
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: '"BUDGET BUDDY" <budgetbuddy.org@gmail.com>',
            to: user.email,
            subject: 'Password Reset Request - Budget Buddy',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset for your Budget Buddy account.</p>
                <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        req.session.message = { text: "If an account exists with this email, a password reset link has been sent.", type: "success" };
        res.redirect("/");
    } catch (error) {
        console.error("Password reset error:", error);
        req.session.message = { text: "An error occurred. Please try again later.", type: "error" };
        res.redirect("/forgot-password");
    }
});

// Forgot Password Page
app.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { message: req.session.message });
    req.session.message = null;
});

// Reset Password Page
app.get("/reset-password/:token", async (req, res) => {
    try {
        const user = await Register.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            req.session.message = "Password reset link is invalid or has expired.";
            return res.redirect("/");
        }

        res.render("reset-password", { 
            token: req.params.token,
            message: req.session.message 
        });
        req.session.message = null;
    } catch (error) {
        console.error("Reset password page error:", error);
        req.session.message = "Error loading reset password page.";
        res.redirect("/");
    }
});

// Reset Password Handler
app.post("/reset-password/:token", async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            req.session.message = "Passwords do not match.";
            return res.redirect(`/reset-password/${req.params.token}`);
        }

        const user = await Register.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            req.session.message = "Password reset link is invalid or has expired.";
            return res.redirect("/");
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user's password and remove reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        req.session.message = "Password has been successfully reset. Please log in with your new password.";
        res.redirect("/");
    } catch (error) {
        console.error("Reset password error:", error);
        req.session.message = "Error resetting password. Please try again.";
        res.redirect(`/reset-password/${req.params.token}`);
    }
});

// Dashboard Page (Protected Route)
app.get("/dashboard", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    try {
        // Fetch user's notes
        const notes = await Note.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(5); // Get only the 5 most recent notes

        // Render dashboard with notes data
        res.render("dashboard", {
            username: req.session.username,
            notes: notes
        });
    } catch (error) {
        console.error("Error fetching notes for dashboard:", error);
        res.render("dashboard", {
            username: req.session.username,
            notes: []
        });
    }
});

// Settings Page (Protected Route)
app.get("/settings", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }

    try {
        // Fetch user from the database
        const user = await Register.findById(req.session.userId);
        if (!user) {
            req.session.message = "User not found!";
            return res.redirect("/");
        }

        // Pass user data to settings.hbs
        res.render("settings", {
            user: {
                username: user.name,
                email: user.email,
                currency: user.currency || "INR",
                dateFormat: user.dateFormat || "DD/MM/YYYY"
            }
        });
    } catch (error) {
        console.error("Error loading settings:", error);
        res.status(500).send("Error loading settings. Please try again.");
    }
});

// Update Username
app.post("/update-profile", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/settings");
    }

    try {
        const { username } = req.body;

        // Update the user in the database
        const updatedUser = await Register.findByIdAndUpdate(
            req.session.userId,
            { name: username },
            { new: true } // This ensures you get the updated data
        );

        if (!updatedUser) {
            req.session.message = "User not found!";
            return res.redirect("/settings");
        }

        // ✅ Update session with new username
        req.session.username = updatedUser.name;

        req.session.message = "Profile updated successfully!";
        res.redirect("/settings");
    } catch (error) {
        console.error("Error updating profile:", error);
        req.session.message = "Error updating profile. Try again.";
        res.redirect("/settings");
    }
});

//update password
app.post("/update-password", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/settings");
    }

    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Fetch the user from the database
        const user = await Register.findById(req.session.userId);
        if (!user) {
            req.session.message = "User not found!";
            return res.redirect("/settings");
        }

        // Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            req.session.message = "Incorrect current password!";
            return res.redirect("/settings");
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.session.message = "New passwords do not match!";
            return res.redirect("/settings");
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        await Register.findByIdAndUpdate(req.session.userId, { password: hashedPassword });

        req.session.message = "Password updated successfully!";
        res.redirect("/settings");
    } catch (error) {
        console.error("Error updating password:", error);
        req.session.message = "Error updating password. Try again.";
        res.redirect("/settings");
    }
});

// Update Currency & Date Format
app.post("/update-preferences", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/settings");
    }

    try {
        const { currency, dateFormat } = req.body;

        await Register.findByIdAndUpdate(req.session.userId, { currency, dateFormat });

        // Update session
        req.session.currency = currency;
        req.session.dateFormat = dateFormat;

        req.session.message = "Preferences updated successfully!";
        res.redirect("/settings");
    } catch (error) {
        req.session.message = "Error updating preferences. Try again.";
        res.redirect("/settings");
    }
});

// Logout (Fixed to GET Request)
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect("/");
    });
});

app.get("/expense", (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    res.render("expense");
});

app.get("/notes", async (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    try {
        const notes = await Note.find({ userId: req.session.userId }).sort({ isPinned: -1, createdAt: -1 });
        res.render("notes", { 
            notes,
            username: req.session.username 
        });
    } catch (error) {
        console.error("Error loading notes:", error);
        res.status(500).send("Error loading notes. Try again.");
    }
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    next();
}

// API: Add a New Note
app.post("/notes/add", isAuthenticated, async (req, res) => {
    try {
        const { title, content, type, noteType, image } = req.body;
        
        // Validate required fields
        if (!title || !content || !type || !noteType) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        // Create new note with all fields
        const newNote = new Note({
            userId: req.session.userId,
            title,
            content,
            type,
            noteType,
            image: image || undefined
        });

        await newNote.save();
        res.json({ success: true, message: "Note added successfully!" });
    } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Error adding note." 
        });
    }
});

// API: Delete a Note
app.delete("/notes/delete/:id", isAuthenticated, async (req, res) => {
    try {
        await Note.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
        res.json({ success: true, message: "Note deleted successfully!" });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ success: false, message: "Error deleting note." });
    }
});

// API: Pin/Unpin Note
app.post("/notes/pin/:id", isAuthenticated, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!note) {
            return res.status(404).json({ success: false, message: "Note not found" });
        }
        
        note.isPinned = !note.isPinned;
        await note.save();
        
        res.json({ success: true, isPinned: note.isPinned });
    } catch (error) {
        console.error("Error updating pin status:", error);
        res.status(500).json({ success: false, message: "Error updating pin status" });
    }
});

// API: Get Note Details
app.get("/notes/:id", isAuthenticated, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!note) {
            return res.status(404).json({ success: false, message: "Note not found" });
        }
        
        res.json(note);
    } catch (error) {
        console.error("Error fetching note:", error);
        res.status(500).json({ success: false, message: "Error fetching note" });
    }
});

// API: Update Note
app.put("/notes/update/:id", isAuthenticated, async (req, res) => {
    try {
        const { title, content, type, noteType, image } = req.body;
        
        const note = await Note.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!note) {
            return res.status(404).json({ success: false, message: "Note not found" });
        }
        
        // Update note fields
        note.title = title;
        note.content = content;
        note.type = type;
        note.noteType = noteType;
        if (image) note.image = image;
        
        await note.save();
        res.json({ success: true, message: "Note updated successfully" });
    } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ success: false, message: "Error updating note" });
    }
});

// API: Get All Notes
app.get("/notes/get", isAuthenticated, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.session.userId })
            .sort({ isPinned: -1, createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        res.status(500).json({ success: false, message: "Error fetching notes" });
    }
});

app.get("/reminders", (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    res.render("reminders", {
        username: req.session.username
    });
});

app.get("/about", (req, res) => {
    if (!req.session.userId) {
        req.session.message = "Please log in first!";
        return res.redirect("/");
    }
    res.render("about", {
        username: req.session.username
    });
});

// API route to toggle pin status
app.put('/api/notes/:id/pin', async (req, res) => {
    try {
        const noteId = req.params.id;
        const note = await Note.findById(noteId);
        
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        // Toggle the isPinned status
        note.isPinned = !note.isPinned;
        await note.save();
        
        res.json({ success: true, isPinned: note.isPinned });
    } catch (error) {
        console.error('Error toggling pin status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Expense routes
app.post("/expense/add", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { category, amount } = req.body;
        
        if (!category || !amount) {
            return res.status(400).json({ error: "Category and amount are required" });
        }

        const expense = new Expense({
            userId: req.session.userId,
            category,
            amount,
            date: new Date()
        });

        await expense.save();
        res.status(201).json(expense);
    } catch (error) {
        console.error("Error adding expense:", error);
        res.status(500).json({ error: "Failed to add expense. Please try again." });
    }
});

// Update expense
app.put("/expense/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { category, amount } = req.body;
        
        if (!category || !amount) {
            return res.status(400).json({ error: "Category and amount are required" });
        }

        const expense = await Expense.findOne({ _id: req.params.id, userId: req.session.userId });
        
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
app.delete("/expense/:id", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
        
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }
        
        res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ error: "Failed to delete expense" });
    }
});

app.get("/expense/list", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const expenses = await Expense.find({ userId: req.session.userId }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ error: "Failed to fetch expenses" });
    }
});

// Balance routes
app.get("/balance", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        let balance = await Balance.findOne({ userId: req.session.userId });
        if (!balance) {
            balance = new Balance({ userId: req.session.userId });
            await balance.save();
        }
        res.json(balance);
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Failed to fetch balance" });
    }
});

app.post("/balance/update", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: "Amount is required" });
        }

        let balance = await Balance.findOne({ userId: req.session.userId });
        if (!balance) {
            balance = new Balance({ userId: req.session.userId });
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

app.post("/balance/add", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in first" });
    }

    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: "Amount is required" });
        }

        let balance = await Balance.findOne({ userId: req.session.userId });
        if (!balance) {
            balance = new Balance({ userId: req.session.userId });
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

// Use routes
app.use('/transactions', transactionRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/ml', mlRoutes); // Register ML routes
app.use('/api', pdfRoutes);
app.use('/api/user', userRoutes); // Register user routes

// Verify OTP Route
app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        // Debug logs
        console.log('Verify OTP attempt:', { email, providedOTP: otp });
        console.log('Session OTP data:', req.session.signupOTP);

        if (!req.session.signupOTP || 
            req.session.signupOTP.email !== email || 
            req.session.signupOTP.otp !== otp || 
            Date.now() > req.session.signupOTP.otpExpiry) {
            
            // Detailed debug logs
            console.log('OTP verification failed in verify-otp:');
            console.log('- Session OTP exists:', !!req.session.signupOTP);
            if (req.session.signupOTP) {
                console.log('- Email match:', req.session.signupOTP.email === email);
                console.log('- OTP match:', req.session.signupOTP.otp === otp);
                console.log('- OTP expiry valid:', Date.now() <= req.session.signupOTP.otpExpiry);
            }
            
            return res.json({ 
                success: false, 
                message: "Invalid or expired OTP"
            });
        }

        res.json({ 
            success: true, 
            message: "OTP verified successfully"
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.json({ 
            success: false, 
            message: "Error verifying OTP"
        });
    }
});

// Update theme preference
app.post("/update-theme", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const { theme } = req.body;
        if (!theme || !["light", "dark"].includes(theme)) {
            return res.status(400).json({ success: false, message: "Invalid theme" });
        }

        await Register.findByIdAndUpdate(req.session.userId, { theme });
        req.session.theme = theme;

        res.json({ success: true, message: "Theme updated successfully" });
    } catch (error) {
        console.error("Error updating theme:", error);
        res.status(500).json({ success: false, message: "Error updating theme" });
    }
});

// Add reminder routes
// Register non-API routes

// Set up reminder checking interval (check every 5 minutes)
setInterval(() => {
    ReminderService.checkAndSendReminders();
}, 5 * 60 * 1000);

// Add Visuals and Charts route
app.get("/visuals-and-charts", (req, res) => {
    if (!req.session.userId) {
        req.session.message = { text: "Please log in first to access visualizations.", type: "error" };
        return res.redirect("/");
    }
    res.render("visuals-and-charts", {
        username: req.session.username
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});