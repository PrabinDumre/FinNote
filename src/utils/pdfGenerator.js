const PDFDocument = require('pdfkit');

function generateTransactionPDF(transactions, res) {
    try {
        console.log('Starting PDF generation with', transactions.length, 'transactions');

        // Create a new PDF document with better defaults
        const doc = new PDFDocument({
            autoFirstPage: true,
            size: 'A4',
            margin: 50,
            bufferPages: true,
            info: {
                Title: 'Transaction History',
                Author: 'FinNote',
                Subject: 'Transaction Report',
                Keywords: 'transactions, expenses, budget',
                CreationDate: new Date(),
                Producer: 'FinNote App'
            },
            pdfVersion: '1.7'
        });

        // Handle document errors
        doc.on('error', (err) => {
            console.error('Error in PDF document:', err);
            throw err;
        });

        // Create write stream
        const stream = doc.pipe(res);

        // Handle stream errors
        stream.on('error', (err) => {
            console.error('Error in PDF stream:', err);
            throw err;
        });

        // Add title
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .text('Transaction History', { align: 'center' })
           .moveDown(0.5);

        // Add current date
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
           .moveDown(2);

        // Group transactions by type
        const givenTransactions = transactions.filter(t => t.type === 'give');
        const takenTransactions = transactions.filter(t => t.type === 'take');
        const personalExpenses = transactions.filter(t => t.type === 'expense' && (!t.expenseType || t.expenseType === 'personal'));
        const otherExpenses = transactions.filter(t => t.type === 'expense' && t.expenseType === 'other');

        // Calculate totals
        const totalGiven = givenTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalTaken = takenTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalPersonalExpenses = personalExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalOtherExpenses = otherExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalExpenses = totalPersonalExpenses + totalOtherExpenses;
        const netAmount = totalTaken - totalGiven - totalExpenses;

        // Function to format date
        const formatDate = (date) => {
            try {
                return new Date(date).toLocaleDateString('en-IN');
            } catch (error) {
                return 'Invalid Date';
            }
        };

        // Function to format amount
        const formatAmount = (amount) => {
            try {
                return parseFloat(amount).toFixed(2);
            } catch (error) {
                return '0.00';
            }
        };

        // Add transaction tables
        function addTransactionTable(title, transactions, type) {
            if (transactions.length === 0) return;

            doc.font('Helvetica-Bold')
               .fontSize(16)
               .text(title)
               .moveDown(0.5);

            // Table headers
            doc.font('Helvetica-Bold')
               .fontSize(12);

            // Different headers based on transaction type
            if (type === 'expense') {
                doc.text('Date', 50, doc.y, { width: 80 })
                   .text('Category', 130, doc.y, { width: 100 })
                   .text('Description', 230, doc.y, { width: 170 })
                   .text('Amount (₹)', 400, doc.y, { width: 100, align: 'right' });
            } else {
                doc.text('Date', 50, doc.y, { width: 80 })
                   .text('Person Name', 130, doc.y, { width: 100 })
                   .text('Description', 230, doc.y, { width: 170 })
                   .text('Amount (₹)', 400, doc.y, { width: 100, align: 'right' });
            }
            doc.moveDown(0.5);

            // Draw a line under headers
            doc.moveTo(50, doc.y)
               .lineTo(500, doc.y)
               .stroke();
            doc.moveDown(0.5);

            // Table rows
            transactions.forEach((t, index) => {
                const y = doc.y;
                if (y > 700) {
                    doc.addPage();
                    // Redraw headers on new page
                    doc.font('Helvetica-Bold')
                       .fontSize(12);
                    if (type === 'expense') {
                        doc.text('Date', 50, doc.y, { width: 80 })
                           .text('Category', 130, doc.y, { width: 100 })
                           .text('Description', 230, doc.y, { width: 170 })
                           .text('Amount (₹)', 400, doc.y, { width: 100, align: 'right' });
                    } else {
                        doc.text('Date', 50, doc.y, { width: 80 })
                           .text('Person Name', 130, doc.y, { width: 100 })
                           .text('Description', 230, doc.y, { width: 170 })
                           .text('Amount (₹)', 400, doc.y, { width: 100, align: 'right' });
                    }
                    doc.moveDown(0.5);
                    doc.moveTo(50, doc.y)
                       .lineTo(500, doc.y)
                       .stroke();
                    doc.moveDown(0.5);
                }

                // Add zebra striping
                if (index % 2 === 0) {
                    doc.rect(50, doc.y - 5, 450, 20)
                       .fill('#f5f5f5');
                }

                doc.font('Helvetica')
                   .fontSize(10)
                   .fillColor('black');

                if (type === 'expense') {
                    doc.text(formatDate(t.date), 50, doc.y, { width: 80 })
                       .text(t.category || 'Other', 130, doc.y, { width: 100 })
                       .text(t.description || '-', 230, doc.y, { width: 170 })
                       .text(formatAmount(t.amount), 400, doc.y, { width: 100, align: 'right' });
                } else {
                    doc.text(formatDate(t.date), 50, doc.y, { width: 80 })
                       .text(t.personName || '-', 130, doc.y, { width: 100 })
                       .text(t.description || '-', 230, doc.y, { width: 170 })
                       .text(formatAmount(t.amount), 400, doc.y, { width: 100, align: 'right' });
                }
                doc.moveDown(0.5);
            });

            // Draw a line after the table
            doc.moveTo(50, doc.y - 5)
               .lineTo(500, doc.y - 5)
               .stroke();
            doc.moveDown();
        }

        // Add each section
        addTransactionTable('Money Given', givenTransactions, 'give');
        addTransactionTable('Money Taken', takenTransactions, 'take');
        addTransactionTable('Personal Expenses', personalExpenses, 'expense');
        addTransactionTable('Other Expenses', otherExpenses, 'expense');

        // Add summary
        doc.addPage();
        doc.font('Helvetica-Bold')
           .fontSize(18)
           .text('Summary', { align: 'center' })
           .moveDown();

        // Function to add summary line
        function addSummaryLine(label, amount, isPositive = true) {
            doc.font('Helvetica')
               .fontSize(12)
               .text(label, { continued: true })
               .fillColor(isPositive ? '#2ecc71' : '#e74c3c')
               .text(`₹${formatAmount(amount)}`, { align: 'right' })
               .fillColor('black')
               .moveDown(0.5);
        }

        addSummaryLine('Total Money Given:', totalGiven, false);
        addSummaryLine('Total Money Taken:', totalTaken, true);
        addSummaryLine('Total Personal Expenses:', totalPersonalExpenses, false);
        addSummaryLine('Total Other Expenses:', totalOtherExpenses, false);
        doc.moveDown();
        doc.font('Helvetica-Bold')
           .fontSize(14)
           .text('Net Amount:', { continued: true })
           .fillColor(netAmount >= 0 ? '#2ecc71' : '#e74c3c')
           .text(`₹${formatAmount(netAmount)}`, { align: 'right' });

        // Add page numbers
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(10)
               .fillColor('black')
               .text(
                   `Page ${i + 1} of ${pages.count}`,
                   0,
                   doc.page.height - 50,
                   { align: 'center' }
               );
        }

        // Finalize the PDF with proper end
        doc.end();

        // Return a promise that resolves when the PDF is fully written
        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                console.log('PDF generation completed successfully');
                resolve();
            });
            stream.on('error', reject);
        });

    } catch (error) {
        console.error('Error in PDF generation:', error);
        // If there's an error, try to send an error response
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error generating PDF', error: error.message });
        }
        throw error;
    }
}

module.exports = { generateTransactionPDF }; 