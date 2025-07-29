// Simple Test Runner
// Run all tests in the test directory

const fs = require('fs');
const path = require('path');

console.log('🚀 WhatsApp Bot Test Suite\n');

// Test configuration
const testConfig = {
    testDir: __dirname,
    testPattern: /\.test\.js$/,
    timeout: 30000 // 30 seconds
};

// Find all test files
function findTestFiles() {
    const testFiles = [];
    const files = fs.readdirSync(testConfig.testDir);
    
    files.forEach(file => {
        if (testConfig.testPattern.test(file)) {
            testFiles.push(path.join(testConfig.testDir, file));
        }
    });
    
    return testFiles;
}

// Run a single test file
async function runTestFile(testFile) {
    const testName = path.basename(testFile, '.js');
    console.log(`📋 Running ${testName}...`);
    
    try {
        // Clear require cache to ensure fresh module load
        delete require.cache[require.resolve(testFile)];
        
        const testModule = require(testFile);
        
        if (typeof testModule.runTests === 'function') {
            const startTime = Date.now();
            const result = await testModule.runTests();
            const duration = Date.now() - startTime;
            
            console.log(`⏱️  Completed in ${duration}ms\n`);
            return result;
        } else {
            console.log('⚠️  No runTests function found in test file\n');
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Error running test: ${error.message}\n`);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    const startTime = Date.now();
    const testFiles = findTestFiles();
    
    if (testFiles.length === 0) {
        console.log('⚠️  No test files found');
        return;
    }
    
    console.log(`Found ${testFiles.length} test file(s)\n`);
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const testFile of testFiles) {
        const result = await runTestFile(testFile);
        if (result) {
            totalPassed++;
        } else {
            totalFailed++;
        }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // Final summary
    console.log('='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Files: ${testFiles.length}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    
    if (totalFailed === 0) {
        console.log('🎉 ALL TESTS PASSED!');
        process.exit(0);
    } else {
        console.log('❌ SOME TESTS FAILED');
        process.exit(1);
    }
}

// Health check tests
async function runHealthCheck() {
    console.log('🏥 Running Health Check...\n');
    
    const checks = [
        {
            name: 'Node.js Version',
            check: () => {
                const version = process.version;
                const major = parseInt(version.slice(1).split('.')[0]);
                return major >= 16;
            },
            message: 'Node.js 16+ required'
        },
        {
            name: 'Required Dependencies',
            check: () => {
                try {
                    require('whatsapp-web.js');
                    require('sqlite3');
                    require('mysql2');
                    require('node-cron');
                    require('nodemailer');
                    require('exceljs');
                    require('moment-timezone');
                    require('winston');
                    return true;
                } catch (error) {
                    return false;
                }
            },
            message: 'All required dependencies installed'
        },
        {
            name: 'Configuration File',
            check: () => {
                try {
                    require('../config/config.js');
                    return true;
                } catch (error) {
                    return false;
                }
            },
            message: 'Configuration file accessible'
        },
        {
            name: 'Source Files',
            check: () => {
                const requiredFiles = [
                    '../src/database.js',
                    '../src/whatsappBot.js',
                    '../src/messageParser.js',
                    '../src/reportGenerator.js',
                    '../src/scheduler.js',
                    '../src/excelExporter.js',
                    '../src/emailService.js',
                    '../src/numberFormatter.js',
                    '../src/errorHandler.js',
                    '../src/logger.js'
                ];
                
                try {
                    requiredFiles.forEach(file => require(file));
                    return true;
                } catch (error) {
                    return false;
                }
            },
            message: 'All source files accessible'
        }
    ];
    
    let healthPassed = 0;
    let healthFailed = 0;
    
    for (const check of checks) {
        try {
            const result = check.check();
            if (result) {
                console.log(`✅ ${check.name}: ${check.message}`);
                healthPassed++;
            } else {
                console.log(`❌ ${check.name}: Failed - ${check.message}`);
                healthFailed++;
            }
        } catch (error) {
            console.log(`❌ ${check.name}: Error - ${error.message}`);
            healthFailed++;
        }
    }
    
    console.log(`\n🏥 Health Check: ${healthPassed} passed, ${healthFailed} failed\n`);
    
    return healthFailed === 0;
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--health')) {
        const healthy = await runHealthCheck();
        process.exit(healthy ? 0 : 1);
    } else if (args.includes('--help')) {
        console.log('WhatsApp Bot Test Runner\n');
        console.log('Usage:');
        console.log('  node test/runTests.js          Run all tests');
        console.log('  node test/runTests.js --health Run health check');
        console.log('  node test/runTests.js --help   Show this help');
        process.exit(0);
    } else {
        // Run health check first
        const healthy = await runHealthCheck();
        if (!healthy) {
            console.log('❌ Health check failed. Please fix issues before running tests.');
            process.exit(1);
        }
        
        // Run all tests
        await runAllTests();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test runner error:', error);
        process.exit(1);
    });
}

module.exports = { runAllTests, runHealthCheck };
