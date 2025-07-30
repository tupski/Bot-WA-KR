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
async function handleMessage(message, isEdit = false) {
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

            // Cek apakah grup diizinkan berdasarkan ID grup
            if (!bot.isGroupAllowed(message.from)) {
                logger.info(`Grup ${groupName} (ID: ${message.from}) tidak diizinkan menggunakan bot`);
                return;
            }

            apartmentName = bot.getApartmentName(message.from);
        }

        // Cek apakah pesan adalah command
        if (messageParser.isCommand(message.body)) {
            await handleCommand(message, apartmentName || groupName);
            return;
        }

        // Cek apakah pesan memiliki format booking (baris kedua mengandung "Unit")
        const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
            const logPrefix = isEdit ? 'Memproses pesan booking yang diedit' : 'Memproses pesan booking';
            logger.info(`${logPrefix} dari ${apartmentName || groupName || 'private'}: ${message.body.substring(0, 50)}...`);

            if (isEdit) {
                // Jika pesan diedit, update transaksi yang sudah ada
                await handleEditedBookingMessage(message, apartmentName || groupName);
            } else {
                // Jika pesan baru, proses seperti biasa
                await handleNewBookingMessage(message, apartmentName || groupName);
            }
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

// Handler untuk pesan booking baru
async function handleNewBookingMessage(message, apartmentName) {
    // Cek apakah pesan sudah diproses sebelumnya
    const isProcessed = await database.isMessageProcessed(message.id.id);
    if (isProcessed) {
        logger.info(`Pesan ${message.id.id} sudah diproses sebelumnya, dilewati.`);
        return;
    }

    // Parse pesan dengan nama apartemen
    const parseResult = messageParser.parseBookingMessage(message.body, message.id.id, apartmentName);

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

// Handler untuk pesan booking yang diedit
async function handleEditedBookingMessage(message, apartmentName) {
    try {
        // Cek apakah transaksi untuk message ID ini sudah ada
        const existingTransaction = await database.getTransactionByMessageId(message.id.id);

        if (!existingTransaction) {
            logger.info(`Pesan diedit tapi tidak ada transaksi sebelumnya untuk message ID ${message.id.id}, proses sebagai pesan baru`);
            await handleNewBookingMessage(message, apartmentName);
            return;
        }

        // Parse pesan yang sudah diedit
        const parseResult = messageParser.parseBookingMessage(message.body, message.id.id, apartmentName);

        if (parseResult.status === 'VALID') {
            // Update transaksi yang sudah ada
            const updateData = {
                location: parseResult.data.location,
                unit: parseResult.data.unit,
                checkout_time: parseResult.data.checkoutTime,
                duration: parseResult.data.duration,
                payment_method: parseResult.data.paymentMethod,
                cs_name: parseResult.data.csName,
                amount: parseResult.data.amount,
                commission: parseResult.data.commission,
                net_amount: parseResult.data.netAmount
            };

            await database.updateTransactionByMessageId(message.id.id, updateData);
            logger.info(`Transaksi berhasil diupdate untuk message ID ${message.id.id}`);
            logger.info(`Update: Unit ${parseResult.data.unit}, CS ${parseResult.data.csName}, Amount ${parseResult.data.amount}`);

            // Kirim konfirmasi update ke grup
            const confirmationMsg = `✅ *Transaksi berhasil diupdate*\n` +
                `📝 Unit: ${parseResult.data.unit}\n` +
                `👤 CS: ${parseResult.data.csName}\n` +
                `💰 Amount: ${parseResult.data.amount.toLocaleString('id-ID')}`;
            await bot.sendMessage(message.from, confirmationMsg);

        } else {
            // Jika format edit tidak valid, kirim pesan error tapi jangan hapus transaksi
            logger.warn(`Pesan diedit dengan format tidak valid untuk message ID ${message.id.id}`);
            await bot.sendMessage(message.from, `⚠️ Edit pesan tidak valid. Transaksi lama tetap tersimpan.\n\n${parseResult.message}`);
        }

    } catch (error) {
        logger.error(`Error memproses pesan booking yang diedit: ${error.message}`);
        await bot.sendMessage(message.from, `❌ Terjadi error saat memproses edit pesan. Transaksi lama tetap tersimpan.`);
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

            // Deteksi apakah pesan dari grup atau private message
            const isFromGroup = message.from.includes('@g.us');

            if (isFromGroup) {
                // Jika dari grup: selalu filter berdasarkan apartemen grup tersebut
                targetApartment = apartmentName;
                logger.info(`Command dari grup: ${apartmentName}, akan filter data untuk apartemen ini saja`);

                // Untuk grup, hanya terima parameter tanggal
                if (parts.length > 1) {
                    if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                        dateStr = parts[1];
                    } else {
                        await bot.sendMessage(message.from, `❌ Di grup ini hanya bisa melihat data ${apartmentName}. Gunakan: !rekap atau !rekap DDMMYYYY`);
                        return;
                    }
                }
            } else {
                // Jika dari private message: bisa akses semua data
                logger.info('Command dari private message, bisa akses semua data');

                if (parts.length > 1) {
                    // Cek apakah parameter pertama adalah tanggal (8 digit)
                    if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                        dateStr = parts[1];
                        // targetApartment tetap null (semua apartemen)
                    } else {
                        // Parameter pertama adalah nama apartemen
                        targetApartment = findApartmentByPartialName(parts[1]);

                        // Cek apakah ada parameter tanggal setelah nama apartemen
                        if (parts.length > 2 && parts[2].length === 8 && /^\d{8}$/.test(parts[2])) {
                            dateStr = parts[2];
                        }
                    }
                }
                // Jika tidak ada parameter, targetApartment = null (semua apartemen)
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
                // Debug logging
                logger.info(`Mencari data untuk apartemen: "${targetApartment}" pada periode ${rekapData.startDate} - ${rekapData.endDate}`);

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
                    const logMsg = targetApartment ? `untuk apartemen: ${targetApartment}` : 'untuk semua apartemen';
                    logger.info(`Laporan rekap berhasil dikirim ${logMsg}`);
                } else {
                    // Debug: cek data apa yang ada di database
                    const allTransactions = await database.getTransactionsByDateRange(
                        rekapData.startDate,
                        rekapData.endDate,
                        null // Ambil semua apartemen untuk debug
                    );

                    logger.info(`Debug: Total transaksi ditemukan: ${allTransactions.length}`);
                    if (allTransactions.length > 0) {
                        const uniqueLocations = [...new Set(allTransactions.map(t => t.location))];
                        logger.info(`Debug: Lokasi yang ada di database: ${uniqueLocations.join(', ')}`);
                    }

                    const errorMsg = targetApartment ?
                        `Tidak ada data untuk apartemen ${targetApartment} pada periode yang diminta.` :
                        'Tidak ada data untuk periode yang diminta.';
                    await bot.sendMessage(message.from, errorMsg);
                }
            } else {
                const helpMsg = isFromGroup ?
                    'Format command tidak valid. Gunakan: !rekap atau !rekap DDMMYYYY' :
                    'Format command tidak valid. Gunakan: !rekap, !rekap apartemen, !rekap DDMMYYYY, atau !rekap apartemen DDMMYYYY';
                await bot.sendMessage(message.from, helpMsg);
            }

        } else if (message.body.startsWith('!detailrekap')) {
            logger.info(`Memproses command detailrekap dari ${message.from}: ${message.body}`);

            // Parse command: !detailrekap [apartemen] [tanggal]
            const parts = message.body.trim().split(' ');
            let targetApartment = null;
            let dateRange = null;

            // Deteksi apakah pesan dari grup atau private message
            const isFromGroup = message.from.includes('@g.us');

            if (isFromGroup) {
                // Jika dari grup: selalu filter berdasarkan apartemen grup tersebut
                targetApartment = apartmentName;
                logger.info(`Command dari grup: ${apartmentName}, akan filter data untuk apartemen ini saja`);

                // Untuk grup, hanya terima parameter tanggal
                if (parts.length > 1) {
                    if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                        const dateStr = parts[1];
                        const day = dateStr.substring(0, 2);
                        const month = dateStr.substring(2, 4);
                        const year = dateStr.substring(4, 8);

                        dateRange = {
                            startDate: `${year}-${month}-${day} 12:00:00`,
                            endDate: `${year}-${month}-${String(parseInt(day) + 1).padStart(2, '0')} 11:59:59`
                        };
                    } else {
                        await bot.sendMessage(message.from, `❌ Di grup ini hanya bisa melihat data ${apartmentName}. Gunakan: !detailrekap atau !detailrekap DDMMYYYY`);
                        return;
                    }
                }
            } else {
                // Jika dari private message: bisa akses semua data
                logger.info('Command dari private message, bisa akses semua data');

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
                        // targetApartment tetap null (semua apartemen)
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
                // Jika tidak ada parameter, targetApartment = null (semua apartemen)
            }

            // Generate detailed report
            const report = await reportGenerator.generateDetailedReport(dateRange, targetApartment);

            if (report) {
                // Kirim laporan ke chat yang sama
                await bot.sendMessage(message.from, report);
                const logMsg = targetApartment ? `untuk apartemen: ${targetApartment}` : 'untuk semua apartemen';
                logger.info(`Laporan detail berhasil dikirim ${logMsg}`);
            } else {
                const errorMsg = targetApartment ?
                    `Tidak ada data untuk apartemen ${targetApartment} pada periode yang diminta.` :
                    'Tidak ada data untuk periode yang diminta.';
                await bot.sendMessage(message.from, errorMsg);
            }

        } else if (message.body.startsWith('!rekapulang')) {
            logger.info(`Memproses command rekapulang dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !rekapulang hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            await bot.sendMessage(message.from, '🔄 Memulai proses rekap ulang semua pesan di semua grup...\nProses ini mungkin memakan waktu beberapa menit.');

            try {
                const result = await reprocessAllGroupMessages();

                const summary = `✅ *Proses rekap ulang selesai!*\n\n` +
                    `📊 *Ringkasan:*\n` +
                    `- Grup diproses: ${result.groupsProcessed}\n` +
                    `- Total pesan diperiksa: ${result.totalMessagesChecked}\n` +
                    `- Pesan booking ditemukan: ${result.bookingMessagesFound}\n` +
                    `- Data baru ditambahkan: ${result.newDataAdded}\n` +
                    `- Data sudah ada (dilewati): ${result.duplicatesSkipped}\n` +
                    `- Error: ${result.errors}\n\n` +
                    `⏱️ Waktu proses: ${result.processingTime}`;

                await bot.sendMessage(message.from, summary);
                logger.info('Proses rekap ulang selesai:', result);

            } catch (error) {
                logger.error('Error dalam proses rekap ulang:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error dalam proses rekap ulang: ${error.message}`);
            }

        } else if (message.body.startsWith('!reload')) {
            logger.info(`Memproses command reload dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !reload hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Reload konfigurasi dengan mengakses instance
                const configInstance = require('./config/config').instance;
                config.apartments.groupMapping = configInstance.buildGroupMapping();
                config.apartments.allowedGroups = configInstance.buildAllowedGroups();

                let reloadMsg = `✅ *Konfigurasi berhasil di-reload!*\n\n`;
                reloadMsg += `🔧 *Group Mapping:*\n`;
                Object.entries(config.apartments.groupMapping).forEach(([groupId, apartmentName]) => {
                    reloadMsg += `- ${groupId.substring(0, 20)}...: "${apartmentName}"\n`;
                });

                await bot.sendMessage(message.from, reloadMsg);
                logger.info('Konfigurasi berhasil di-reload');

            } catch (error) {
                logger.error('Error dalam reload command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!testedit')) {
            logger.info(`Memproses command testedit dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !testedit hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Ambil transaksi terbaru untuk testing
                const recentTransactions = await database.getLastTransactions(5);

                if (recentTransactions.length === 0) {
                    await bot.sendMessage(message.from, '❌ Tidak ada transaksi untuk testing.');
                    return;
                }

                let testMsg = `🧪 *Test Edit Message*\n\n`;
                testMsg += `📊 *5 Transaksi Terbaru:*\n`;

                recentTransactions.forEach((transaction, index) => {
                    testMsg += `${index + 1}. Message ID: ${transaction.message_id}\n`;
                    testMsg += `   Unit: ${transaction.unit}, CS: ${transaction.cs_name}\n`;
                    testMsg += `   Amount: ${transaction.amount.toLocaleString('id-ID')}\n\n`;
                });

                testMsg += `💡 *Cara test edit:*\n`;
                testMsg += `1. Edit pesan booking di grup\n`;
                testMsg += `2. Bot akan otomatis update database\n`;
                testMsg += `3. Cek log untuk konfirmasi update`;

                await bot.sendMessage(message.from, testMsg);
                logger.info('Test edit info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam testedit command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!debug')) {
            logger.info(`Memproses command debug dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !debug hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Ambil semua transaksi dari 7 hari terakhir
                const moment = require('moment-timezone');
                const endDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
                const startDate = moment().tz('Asia/Jakarta').subtract(7, 'days').format('YYYY-MM-DD');

                const allTransactions = await database.getTransactionsByDateRange(startDate, endDate, null);

                if (allTransactions.length === 0) {
                    await bot.sendMessage(message.from, '❌ Tidak ada transaksi dalam 7 hari terakhir.');
                    return;
                }

                // Analisis data
                const uniqueLocations = [...new Set(allTransactions.map(t => t.location))];
                const locationCounts = {};
                allTransactions.forEach(t => {
                    locationCounts[t.location] = (locationCounts[t.location] || 0) + 1;
                });

                let debugMsg = `🔍 *Debug Info Database*\n\n`;
                debugMsg += `📊 *Periode: ${startDate} - ${endDate}*\n`;
                debugMsg += `📈 Total transaksi: ${allTransactions.length}\n\n`;
                debugMsg += `🏢 *Lokasi di database:*\n`;

                uniqueLocations.forEach(location => {
                    debugMsg += `- "${location}": ${locationCounts[location]} transaksi\n`;
                });

                debugMsg += `\n🔧 *Config Mapping:*\n`;
                const groupMapping = config.apartments.groupMapping;
                Object.entries(groupMapping).forEach(([groupId, apartmentName]) => {
                    debugMsg += `- ${groupId.substring(0, 20)}...: "${apartmentName}"\n`;
                });

                await bot.sendMessage(message.from, debugMsg);
                logger.info('Debug info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam debug command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
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

// Fungsi untuk reprocess semua pesan di semua grup
async function reprocessAllGroupMessages() {
    const startTime = Date.now();
    const result = {
        groupsProcessed: 0,
        totalMessagesChecked: 0,
        bookingMessagesFound: 0,
        newDataAdded: 0,
        duplicatesSkipped: 0,
        errors: 0,
        processingTime: ''
    };

    try {
        logger.info('Memulai proses rekap ulang semua grup...');

        // Ambil semua chat
        const chats = await bot.client.getChats();
        const groups = chats.filter(chat => chat.isGroup);

        // Untuk rekapulang, proses SEMUA grup yang ada (tidak hanya yang enabled)
        // Ambil semua group IDs dari environment variables
        const allGroupIds = [
            process.env.GROUP_SKYHOUSE_ID,
            process.env.GROUP_TREEPARK_ID,
            process.env.GROUP_EMERALD_ID,
            process.env.GROUP_SPRINGWOOD_ID,
            process.env.GROUP_SERPONG_ID,
            process.env.GROUP_TOKYO_ID,
            process.env.GROUP_TESTER_ID
        ].filter(id => id && id.trim() !== ''); // Filter yang tidak kosong

        const allowedGroups = groups.filter(group =>
            allGroupIds.includes(group.id._serialized)
        );

        logger.info(`Ditemukan ${allowedGroups.length} grup untuk diproses (dari ${groups.length} total grup)`);

        // Log semua grup yang akan diproses
        allowedGroups.forEach((group, index) => {
            logger.info(`${index + 1}. ${group.name} (ID: ${group.id._serialized})`);
        });

        for (const group of allowedGroups) {
            try {
                result.groupsProcessed++;
                const groupName = group.name;
                const apartmentName = bot.getApartmentName(group.id._serialized);

                // Counter per grup
                let groupBookingMessages = 0;
                let groupNewData = 0;
                let groupDuplicates = 0;

                logger.info(`[${result.groupsProcessed}/${allowedGroups.length}] Memproses grup: ${groupName} (${apartmentName})`);
                logger.info(`Debug: Group ID: ${group.id._serialized}, Apartment Name: ${apartmentName}`);

                // Ambil pesan dari grup (limit 500 untuk menghindari timeout)
                const messages = await group.fetchMessages({
                    limit: 500,
                    fromMe: false
                });

                logger.info(`Ditemukan ${messages.length} pesan di grup ${groupName}`);
                result.totalMessagesChecked += messages.length;

                for (const message of messages) {
                    try {
                        // Cek apakah pesan memiliki format booking
                        const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
                        if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
                            result.bookingMessagesFound++;
                            groupBookingMessages++;

                            // Cek apakah pesan sudah diproses sebelumnya
                            const isProcessed = await database.isMessageProcessed(message.id.id);
                            if (isProcessed) {
                                result.duplicatesSkipped++;
                                groupDuplicates++;
                                continue;
                            }

                            // Parse pesan
                            const parseResult = messageParser.parseBookingMessage(
                                message.body,
                                message.id.id,
                                apartmentName
                            );

                            if (parseResult.status === 'VALID') {
                                // Cek apakah transaksi sudah ada berdasarkan data transaksi
                                const data = parseResult.data;
                                const exists = await database.isTransactionExists(
                                    data.unit,
                                    data.dateOnly,
                                    data.csName,
                                    data.checkoutTime
                                );

                                if (!exists) {
                                    // Simpan transaksi baru
                                    await database.saveTransaction(data);
                                    await database.markMessageProcessed(message.id.id, message.from);
                                    result.newDataAdded++;
                                    groupNewData++;

                                    logger.info(`Data baru ditambahkan: Unit ${data.unit}, CS ${data.csName}, Apartemen ${apartmentName}`);
                                } else {
                                    // Mark sebagai processed meskipun sudah ada
                                    await database.markMessageProcessed(message.id.id, message.from);
                                    result.duplicatesSkipped++;
                                    groupDuplicates++;
                                }
                            } else {
                                // Mark sebagai processed meskipun format salah
                                await database.markMessageProcessed(message.id.id, message.from);
                            }
                        }
                    } catch (messageError) {
                        logger.error(`Error memproses pesan ${message.id.id}:`, messageError);
                        result.errors++;
                    }
                }

                logger.info(`Selesai memproses grup ${groupName}:`);
                logger.info(`  - Pesan diperiksa: ${messages.length}`);
                logger.info(`  - Pesan booking: ${groupBookingMessages}`);
                logger.info(`  - Data baru: ${groupNewData}`);
                logger.info(`  - Duplikat dilewati: ${groupDuplicates}`);

            } catch (groupError) {
                logger.error(`Error memproses grup ${group.name}:`, groupError);
                result.errors++;
            }
        }

        const endTime = Date.now();
        const processingTimeMs = endTime - startTime;
        const processingTimeMin = Math.round(processingTimeMs / 1000 / 60 * 100) / 100;
        result.processingTime = `${processingTimeMin} menit`;

        logger.info('Proses rekap ulang selesai:', result);
        return result;

    } catch (error) {
        logger.error('Error dalam proses rekap ulang:', error);
        throw error;
    }
}

// Fungsi untuk mencari apartemen berdasarkan nama parsial
function findApartmentByPartialName(partialName) {
    if (!partialName) return null;

    const searchTerm = partialName.toLowerCase();
    const apartmentMapping = config.apartments.groupMapping;

    // Cari berdasarkan nama apartemen
    for (const [, apartmentName] of Object.entries(apartmentMapping)) {
        if (apartmentName.toLowerCase().includes(searchTerm)) {
            return apartmentName;
        }
    }

    // Cari berdasarkan kata kunci (sesuaikan dengan nama di database)
    const keywords = {
        'sky': 'SKY HOUSE BSD',
        'skyhouse': 'SKY HOUSE BSD',
        'tree': 'TREEPARK BSD',
        'treepark': 'TREEPARK BSD',
        'emerald': 'EMERALD BINTARO',
        'springwood': 'SPRINGWOOD',
        'serpong': 'SERPONG GARDEN',
        'tokyo': 'TOKYO RIVERSIDE PIK2',
        'testing': 'TESTING BOT',
        'test': 'TESTING BOT'
    };

    return keywords[searchTerm] || null;
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
