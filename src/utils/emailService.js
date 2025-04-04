const nodemailer = require('nodemailer');
const Register = require('../models/registers');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'finnote.org@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

// Function to send reminder email
const sendReminderEmail = async (userId, reminder) => {
    try {
        // Get user email
        const user = await Register.findById(userId);
        if (!user) {
            console.error('User not found for reminder:', userId);
            return false;
        }

        // Format the due date
        const dueDate = new Date(reminder.dueDate).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Create email content
        const mailOptions = {
            from: '"FinNote" <finnote.org@gmail.com>',
            to: user.email,
            subject: `Reminder: ${reminder.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #46997D; text-align: center;">FinNote Reminder</h2>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
                        <h3 style="color: #333;">${reminder.title}</h3>
                        <p><strong>Type:</strong> ${reminder.type}</p>
                        <p><strong>Due Date:</strong> ${dueDate}</p>
                        ${reminder.amount ? `<p><strong>Amount:</strong> ₹${reminder.amount}</p>` : ''}
                        ${reminder.description ? `<p><strong>Description:</strong> ${reminder.description}</p>` : ''}
                        <p><strong>Priority:</strong> ${reminder.priority}</p>
                    </div>
                    <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                        This is an automated reminder from FinNote.
                    </p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending reminder email:', error);
        return false;
    }
};

module.exports = {
    sendReminderEmail,
    transporter
}; 