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

// Handler pesan untuk booking dan command
async function handleMessage(message) {
    try {
        // Skip jika pesan dari status broadcast
        if (message.from === 'status@broadcast') {
            return;
        }

        // Dapatkan nama grup jika pesan dari grup
        let groupName = '';
        if (message.from.includes('@g.us')) {
            groupName = await bot.getGroupName(message.from);
            if (!groupName) {
                groupName = 'Unknown Group';
            }
        }

        // Cek apakah pesan adalah command
        if (messageParser.isCommand(message.body)) {
            await handleCommand(message, groupName);
            return;
        }

        // Cek apakah pesan dimulai dengan Unit (format booking)
        if (message.body.toLowerCase().startsWith('unit')) {
            logger.info(`Memproses pesan booking dari ${groupName || 'private'}: ${message.body.substring(0, 50)}...`);

            // Cek apakah pesan sudah diproses sebelumnya
            const isProcessed = await database.isMessageProcessed(message.id.id);
            if (isProcessed) {
                logger.info(`Pesan ${message.id.id} sudah diproses sebelumnya, skip.`);
                return;
            }

            // Parse pesan dengan nama grup
            const parseResult = messageParser.parseBookingMessage(message.body, message.id.id, groupName);

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
        await errorHandler.handleError(error, 'Message Processing', {
            level: 'error',
            sendEmail: false,
            userId: message.from,
            operation: 'handleMessage'
        });
    }
}

// Handler untuk command !rekap
async function handleCommand(message, groupName) {
    try {
        if (message.body.startsWith('!rekap')) {
            logger.info(`Memproses command rekap dari ${message.from}: ${message.body}`);

            const rekapData = messageParser.parseRekapCommand(message.body);

            if (rekapData) {
                // Generate laporan berdasarkan parameter
                const report = await reportGenerator.generateReportByDateRange(
                    rekapData.startDate,
                    rekapData.endDate,
                    rekapData.displayDate
                );

                if (report) {
                    // Kirim laporan ke chat yang sama
                    await bot.sendMessage(message.from, report);
                    logger.info('Laporan rekap berhasil dikirim');
                } else {
                    await bot.sendMessage(message.from, 'Tidak ada data untuk periode yang diminta.');
                }
            } else {
                await bot.sendMessage(message.from, 'Format command tidak valid. Gunakan: !rekap atau !rekap 28062025');
            }
        }
    } catch (error) {
        logger.error('Error handling command:', error);
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
        logger.info('Starting WhatsApp Bot...');

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

        logger.info('Bot initialization completed');
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
