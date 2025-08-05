// Test Report Generator dengan Database Laravel
require('dotenv').config();

const database = require('./src/database');
const reportGenerator = require('./src/reportGenerator');
const logger = require('./src/logger');

async function testReport() {
    try {
        console.log('🔄 Testing Report Generator dengan Database Laravel...\n');

        // Initialize database
        await database.initialize();
        console.log('✅ Database connected successfully\n');

        // Test daily report
        console.log('📊 Generating daily report for today...');
        const dailyReport = await reportGenerator.generateDailyReport('2025-08-05');
        console.log('Daily Report:');
        console.log('='.repeat(50));
        console.log(dailyReport);
        console.log('='.repeat(50));
        console.log('✅ Daily report generated successfully\n');

        // Test getting transactions
        console.log('📋 Getting transactions from Laravel database...');
        const transactions = await database.getTransactionsByDate('2025-08-05');
        console.log(`Found ${transactions.length} transactions:`);
        
        transactions.forEach((t, index) => {
            console.log(`${index + 1}. ID: ${t.id}, Customer: ${t.customer_name}, Amount: ${t.amount}, Location: ${t.location}`);
        });
        console.log('✅ Transactions retrieved successfully\n');

        // Test monthly report
        console.log('📊 Generating monthly report...');
        const monthlyReport = await reportGenerator.generateMonthlyReport(2025, 8);
        console.log('Monthly Report:');
        console.log('='.repeat(50));
        console.log(monthlyReport);
        console.log('='.repeat(50));
        console.log('✅ Monthly report generated successfully\n');

        console.log('🎉 All tests passed! Bot dapat membaca data dari Laravel dengan sempurna.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

testReport();
