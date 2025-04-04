# FinNote: AI-Powered Personal Finance Manager

## 🌟 Overview

FinNote is a comprehensive personal finance management application that helps users track expenses, manage budgets, and gain insights into their financial habits. Leveraging machine learning, this application provides personalized financial insights and recommendations.

## 💰 Key Features

### Financial Management
- **Expense Tracking**: Log and categorize daily expenses
- **Budget Planning**: Set monthly budgets for different expense categories
- **Transaction History**: View detailed transaction history with filtering options
- **Balance Management**: Track income, expenses, and savings

### Smart Analytics
- **Visual Reports**: Interactive charts and graphs to visualize spending patterns
- **ML-Powered Insights**: Predictive analysis for future expenses
- **Anomaly Detection**: Identify unusual spending patterns
- **Smart Categorization**: Automatic categorization of expenses

### Productivity Tools
- **Notes**: Save financial notes and goals
- **Reminders**: Set reminders for bill payments and financial tasks
- **PDF Reports**: Generate downloadable financial reports

### User Experience
- **Personalized Dashboard**: Customizable dashboard with financial overview
- **Multiple Currency Support**: Track expenses in different currencies
- **Theme Options**: Light and dark mode support
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 📸 Screenshots

### Dashboard
![Dashboard](./screenshots/dashboard.png)
*Your financial overview at a glance with latest transactions and balance information*

### Expense Tracker
![Expense Tracker](./screenshots/expense-tracker.png)
*Track and manage your expenses with detailed categorization*

### Visual Reports
![Visual Reports](./screenshots/visuals.png)
*Interactive charts to visualize your spending patterns*

### ML Insights
![ML Insights](./screenshots/ml-insights.png)
*AI-powered analysis of your financial data with predictive recommendations*

### Notes & Reminders
![Notes](./screenshots/notes.png)
*Keep track of your financial notes and reminders*

## 🚀 Technology Stack

### Backend
- **Node.js & Express**: Server-side framework
- **MongoDB**: Database for storing user data
- **Mongoose**: ODM for MongoDB
- **JWT**: Authentication mechanism
- **Bcrypt**: Password hashing

### Frontend
- **Handlebars (HBS)**: Templating engine
- **HTML/CSS/JavaScript**: Frontend development
- **Chart.js**: Data visualization

### Machine Learning & AI
- **TensorFlow.js**: ML model implementation
- **Natural Language Processing**: For expense categorization
- **Predictive Analytics**: For expense forecasting

### Tools & Services
- **Nodemailer**: Email notifications
- **PDFKit**: PDF report generation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation Steps
1. Clone the repository
   ```bash
   git clone https://github.com/PrabinDumre/Myfinnote.git
   cd Myfinnote
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create .env file (use .env.example as reference)
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/budget-buddy
   SESSION_SECRET=your_session_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## 🔒 Security Features
- Secure user authentication
- Password hashing with bcrypt
- Email verification with OTP
- HTTPS support
- Session management
- Input validation and sanitization

## 📱 Mobile Responsiveness
The application is designed to work seamlessly across devices of all sizes:
- Responsive layout adjusts to screen size
- Touch-friendly interface for mobile devices
- Optimized data loading for mobile connections

## 🔮 Future Enhancements
- **Investment Tracking**: Monitor stocks and investment portfolios
- **Financial Goals**: Set and track long-term financial goals
- **Budget Recommendations**: AI-powered budget suggestions
- **Multi-language Support**: Interface in multiple languages
- **Integration with Banking APIs**: Direct bank transaction imports

## 👨‍💻 Contributors
- [Prabin Dumre](https://github.com/PrabinDumre)

## 📄 License
This project is licensed under the ISC License

---

*FinNote - Making Personal Finance Management Smarter with AI* 📊💸 
