// Bot WhatsApp untuk Manajemen Booking Kamar SKY HOUSE
// Entry point utama

const config = require('./config/config.js');
const database = require('./src/database');
const WhatsAppBot = require('./src/whatsappBot');
const Scheduler = require('./src/scheduler');
const messageParser = require('./src/messageParser');
const reportGenerator = require('./src/reportGenerator');
const errorHandler = require('./src/errorHandler');
const logger = require('./src/logger');

// Initialize WhatsApp bot
const bot = new WhatsAppBot();

// Initialize scheduler
const scheduler = new Scheduler(bot);

// Helper function untuk mencari apartemen berdasarkan nama parsial
function findApartmentByPartialName(partialName) {
    if (!partialName) return null;

    const searchTerm = partialName.toLowerCase();

    // Cari di groupMapping values (nama apartemen)
    const apartmentNames = Object.values(config.apartments.groupMapping);

    for (const apartmentName of apartmentNames) {
        if (apartmentName.toLowerCase().includes(searchTerm)) {
            return apartmentName;
        }
    }

    // Cari di allowedGroups
    for (const groupName of config.apartments.allowedGroups) {
        if (groupName.toLowerCase().includes(searchTerm)) {
            // Cari mapping untuk grup ini
            for (const [, value] of Object.entries(config.apartments.groupMapping)) {
                if (value === groupName) {
                    return value;
                }
            }
            return groupName;
        }
    }

    return null;
}

// Handler pesan untuk booking dan command
async function handleMessage(message) {
    try {
        // Skip jika pesan dari status broadcast
        if (message.from === 'status@broadcast') {
            return;
        }

        // Dapatkan nama grup dan apartemen jika pesan dari grup
        let groupName = '';
        let apartmentName = '';
        if (message.from.includes('@g.us')) {
            groupName = await bot.getGroupName(message.from);
            if (!groupName) {
                groupName = 'Unknown Group';
            }

            // Cek apakah grup diizinkan
            if (!bot.isGroupAllowed(groupName)) {
                logger.info(`Grup ${groupName} tidak diizinkan menggunakan bot`);
                return;
            }

            apartmentName = bot.getApartmentName(groupName);
        }

        // Cek apakah pesan adalah command
        if (messageParser.isCommand(message.body)) {
            await handleCommand(message, apartmentName || groupName);
            return;
        }

        // Cek apakah pesan memiliki format booking (baris kedua mengandung "Unit")
        const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
            logger.info(`Memproses pesan booking dari ${apartmentName || groupName || 'private'}: ${message.body.substring(0, 50)}...`);

            // Cek apakah pesan sudah diproses sebelumnya
            const isProcessed = await database.isMessageProcessed(message.id.id);
            if (isProcessed) {
                logger.info(`Pesan ${message.id.id} sudah diproses sebelumnya, dilewati.`);
                return;
            }

            // Parse pesan dengan nama apartemen
            const parseResult = messageParser.parseBookingMessage(message.body, message.id.id, apartmentName || groupName);

            if (parseResult.status === 'VALID') {
                // Simpan ke database
                await database.saveTransaction(parseResult.data);
                await database.markMessageProcessed(message.id.id, message.from);
                logger.info('Transaksi berhasil disimpan');

            } else if (parseResult.status === 'WRONG_FORMAT') {
                // Format salah - hapus pesan dan maki-maki
                const deleted = await bot.deleteMessage(message);
                if (deleted) {
                    await bot.sendMessage(message.from, parseResult.message);
                } else {
                    // Jika tidak bisa hapus, kirim pesan saja
                    await bot.sendMessage(message.from, parseResult.message);
                }

            } else if (parseResult.status === 'MISSING_FIELD') {
                // Field kurang - hapus pesan dan mention user
                const deleted = await bot.deleteMessage(message);
                const contact = await message.getContact();
                const mentionText = `@${contact.number} ${parseResult.message}`;

                if (deleted) {
                    await bot.sendMessageWithMention(message.from, mentionText, contact.id._serialized);
                } else {
                    // Jika tidak bisa hapus, kirim mention saja
                    await bot.sendMessageWithMention(message.from, mentionText, contact.id._serialized);
                }
            }

            // Mark sebagai processed meskipun error untuk avoid spam
            await database.markMessageProcessed(message.id.id, message.from);
        }
    } catch (error) {
        await errorHandler.handleError(error, 'Pemrosesan Pesan', {
            level: 'error',
            sendEmail: false,
            userId: message.from,
            operation: 'handleMessage'
        });
    }
}

// Handler untuk command !rekap dan !apartemen
async function handleCommand(message, apartmentName) {
    try {
        if (message.body.startsWith('!rekap')) {
            logger.info(`Memproses command rekap dari ${message.from}: ${message.body}`);

            // Parse command: !rekap [apartemen] [tanggal]
            const parts = message.body.trim().split(' ');
            let targetApartment = null;
            let dateStr = null;

            // Cek apakah ada parameter apartemen dan/atau tanggal
            if (parts.length > 1) {
                // Cek apakah parameter pertama adalah tanggal (8 digit)
                if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                    dateStr = parts[1];
                } else {
                    // Parameter pertama adalah nama apartemen
                    targetApartment = findApartmentByPartialName(parts[1]);

                    // Cek apakah ada parameter tanggal setelah nama apartemen
                    if (parts.length > 2 && parts[2].length === 8 && /^\d{8}$/.test(parts[2])) {
                        dateStr = parts[2];
                    }
                }
            }

            let rekapData;
            if (dateStr) {
                // Parse tanggal manual
                const day = dateStr.substring(0, 2);
                const month = dateStr.substring(2, 4);
                const year = dateStr.substring(4, 8);
                const targetDate = `${year}-${month}-${day}`;

                rekapData = {
                    startDate: `${targetDate} 12:00:00`,
                    endDate: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')} 11:59:59`,
                    displayDate: `${day}/${month}/${year}`
                };
            } else {
                // Default: hari ini dari jam 12:00
                rekapData = messageParser.parseRekapCommand('!rekap');
            }

            if (rekapData) {
                // Generate laporan berdasarkan parameter
                const report = await reportGenerator.generateReportByDateRange(
                    rekapData.startDate,
                    rekapData.endDate,
                    rekapData.displayDate,
                    targetApartment
                );

                if (report) {
                    // Kirim laporan ke chat yang sama
                    await bot.sendMessage(message.from, report);
                    logger.info('Laporan rekap berhasil dikirim');
                } else {
                    await bot.sendMessage(message.from, 'Tidak ada data untuk periode yang diminta.');
                }
            } else {
                await bot.sendMessage(message.from, 'Format command tidak valid. Gunakan: !rekap, !rekap emerald, !rekap 28062025, atau !rekap emerald 28062025');
            }

        } else if (message.body.startsWith('!detailrekap')) {
            logger.info(`Memproses command detailrekap dari ${message.from}: ${message.body}`);

            // Parse command: !detailrekap [apartemen] [tanggal]
            const parts = message.body.trim().split(' ');
            let targetApartment = apartmentName; // Default dari grup
            let dateRange = null;

            // Cek apakah ada parameter apartemen dan/atau tanggal
            if (parts.length > 1) {
                // Cek apakah parameter pertama adalah tanggal (8 digit)
                if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                    // Parameter pertama adalah tanggal
                    const dateStr = parts[1];
                    const day = dateStr.substring(0, 2);
                    const month = dateStr.substring(2, 4);
                    const year = dateStr.substring(4, 8);

                    dateRange = {
                        startDate: `${year}-${month}-${day} 12:00:00`,
                        endDate: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')} 11:59:59`
                    };
                } else {
                    // Parameter pertama adalah nama apartemen
                    targetApartment = findApartmentByPartialName(parts[1]);

                    // Cek apakah ada parameter tanggal setelah nama apartemen
                    if (parts.length > 2 && parts[2].length === 8 && /^\d{8}$/.test(parts[2])) {
                        const dateStr = parts[2];
                        const day = dateStr.substring(0, 2);
                        const month = dateStr.substring(2, 4);
                        const year = dateStr.substring(4, 8);

                        dateRange = {
                            startDate: `${year}-${month}-${day} 12:00:00`,
                            endDate: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')} 11:59:59`
                        };
                    }
                }
            }

            // Generate detailed report
            const report = await reportGenerator.generateDetailedReport(dateRange, targetApartment);

            if (report) {
                // Kirim laporan ke chat yang sama
                await bot.sendMessage(message.from, report);
                logger.info('Laporan detail berhasil dikirim');
            } else {
                await bot.sendMessage(message.from, 'Tidak ada data untuk periode yang diminta.');
            }

        } else if (message.body.startsWith('!apartemen')) {
            logger.info(`Memproses command apartemen dari ${message.from}: ${message.body}`);

            if (!apartmentName) {
                await bot.sendMessage(message.from, '❌ Command ini hanya bisa digunakan di grup apartemen.');
                return;
            }

            // Parse tanggal jika ada (format: !apartemen DDMMYYYY)
            const parts = message.body.trim().split(' ');
            let dateRange = null;

            if (parts.length > 1) {
                const dateStr = parts[1];
                if (dateStr.length === 8) {
                    const day = dateStr.substring(0, 2);
                    const month = dateStr.substring(2, 4);
                    const year = dateStr.substring(4, 8);
                    const targetDate = `${year}-${month}-${day}`;

                    dateRange = {
                        startDate: targetDate,
                        endDate: targetDate
                    };
                }
            }

            // Generate apartment report
            const report = await reportGenerator.generateApartmentReport(apartmentName, dateRange);

            // Kirim report ke pengirim
            await bot.sendMessage(message.from, report);
            logger.info(`Laporan apartemen untuk ${apartmentName} berhasil dikirim`);
        }
    } catch (error) {
        logger.error('Error menangani command:', error);
        await bot.sendMessage(message.from, 'Terjadi error saat memproses command.');
    }
}

// Recovery function untuk checkpoint system
async function performRecovery() {
    try {
        logger.info('Memulai recovery check untuk pesan yang tertinggal...');

        // Cleanup old processed messages (older than 30 days)
        await database.cleanupProcessedMessages(30);

        // Note: Recovery dari WhatsApp messages yang tertinggal memerlukan
        // implementasi khusus karena WhatsApp Web.js tidak menyimpan history
        // Untuk sekarang, kita hanya cleanup dan log

        logger.info('Recovery check selesai');
    } catch (error) {
        logger.error('Error during recovery:', error);
    }
}

// Daftarkan message handler
bot.addMessageHandler(handleMessage);

// Initialize database and start bot
async function startBot() {
    try {
        logger.info('Memulai Bot WhatsApp...');

        // Setup global error handlers
        errorHandler.setupGlobalHandlers();

        // Initialize database
        await database.initialize();

        // Initialize WhatsApp bot
        await bot.initialize();

        // Perform recovery check setelah bot ready
        await performRecovery();

        // Initialize scheduled tasks
        scheduler.initializeSchedules();

        logger.info('Inisialisasi bot selesai');
    } catch (error) {
        await errorHandler.handleError(error, 'Bot Startup', {
            level: 'fatal',
            sendEmail: true,
            throwError: false
        });
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down bot...');
    logger.info('Graceful shutdown initiated');

    // Stop all scheduled tasks
    scheduler.stopAllTasks();

    // Close database connection
    await database.close();

    // Destroy WhatsApp bot
    await bot.destroy();

    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down bot...');
    logger.info('Graceful shutdown initiated');

    // Stop all scheduled tasks
    scheduler.stopAllTasks();

    // Close database connection
    await database.close();

    // Destroy WhatsApp bot
    await bot.destroy();

    process.exit(0);
});

startBot();
