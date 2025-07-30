// Test file untuk Message Parser
// Format baru dengan multi-line

const messageParser = require('../src/messageParser');

// Test data dengan format baru - berbagai warna lingkaran
const testMessages = [
    {
        input: `🟢SKY HOUSE
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: cash 250
Cs    : dreamy
Komisi: 50`,
        groupName: 'SKY HOUSE',
        expected: {
            location: 'SKY HOUSE',
            groupPrefix: 'SKY HOUSE',
            unit: 'L3/30N',
            checkoutTime: '05:00',
            duration: '6 jam',
            paymentMethod: 'Cash',
            csName: 'dreamy',
            amount: 250000,
            commission: 50000
        }
    },
    {
        input: `🔴TREEPARK BSD
Unit      :A1/20N
Cek out: 14:30
Untuk   : 3 jam
Cash/Tf: tf kr 350
Cs    : amel
Komisi: 75`,
        groupName: 'TREEPARK BSD',
        expected: {
            location: 'TREEPARK BSD',
            groupPrefix: 'TREEPARK BSD',
            unit: 'A1/20N',
            checkoutTime: '14:30',
            duration: '3 jam',
            paymentMethod: 'Transfer',
            csName: 'amel',
            amount: 350000,
            commission: 75000
        }
    },
    {
        input: `🟡GOLDEN TOWER
Unit      :B2/15N
Cek out: 16:00
Untuk   : 4 jam
Cash/Tf: tf amel
Cs    : apk
Komisi: 0`,
        groupName: 'GOLDEN TOWER',
        expected: {
            location: 'GOLDEN TOWER',
            groupPrefix: 'GOLDEN TOWER',
            unit: 'B2/15N',
            checkoutTime: '16:00',
            duration: '4 jam',
            paymentMethod: 'Transfer',
            csName: 'apk',
            amount: 0,
            commission: 0,
            skipFinancial: true
        }
    }
];

// Test runner sederhana
function runTests() {
    console.log('🧪 Menjalankan Test Message Parser...\n');

    let passed = 0;
    let failed = 0;

    testMessages.forEach((test, index) => {
        console.log(`Test ${index + 1}: ${test.input.split('\n')[0]}...`);

        try {
            const result = messageParser.parseBookingMessage(test.input, `test-${index}`, test.groupName);

            if (!result || result.status !== 'VALID') {
                console.log('❌ GAGAL: Parser tidak mengembalikan status VALID');
                failed++;
                return;
            }

            // Cek setiap field yang diharapkan di result.data
            let testPassed = true;
            for (const [key, expectedValue] of Object.entries(test.expected)) {
                if (result.data[key] !== expectedValue) {
                    console.log(`❌ GAGAL: ${key} diharapkan "${expectedValue}", dapat "${result.data[key]}"`);
                    testPassed = false;
                }
            }

            if (testPassed) {
                console.log('✅ BERHASIL');
                passed++;
            } else {
                failed++;
            }

        } catch (error) {
            console.log(`❌ GAGAL: Error - ${error.message}`);
            failed++;
        }

        console.log('');
    });
    
    // Test pesan tidak valid
    console.log('Testing pesan tidak valid...');
    const invalidMessages = [
        'Pesan biasa tanpa emoji',
        'Cek out: 05:00', // Tidak ada Unit di baris kedua
        `Unit: A1`, // Tidak ada prefix di baris pertama
        'Checkout: 05:00\nCek out: A1\nCs: test' // Tidak ada Unit di baris kedua
    ];

    // Test missing field
    const missingFieldMessages = [
        {
            input: `🔵BLUE TOWER
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: tf kr 250
Cs    : dreamy`,
            expectedMissing: 'Komisi'
        },
        {
            input: `🟠ORANGE PARK
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: tf kr 250
Komisi: 50`,
            expectedMissing: 'Cs'
        }
    ];

    invalidMessages.forEach((message, index) => {
        console.log(`Test Tidak Valid ${index + 1}: ${message.split('\n')[0]}...`);

        try {
            const result = messageParser.parseBookingMessage(message, `invalid-${index}`, 'SKY HOUSE');

            if (result && (result.status === 'WRONG_FORMAT' || result.status === 'MISSING_FIELD' || result.status === 'WRONG_PREFIX')) {
                console.log('✅ BERHASIL: Berhasil menolak pesan tidak valid');
                passed++;
            } else {
                console.log('❌ GAGAL: Seharusnya menolak pesan tidak valid');
                failed++;
            }
        } catch (error) {
            console.log('✅ BERHASIL: Berhasil menolak pesan tidak valid');
            passed++;
        }

        console.log('');
    });

    // Test missing field messages
    console.log('Testing missing field messages...');
    missingFieldMessages.forEach((test, index) => {
        console.log(`Test Missing Field ${index + 1}: ${test.input.split('\n')[0]}...`);

        try {
            const result = messageParser.parseBookingMessage(test.input, `missing-${index}`, 'SKY HOUSE');

            if (result && result.status === 'MISSING_FIELD' && result.missingField === test.expectedMissing) {
                console.log(`✅ BERHASIL: Berhasil detect field ${test.expectedMissing} yang kurang`);
                passed++;
            } else {
                console.log(`❌ GAGAL: Seharusnya detect field ${test.expectedMissing} yang kurang`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ GAGAL: Error - ${error.message}`);
            failed++;
        }

        console.log('');
    });

    // Test command !rekap
    console.log('Testing command !rekap...');
    const rekapCommands = [
        '!rekap',
        '!rekap 28062025',
        '!rekap invalid'
    ];

    rekapCommands.forEach((cmd, index) => {
        console.log(`Test Command ${index + 1}: ${cmd}`);
        try {
            const result = messageParser.parseRekapCommand(cmd);
            if (cmd === '!rekap invalid' && result === null) {
                console.log('✅ BERHASIL: Berhasil menolak command tidak valid');
                passed++;
            } else if (cmd !== '!rekap invalid' && result !== null) {
                console.log('✅ BERHASIL: Command berhasil di-parse');
                passed++;
            } else {
                console.log('❌ GAGAL: Hasil tidak sesuai harapan');
                failed++;
            }
        } catch (error) {
            console.log(`❌ GAGAL: Error - ${error.message}`);
            failed++;
        }
        console.log('');
    });
    
    // Ringkasan
    console.log('='.repeat(50));
    console.log(`Hasil Test: ${passed} berhasil, ${failed} gagal`);
    console.log(`Tingkat Keberhasilan: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

    if (failed === 0) {
        console.log('🎉 Semua test berhasil!');
        return true;
    } else {
        console.log('❌ Beberapa test gagal. Silakan periksa implementasi.');
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
