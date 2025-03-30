const Reminder = require('../models/reminder');
const { sendReminderEmail } = require('../utils/emailService');

class ReminderService {
    // Create a new reminder
    static async createReminder(userId, reminderData) {
        try {
            const reminder = new Reminder({
                userId,
                ...reminderData
            });
            await reminder.save();

            // Send initial email notification
            await sendReminderEmail(userId, reminder);
            reminder.emailSent.initial = true;
            await reminder.save();

            return reminder;
        } catch (error) {
            console.error('Error creating reminder:', error);
            throw error;
        }
    }

    // Get all reminders for a user
    static async getUserReminders(userId) {
        try {
            return await Reminder.find({ userId }).sort({ dueDate: 1 });
        } catch (error) {
            console.error('Error getting user reminders:', error);
            throw error;
        }
    }

    // Update a reminder
    static async updateReminder(reminderId, userId, updateData) {
        try {
            const reminder = await Reminder.findOneAndUpdate(
                { _id: reminderId, userId },
                updateData,
                { new: true }
            );
            return reminder;
        } catch (error) {
            console.error('Error updating reminder:', error);
            throw error;
        }
    }

    // Delete a reminder
    static async deleteReminder(reminderId, userId) {
        try {
            return await Reminder.findOneAndDelete({ _id: reminderId, userId });
        } catch (error) {
            console.error('Error deleting reminder:', error);
            throw error;
        }
    }

    // Check and send reminder emails
    static async checkAndSendReminders() {
        try {
            const now = new Date();
            const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find reminders that need notifications
            const reminders = await Reminder.find({
                completed: false,
                $or: [
                    // One day before notifications
                    {
                        dueDate: {
                            $gte: oneDayFromNow,
                            $lt: new Date(oneDayFromNow.getTime() + 5 * 60 * 1000) // 5-minute window
                        },
                        'emailSent.oneDayBefore': false
                    },
                    // Due date notifications
                    {
                        dueDate: {
                            $gte: now,
                            $lt: new Date(now.getTime() + 5 * 60 * 1000) // 5-minute window
                        },
                        'emailSent.onDueDate': false
                    }
                ]
            });

            // Send notifications
            for (const reminder of reminders) {
                const emailSent = await sendReminderEmail(reminder.userId, reminder);
                if (emailSent) {
                    if (reminder.dueDate <= oneDayFromNow && !reminder.emailSent.oneDayBefore) {
                        reminder.emailSent.oneDayBefore = true;
                    } else if (reminder.dueDate <= now && !reminder.emailSent.onDueDate) {
                        reminder.emailSent.onDueDate = true;
                    }
                    await reminder.save();
                }
            }
        } catch (error) {
            console.error('Error checking and sending reminders:', error);
        }
    }
}

module.exports = ReminderService; 