// Bot WhatsApp untuk Manajemen Booking Kamar Kakarama Room
// Entry point utama

// Load environment variables FIRST
require('dotenv').config();

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

            // Debug logging untuk troubleshooting
            logger.info(`Debug mapping - Group ID: ${message.from}, Group Name: ${groupName}, Apartment Name: ${apartmentName}`);
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
        logger.info(`Transaksi berhasil disimpan dengan Message ID: ${message.id.id}`);

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
            // Bandingkan data lama dengan data baru
            const oldData = {
                unit: existingTransaction.unit,
                checkout_time: existingTransaction.checkout_time,
                amount: existingTransaction.amount,
                cs_name: existingTransaction.cs_name,
                payment_method: existingTransaction.payment_method,
                commission: existingTransaction.commission
            };

            const newData = {
                unit: parseResult.data.unit,
                checkout_time: parseResult.data.checkoutTime,
                amount: parseResult.data.amount,
                cs_name: parseResult.data.csName,
                payment_method: parseResult.data.paymentMethod,
                commission: parseResult.data.commission
            };

            // Cek apakah ada perubahan
            const hasChanges = Object.keys(oldData).some(key => {
                const oldValue = oldData[key];
                const newValue = newData[key.replace('checkout_time', 'checkoutTime').replace('cs_name', 'csName').replace('payment_method', 'paymentMethod')];
                return oldValue !== newValue;
            });

            if (hasChanges) {
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

                // Log perubahan detail
                Object.keys(oldData).forEach(key => {
                    const newKey = key.replace('checkout_time', 'checkoutTime').replace('cs_name', 'csName').replace('payment_method', 'paymentMethod');
                    if (oldData[key] !== newData[newKey]) {
                        logger.info(`  ${key}: ${oldData[key]} → ${newData[newKey]}`);
                    }
                });

                // Kirim konfirmasi update ke grup
                const confirmationMsg = `✅ *Transaksi berhasil diupdate*\n` +
                    `📝 Unit: ${parseResult.data.unit}\n` +
                    `👤 CS: ${parseResult.data.csName}\n` +
                    `💰 Amount: ${parseResult.data.amount.toLocaleString('id-ID')}\n` +
                    `🔄 Data telah disinkronkan`;
                await bot.sendMessage(message.from, confirmationMsg);
            } else {
                logger.info(`Tidak ada perubahan pada transaksi ${message.id.id}, skip update`);
            }

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
        // Cek apakah user adalah owner (untuk command tertentu)
        const isOwner = bot.isOwner(message.from);

        if (message.body.startsWith('!rekap')) {
            // Untuk !rekap, izinkan semua user di grup yang diizinkan
            // Tapi jika dari private message, hanya owner yang bisa
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
                // Jika dari private message: hanya owner yang bisa akses
                if (!isOwner) {
                    await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command ini di private message.');
                    return;
                }

                logger.info('Command dari private message oleh owner, bisa akses semua data');

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

                // Gunakan moment untuk handle overflow tanggal dengan benar
                const moment = require('moment-timezone');
                const startMoment = moment.tz(`${year}-${month}-${day}`, 'YYYY-MM-DD', 'Asia/Jakarta');
                const endMoment = startMoment.clone().add(1, 'day');

                rekapData = {
                    startDate: startMoment.format('YYYY-MM-DD') + ' 12:00:00',
                    endDate: endMoment.format('YYYY-MM-DD') + ' 11:59:59',
                    displayDate: `${day}/${month}/${year}`
                };
            } else {
                // Default: business day dimulai jam 12:00 siang
                const moment = require('moment-timezone');
                const now = moment().tz('Asia/Jakarta');

                // Tentukan business day saat ini
                let businessDay;
                if (now.hour() < 12) {
                    // Sebelum jam 12:00 - masih business day kemarin
                    businessDay = now.clone().subtract(1, 'day');
                } else {
                    // Setelah jam 12:00 - sudah business day hari ini
                    businessDay = now.clone();
                }

                // Rentang waktu: business day jam 12:00 - business day+1 jam 11:59
                const startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                const endDate = businessDay.clone().add(1, 'day').format('YYYY-MM-DD') + ' 11:59:59';

                rekapData = {
                    startDate: startDate,
                    endDate: endDate,
                    displayDate: businessDay.format('DD/MM/YYYY')
                };
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
                // Jika dari private message: hanya owner yang bisa akses
                if (!isOwner) {
                    await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command ini di private message.');
                    return;
                }

                logger.info('Command dari private message oleh owner, bisa akses semua data');

                if (parts.length > 1) {
                    // Cek apakah parameter pertama adalah tanggal (8 digit)
                    if (parts[1].length === 8 && /^\d{8}$/.test(parts[1])) {
                        // Parameter pertama adalah tanggal
                        const dateStr = parts[1];
                        const day = dateStr.substring(0, 2);
                        const month = dateStr.substring(2, 4);
                        const year = dateStr.substring(4, 8);

                        // Gunakan moment untuk handle overflow tanggal dengan benar
                        const moment = require('moment-timezone');
                        const startMoment = moment.tz(`${year}-${month}-${day}`, 'YYYY-MM-DD', 'Asia/Jakarta');
                        const endMoment = startMoment.clone().add(1, 'day');

                        dateRange = {
                            startDate: startMoment.format('YYYY-MM-DD') + ' 12:00:00',
                            endDate: endMoment.format('YYYY-MM-DD') + ' 11:59:59'
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

                            // Gunakan moment untuk handle overflow tanggal dengan benar
                            const moment = require('moment-timezone');
                            const startMoment = moment.tz(`${year}-${month}-${day}`, 'YYYY-MM-DD', 'Asia/Jakarta');
                            const endMoment = startMoment.clone().add(1, 'day');

                            dateRange = {
                                startDate: startMoment.format('YYYY-MM-DD') + ' 12:00:00',
                                endDate: endMoment.format('YYYY-MM-DD') + ' 11:59:59'
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

            // Hanya owner yang bisa menggunakan command ini
            if (!isOwner) {
                await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command !rekapulang.');
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

        } else if (message.body.startsWith('!status')) {
            logger.info(`Memproses command status dari ${message.from}: ${message.body}`);

            // Hanya owner yang bisa menggunakan command ini
            if (!isOwner) {
                await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command !status.');
                return;
            }

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !status hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const nextRuns = scheduler.getNextRunTimes();
                const config = require('./config/config');

                let statusMessage = `📊 *STATUS BOT KAKARAMA ROOM*\n\n`;
                statusMessage += `🤖 *Bot Status:* ${bot.isClientReady() ? '✅ Online' : '❌ Offline'}\n\n`;

                statusMessage += `📅 *Jadwal Laporan Berikutnya:*\n`;

                // Cek apakah ada jadwal yang tersedia
                const hasSchedules = Object.keys(nextRuns).length > 0;

                if (hasSchedules) {
                    if (nextRuns.dailyReport) {
                        statusMessage += `• Harian: ${new Date(nextRuns.dailyReport).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}\n`;
                    }
                    if (nextRuns.weeklyReport) {
                        statusMessage += `• Mingguan: ${new Date(nextRuns.weeklyReport).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}\n`;
                    }
                    if (nextRuns.monthlyReport) {
                        statusMessage += `• Bulanan: ${new Date(nextRuns.monthlyReport).toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}\n`;
                    }
                } else {
                    statusMessage += `⚠️ Jadwal tidak tersedia - Scheduler mungkin belum diinisialisasi\n`;
                    statusMessage += `📋 Jadwal yang dikonfigurasi:\n`;
                    statusMessage += `• Harian: Setiap hari jam 12:00 WIB\n`;
                    statusMessage += `• Mingguan: Setiap Senin jam 09:00 WIB\n`;
                    statusMessage += `• Bulanan: Tanggal 1 jam 10:00 WIB\n`;
                }

                statusMessage += `\n🏢 *Grup Aktif:* ${config.apartments.allowedGroups.length} grup\n`;
                statusMessage += `👤 *Owner Numbers:* ${config.owner.allowedNumbers.length} nomor\n\n`;

                statusMessage += `⏰ *Waktu Server:* ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})} WIB`;

                await bot.sendMessage(message.from, statusMessage);
                logger.info('Status bot berhasil dikirim');
            } catch (error) {
                logger.error('Error mengambil status bot:', error);
                await bot.sendMessage(message.from, '❌ Terjadi error saat mengambil status bot.');
            }

        } else if (message.body.startsWith('!debug')) {
            logger.info(`Memproses command debug dari ${message.from}: ${message.body}`);

            // Hanya owner yang bisa menggunakan command ini
            if (!isOwner) {
                await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command !debug.');
                return;
            }

            try {
                let debugMessage = `🔍 *DEBUG INFO*\n\n`;

                // Environment variables check
                debugMessage += `📋 *Environment Variables:*\n`;
                debugMessage += `• OWNER_NUMBER: ${process.env.OWNER_NUMBER ? '✅ Set' : '❌ Missing'}\n`;
                debugMessage += `• GROUP_SKYHOUSE_ID: ${process.env.GROUP_SKYHOUSE_ID ? '✅ Set' : '❌ Missing'}\n`;
                debugMessage += `• GROUP_SKYHOUSE_NAME: ${process.env.GROUP_SKYHOUSE_NAME ? '✅ Set' : '❌ Missing'}\n`;
                debugMessage += `• GROUP_SKYHOUSE_ENABLED: ${process.env.GROUP_SKYHOUSE_ENABLED}\n\n`;

                // Config check
                debugMessage += `⚙️ *Config Status:*\n`;
                debugMessage += `• Group Mapping: ${Object.keys(config.apartments.groupMapping).length} entries\n`;
                debugMessage += `• Allowed Groups: ${config.apartments.allowedGroups.length} groups\n`;
                debugMessage += `• Owner Numbers: ${config.owner.allowedNumbers.length} numbers\n\n`;

                // Specific group check
                const testGroupId = '120363317169602122@g.us';
                const apartmentName = bot.getApartmentName(testGroupId);
                debugMessage += `🏠 *Group Test:*\n`;
                debugMessage += `• Test Group ID: ${testGroupId}\n`;
                debugMessage += `• Mapped Name: ${apartmentName}\n`;
                debugMessage += `• Is Allowed: ${bot.isGroupAllowed(testGroupId) ? '✅ Yes' : '❌ No'}\n\n`;

                // Owner check
                const testNumber = message.from.replace('@c.us', '');
                debugMessage += `👤 *Owner Test:*\n`;
                debugMessage += `• Your Number: ${testNumber}\n`;
                debugMessage += `• Is Owner: ${bot.isOwner(message.from) ? '✅ Yes' : '❌ No'}\n`;
                debugMessage += `• Owner List: ${config.owner.allowedNumbers.join(', ')}\n`;

                await bot.sendMessage(message.from, debugMessage);
                logger.info('Debug info berhasil dikirim');
            } catch (error) {
                logger.error('Error mengambil debug info:', error);
                await bot.sendMessage(message.from, '❌ Terjadi error saat mengambil debug info.');
            }

        } else if (message.body.startsWith('!export')) {
            logger.info(`Memproses command export dari ${message.from}: ${message.body}`);

            // Hanya owner yang bisa menggunakan command ini
            if (!isOwner) {
                await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command !export.');
                return;
            }

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !export hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const emailService = require('./src/emailService');
                const moment = require('moment-timezone');

                // Parse command: !export [apartemen] [DDMMYYYY]
                const parts = message.body.trim().split(' ');
                let targetDate = null;
                let startDate, endDate, displayDate;
                let apartmentName = null;

                if (parts.length === 1) {
                    // !export - Default: business day kemarin (seperti laporan harian)
                    const now = moment().tz('Asia/Jakarta');
                    const businessDay = now.clone().subtract(1, 'day');

                    startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                    endDate = now.format('YYYY-MM-DD') + ' 11:59:59';
                    displayDate = businessDay.format('DD/MM/YYYY');
                    targetDate = businessDay.format('YYYY-MM-DD');
                } else if (parts.length === 2) {
                    // !export DDMMYYYY atau !export apartemen
                    const param = parts[1];

                    if (param.length === 8 && /^\d{8}$/.test(param)) {
                        // Format tanggal DDMMYYYY
                        const day = param.substring(0, 2);
                        const month = param.substring(2, 4);
                        const year = param.substring(4, 8);
                        targetDate = `${year}-${month}-${day}`;

                        // Validasi tanggal
                        const parsedDate = moment(targetDate, 'YYYY-MM-DD');
                        if (!parsedDate.isValid()) {
                            await bot.sendMessage(message.from, '❌ Format tanggal tidak valid. Gunakan format DDMMYYYY (contoh: 01082025)');
                            return;
                        }

                        // Hitung business day range untuk tanggal yang diminta
                        const businessDay = parsedDate.clone();
                        const nextDay = businessDay.clone().add(1, 'day');

                        startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                        endDate = nextDay.format('YYYY-MM-DD') + ' 11:59:59';
                        displayDate = businessDay.format('DD/MM/YYYY');
                    } else {
                        // Nama apartemen - gunakan business day kemarin
                        apartmentName = findApartmentByPartialName(param);
                        if (!apartmentName) {
                            await bot.sendMessage(message.from, `❌ Apartemen "${param}" tidak ditemukan. Gunakan: sky, treepark, emerald, springwood, serpong, tokyo`);
                            return;
                        }

                        const now = moment().tz('Asia/Jakarta');
                        const businessDay = now.clone().subtract(1, 'day');

                        startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                        endDate = now.format('YYYY-MM-DD') + ' 11:59:59';
                        displayDate = businessDay.format('DD/MM/YYYY');
                        targetDate = businessDay.format('YYYY-MM-DD');
                    }
                } else if (parts.length === 3) {
                    // !export apartemen DDMMYYYY
                    const apartmentParam = parts[1];
                    const dateParam = parts[2];

                    // Validasi apartemen
                    apartmentName = findApartmentByPartialName(apartmentParam);
                    if (!apartmentName) {
                        await bot.sendMessage(message.from, `❌ Apartemen "${apartmentParam}" tidak ditemukan. Gunakan: sky, treepark, emerald, springwood, serpong, tokyo`);
                        return;
                    }

                    // Validasi tanggal
                    if (dateParam.length !== 8 || !/^\d{8}$/.test(dateParam)) {
                        await bot.sendMessage(message.from, '❌ Format tanggal tidak valid. Gunakan format DDMMYYYY (contoh: 01082025)');
                        return;
                    }

                    const day = dateParam.substring(0, 2);
                    const month = dateParam.substring(2, 4);
                    const year = dateParam.substring(4, 8);
                    targetDate = `${year}-${month}-${day}`;

                    // Validasi tanggal
                    const parsedDate = moment(targetDate, 'YYYY-MM-DD');
                    if (!parsedDate.isValid()) {
                        await bot.sendMessage(message.from, '❌ Format tanggal tidak valid. Gunakan format DDMMYYYY (contoh: 01082025)');
                        return;
                    }

                    // Hitung business day range untuk tanggal yang diminta
                    const businessDay = parsedDate.clone();
                    const nextDay = businessDay.clone().add(1, 'day');

                    startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                    endDate = nextDay.format('YYYY-MM-DD') + ' 11:59:59';
                    displayDate = businessDay.format('DD/MM/YYYY');
                } else {
                    await bot.sendMessage(message.from, '❌ Format command tidak valid.\n\nGunakan:\n- `!export` (business day kemarin)\n- `!export DDMMYYYY` (tanggal tertentu)\n- `!export apartemen DDMMYYYY` (apartemen + tanggal)');
                    return;
                }

                const apartmentText = apartmentName ? ` untuk ${apartmentName}` : '';
                await bot.sendMessage(message.from, `📊 Memproses export laporan${apartmentText} untuk ${displayDate}...\n⏳ Mohon tunggu, proses ini memakan waktu beberapa menit.`);

                logger.info(`Generating Excel export for date range: ${startDate} - ${endDate}${apartmentText}`);

                // Generate Excel dengan business day range
                const database = require('./src/database');
                const transactions = await database.getTransactionsByDateRange(startDate, endDate, apartmentName);

                if (transactions.length === 0) {
                    const noDataText = apartmentName ? `${apartmentName} pada periode ${displayDate}` : `periode ${displayDate}`;
                    await bot.sendMessage(message.from, `❌ Tidak ada transaksi ditemukan untuk ${noDataText}.`);
                    return;
                }

                // Create Excel file dengan 3 sheets
                const path = require('path');
                const fs = require('fs');

                // Hitung summary data dari transactions
                const csSummary = calculateCSSummaryFromTransactions(transactions);
                const marketingCommission = calculateMarketingCommissionFromTransactions(transactions);

                // Create workbook dengan 3 sheets
                const ExcelJS = require('exceljs');
                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'KAKARAMA ROOM';
                workbook.lastModifiedBy = 'WhatsApp Bot';
                workbook.created = new Date();
                workbook.modified = new Date();

                // Create sheets
                await createTransactionsSheetForExport(workbook, transactions, displayDate, apartmentName);
                await createCSSummarySheetForExport(workbook, csSummary, displayDate, apartmentName);
                await createCommissionSheetForExport(workbook, marketingCommission, displayDate, apartmentName);

                // Save file
                const apartmentPrefix = apartmentName ? `${apartmentName.replace(/\s+/g, '_')}_` : '';
                const filename = `Laporan_Export_${apartmentPrefix}${displayDate.replace(/\//g, '')}_${Date.now()}.xlsx`;
                const exportDir = './exports';
                if (!fs.existsSync(exportDir)) {
                    fs.mkdirSync(exportDir, { recursive: true });
                }
                const filepath = path.join(exportDir, filename);

                await workbook.xlsx.writeFile(filepath);

                // Send via email
                const emailSent = await emailService.sendDailyReport(filepath, targetDate, apartmentName);

                const apartmentInfo = apartmentName ? `\n- Apartemen: ${apartmentName}` : '';

                if (emailSent) {
                    await bot.sendMessage(message.from, `✅ Export laporan berhasil!\n\n📊 **Ringkasan:**\n- Periode: ${displayDate}${apartmentInfo}\n- Total transaksi: ${transactions.length}\n- File: ${filename}\n\n📧 Laporan telah dikirim via email ke ${config.email.to}`);
                } else {
                    await bot.sendMessage(message.from, `⚠️ Export laporan berhasil dibuat tapi gagal dikirim via email.\n\n📊 **Ringkasan:**\n- Periode: ${displayDate}${apartmentInfo}\n- Total transaksi: ${transactions.length}\n- File: ${filename}\n\n💾 File tersimpan di server: ${filepath}`);
                }

                logger.info(`Export completed: ${filename} with ${transactions.length} transactions`);

            } catch (error) {
                logger.error('Error dalam export laporan:', error);
                await bot.sendMessage(message.from, '❌ Terjadi error saat export laporan. Silakan coba lagi atau hubungi administrator.');
            }

        } else if (message.body.startsWith('!fixenv')) {
            logger.info(`Memproses command fixenv dari ${message.from}: ${message.body}`);

            // Hanya owner yang bisa menggunakan command ini
            if (!isOwner) {
                await bot.sendMessage(message.from, '❌ Hanya owner yang dapat menggunakan command !fixenv.');
                return;
            }

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !fixenv hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const fs = require('fs');
                const path = require('path');

                // Read .env file directly and parse manually
                // Try multiple possible paths
                const possiblePaths = [
                    path.join(process.cwd(), '.env'),
                    path.join(__dirname, '.env'),
                    '/home/tupas/Bot-KR/.env',
                    './.env'
                ];

                let envPath = null;
                let envContent = null;

                for (const testPath of possiblePaths) {
                    try {
                        if (fs.existsSync(testPath)) {
                            const content = fs.readFileSync(testPath, 'utf8');
                            // Check if this file has GROUP_SKYHOUSE variables
                            if (content.includes('GROUP_SKYHOUSE_ID')) {
                                envPath = testPath;
                                envContent = content;
                                break;
                            }
                        }
                    } catch (err) {
                        // Continue to next path
                    }
                }

                if (!envContent) {
                    throw new Error('Could not find .env file with GROUP_SKYHOUSE variables');
                }

                // Parse .env manually
                const envVars = {};
                const lines = envContent.split('\n');

                lines.forEach(line => {
                    line = line.trim();
                    if (line && !line.startsWith('#') && line.includes('=')) {
                        const [key, ...valueParts] = line.split('=');
                        const value = valueParts.join('=').trim();
                        envVars[key.trim()] = value;
                    }
                });

                // Set environment variables manually
                Object.keys(envVars).forEach(key => {
                    if (key.startsWith('GROUP_')) {
                        process.env[key] = envVars[key];
                    }
                });

                // Manual rebuild mapping
                const manualMapping = {};
                const groups = ['SKYHOUSE', 'TREEPARK', 'EMERALD', 'SPRINGWOOD', 'SERPONG', 'TOKYO', 'TESTER'];

                let fixMsg = `🔧 *Fix Environment Variables*\n\n`;
                fixMsg += `📁 *Manual .env Parsing:*\n`;
                fixMsg += `- .env file path: ${envPath}\n`;
                fixMsg += `- .env file size: ${envContent.length} bytes\n`;
                fixMsg += `- Total lines: ${lines.length}\n`;
                fixMsg += `- Parsed variables: ${Object.keys(envVars).length}\n`;
                fixMsg += `- GROUP_* variables: ${Object.keys(envVars).filter(k => k.startsWith('GROUP_')).length}\n\n`;

                fixMsg += `📋 *Group Variables Status:*\n`;
                groups.forEach(group => {
                    const id = envVars[`GROUP_${group}_ID`];
                    const name = envVars[`GROUP_${group}_NAME`];
                    const enabled = envVars[`GROUP_${group}_ENABLED`];

                    fixMsg += `${group}: ${id ? '✅' : '❌'} ${name ? '✅' : '❌'} ${enabled === 'true' ? '✅' : '❌'}\n`;

                    if (id && name && enabled === 'true') {
                        manualMapping[id] = name;
                        // Set to process.env
                        process.env[`GROUP_${group}_ID`] = id;
                        process.env[`GROUP_${group}_NAME`] = name;
                        process.env[`GROUP_${group}_ENABLED`] = enabled;
                    }
                });

                // Update global config
                config.apartments.groupMapping = manualMapping;
                config.apartments.allowedGroups = Object.keys(manualMapping);

                fixMsg += `\n🔧 *Manual Group Mapping (${Object.keys(manualMapping).length} entries):*\n`;
                Object.entries(manualMapping).forEach(([groupId, apartmentName]) => {
                    fixMsg += `- ${groupId.substring(0, 20)}...: "${apartmentName}"\n`;
                });

                fixMsg += `\n✅ *Environment variables fixed manually!*\n`;
                fixMsg += `- Process.env updated\n`;
                fixMsg += `- Config.apartments.groupMapping updated\n`;
                fixMsg += `- Ready to test with !rekap from groups`;

                await bot.sendMessage(message.from, fixMsg);
                logger.info('Fix environment variables berhasil');
                logger.info(`Manual mapping after fix: ${JSON.stringify(manualMapping, null, 2)}`);

            } catch (error) {
                logger.error('Error dalam fixenv command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!testdotenv')) {
            logger.info(`Memproses command testdotenv dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !testdotenv hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const fs = require('fs');
                const path = require('path');

                let testMsg = `🧪 *Test Dotenv Loading*\n\n`;

                // Test multiple possible .env paths
                const possiblePaths = [
                    path.join(process.cwd(), '.env'),
                    path.join(__dirname, '.env'),
                    '/home/tupas/Bot-KR/.env',
                    './.env'
                ];

                testMsg += `📁 *File System:*\n`;
                testMsg += `- Working Directory: ${process.cwd()}\n`;
                testMsg += `- __dirname: ${__dirname}\n\n`;

                testMsg += `📋 *Testing .env Paths:*\n`;
                let correctEnvPath = null;
                let correctEnvContent = null;

                possiblePaths.forEach(testPath => {
                    const exists = fs.existsSync(testPath);
                    testMsg += `- ${testPath}: ${exists ? '✅ Exists' : '❌ Not found'}\n`;

                    if (exists) {
                        try {
                            const content = fs.readFileSync(testPath, 'utf8');
                            const hasGroupVars = content.includes('GROUP_SKYHOUSE_ID');
                            testMsg += `  Size: ${content.length} bytes, Has GROUP_SKYHOUSE: ${hasGroupVars ? '✅' : '❌'}\n`;

                            if (hasGroupVars && !correctEnvPath) {
                                correctEnvPath = testPath;
                                correctEnvContent = content;
                            }
                        } catch (err) {
                            testMsg += `  Error reading: ${err.message}\n`;
                        }
                    }
                });

                testMsg += `\n`;

                if (correctEnvContent) {
                    const lines = correctEnvContent.split('\n');
                    const groupLines = lines.filter(line => line.startsWith('GROUP_'));
                    testMsg += `📋 *Correct .env File (${correctEnvPath}):*\n`;
                    testMsg += `- Size: ${correctEnvContent.length} bytes\n`;
                    testMsg += `- Total Lines: ${lines.length}\n`;
                    testMsg += `- GROUP_* Lines: ${groupLines.length}\n\n`;

                    testMsg += `📋 *GROUP Lines in correct .env:*\n`;
                    groupLines.slice(0, 5).forEach(line => {
                        testMsg += `- ${line.substring(0, 50)}...\n`;
                    });
                    testMsg += `\n`;
                } else {
                    testMsg += `❌ *No .env file with GROUP_SKYHOUSE variables found!*\n\n`;
                }

                // Test manual dotenv load
                testMsg += `🔄 *Manual Dotenv Test:*\n`;
                try {
                    // Clear existing env vars
                    const groupKeys = Object.keys(process.env).filter(key => key.startsWith('GROUP_'));
                    testMsg += `- Existing GROUP_* vars: ${groupKeys.length}\n`;

                    // Force reload dotenv
                    delete require.cache[require.resolve('dotenv')];
                    const dotenv = require('dotenv');
                    const result = dotenv.config({ path: envPath, override: true });

                    testMsg += `- Dotenv result: ${result.error ? '❌ Error' : '✅ Success'}\n`;
                    if (result.error) {
                        testMsg += `- Error: ${result.error.message}\n`;
                    }

                    // Test specific variables
                    const testVars = ['GROUP_SKYHOUSE_ID', 'GROUP_SKYHOUSE_NAME', 'GROUP_SKYHOUSE_ENABLED'];
                    testMsg += `\n🔍 *Test Specific Variables:*\n`;
                    testVars.forEach(varName => {
                        const value = process.env[varName];
                        testMsg += `- ${varName}: ${value ? '✅ ' + value.substring(0, 20) + '...' : '❌ undefined'}\n`;
                    });

                } catch (dotenvError) {
                    testMsg += `- Dotenv Error: ${dotenvError.message}\n`;
                }

                await bot.sendMessage(message.from, testMsg);
                logger.info('Test dotenv berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam testdotenv command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!envdetail')) {
            logger.info(`Memproses command envdetail dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !envdetail hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                let envMsg = `🔍 *Environment Variables Detail*\n\n`;

                // Test semua group environment variables dengan detail
                const groups = ['SKYHOUSE', 'TREEPARK', 'EMERALD', 'SPRINGWOOD', 'SERPONG', 'TOKYO', 'TESTER'];

                groups.forEach(group => {
                    const id = process.env[`GROUP_${group}_ID`];
                    const name = process.env[`GROUP_${group}_NAME`];
                    const enabled = process.env[`GROUP_${group}_ENABLED`];

                    envMsg += `📋 *${group}:*\n`;
                    envMsg += `- ID: ${id || '❌ undefined'}\n`;
                    envMsg += `- NAME: ${name || '❌ undefined'}\n`;
                    envMsg += `- ENABLED: ${enabled || '❌ undefined'}\n`;

                    // Debug: Cek apakah value benar-benar ada
                    if (id) {
                        envMsg += `- ID Length: ${id.length}\n`;
                        envMsg += `- ID Type: ${typeof id}\n`;
                    }
                    if (name) {
                        envMsg += `- NAME Length: ${name.length}\n`;
                    }
                    envMsg += `\n`;
                });

                // Test dotenv
                envMsg += `🔍 *Dotenv Test:*\n`;
                envMsg += `- NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`;
                envMsg += `- Current working directory: ${process.cwd()}\n`;
                envMsg += `- .env file exists: ${require('fs').existsSync('.env') ? '✅ Yes' : '❌ No'}\n`;

                // Test config loading
                try {
                    delete require.cache[require.resolve('./config/config.js')];
                    const testConfig = require('./config/config.js');
                    envMsg += `- Config loaded: ✅ Yes\n`;
                    envMsg += `- Group mappings found: ${Object.keys(testConfig.apartments.groupMapping).length}\n`;
                } catch (configError) {
                    envMsg += `- Config loaded: ❌ Error: ${configError.message}\n`;
                }

                await bot.sendMessage(message.from, envMsg);
                logger.info('Environment variables detail berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam envdetail command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!env')) {
            logger.info(`Memproses command env dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !env hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                let envMsg = `🔧 *Environment Variables Test*\n\n`;

                // Test semua group environment variables
                const groups = ['SKYHOUSE', 'TREEPARK', 'EMERALD', 'SPRINGWOOD', 'SERPONG', 'TOKYO', 'TESTER'];

                groups.forEach(group => {
                    const id = process.env[`GROUP_${group}_ID`];
                    const name = process.env[`GROUP_${group}_NAME`];
                    const enabled = process.env[`GROUP_${group}_ENABLED`];

                    envMsg += `📋 *${group}:*\n`;
                    envMsg += `- ID: ${id || '❌ undefined'}\n`;
                    envMsg += `- NAME: ${name || '❌ undefined'}\n`;
                    envMsg += `- ENABLED: ${enabled || '❌ undefined'}\n\n`;
                });

                // Test dotenv loading
                envMsg += `🔍 *Dotenv Test:*\n`;
                envMsg += `- NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`;
                envMsg += `- Current working directory: ${process.cwd()}\n`;
                envMsg += `- .env file exists: ${require('fs').existsSync('.env') ? '✅ Yes' : '❌ No'}\n`;

                await bot.sendMessage(message.from, envMsg);
                logger.info('Environment variables info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam env command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!mapping')) {
            logger.info(`Memproses command mapping dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !mapping hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                let mappingMsg = `🗺️ *Current Group Mapping*\n\n`;

                const groupMapping = config.apartments.groupMapping;
                const allowedGroups = config.apartments.allowedGroups;

                mappingMsg += `📋 *Group Mapping:*\n`;
                if (Object.keys(groupMapping).length === 0) {
                    mappingMsg += `❌ Tidak ada mapping yang aktif!\n\n`;
                } else {
                    Object.entries(groupMapping).forEach(([groupId, apartmentName]) => {
                        mappingMsg += `- ${groupId}: "${apartmentName}"\n`;
                    });
                }

                mappingMsg += `\n✅ *Allowed Groups:*\n`;
                if (allowedGroups.length === 0) {
                    mappingMsg += `❌ Tidak ada grup yang diizinkan!\n\n`;
                } else {
                    allowedGroups.forEach(groupId => {
                        mappingMsg += `- ${groupId}\n`;
                    });
                }

                mappingMsg += `\n🔧 *Environment Variables:*\n`;
                mappingMsg += `- GROUP_SKYHOUSE_ID: ${process.env.GROUP_SKYHOUSE_ID}\n`;
                mappingMsg += `- GROUP_SKYHOUSE_NAME: ${process.env.GROUP_SKYHOUSE_NAME}\n`;
                mappingMsg += `- GROUP_SKYHOUSE_ENABLED: ${process.env.GROUP_SKYHOUSE_ENABLED}\n`;

                await bot.sendMessage(message.from, mappingMsg);
                logger.info('Mapping info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam mapping command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!forcereload')) {
            logger.info(`Memproses command forcereload dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !forcereload hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const fs = require('fs');
                const path = require('path');

                // Clear dotenv cache first
                delete require.cache[require.resolve('dotenv')];

                // Force reload dotenv with explicit path
                const envPath = path.join(process.cwd(), '.env');
                const dotenv = require('dotenv');
                const dotenvResult = dotenv.config({ path: envPath, override: true });

                logger.info(`Force reload dotenv result: ${dotenvResult.error ? 'Error: ' + dotenvResult.error.message : 'Success'}`);

                // Clear all config cache
                Object.keys(require.cache).forEach(key => {
                    if (key.includes('config')) {
                        delete require.cache[key];
                    }
                });

                // Reload config fresh
                require('./config/config.js');

                // Manual rebuild mapping dari environment variables
                const manualMapping = {};
                const groups = ['SKYHOUSE', 'TREEPARK', 'EMERALD', 'SPRINGWOOD', 'SERPONG', 'TOKYO', 'TESTER'];

                logger.info('Force reload: Checking environment variables...');
                groups.forEach(group => {
                    const id = process.env[`GROUP_${group}_ID`];
                    const name = process.env[`GROUP_${group}_NAME`];
                    const enabled = process.env[`GROUP_${group}_ENABLED`];

                    logger.info(`Force reload: ${group} - ID: ${id ? 'OK' : 'MISSING'}, NAME: ${name ? 'OK' : 'MISSING'}, ENABLED: ${enabled}`);

                    if (id && name && enabled === 'true') {
                        manualMapping[id] = name;
                        logger.info(`Force reload: Added mapping ${id} -> ${name}`);
                    }
                });

                // Update global config
                config.apartments.groupMapping = manualMapping;
                config.apartments.allowedGroups = Object.keys(manualMapping);

                let reloadMsg = `🔄 *Force Reload Berhasil!*\n\n`;
                reloadMsg += `📋 *Environment Variables Status:*\n`;

                groups.forEach(group => {
                    const id = process.env[`GROUP_${group}_ID`];
                    const name = process.env[`GROUP_${group}_NAME`];
                    const enabled = process.env[`GROUP_${group}_ENABLED`];

                    reloadMsg += `${group}: ${id ? '✅' : '❌'} ${name ? '✅' : '❌'} ${enabled === 'true' ? '✅' : '❌'}\n`;
                });

                reloadMsg += `\n🔧 *Manual Group Mapping (${Object.keys(manualMapping).length} entries):*\n`;
                Object.entries(manualMapping).forEach(([groupId, apartmentName]) => {
                    reloadMsg += `- ${groupId.substring(0, 20)}...: "${apartmentName}"\n`;
                });

                reloadMsg += `\n💡 *Next Steps:*\n`;
                reloadMsg += `- Test dengan !rekap dari grup\n`;
                reloadMsg += `- Cek !mapping untuk verifikasi\n`;
                reloadMsg += `- Monitor log untuk debug`;

                await bot.sendMessage(message.from, reloadMsg);
                logger.info('Force reload berhasil');
                logger.info(`Manual mapping: ${JSON.stringify(manualMapping, null, 2)}`);

            } catch (error) {
                logger.error('Error dalam forcereload command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
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
                const { instance: configInstance } = require('./config/config');

                // Rebuild mapping dan allowed groups
                const newGroupMapping = configInstance.buildGroupMapping();
                const newAllowedGroups = configInstance.buildAllowedGroups();

                // Update config global
                config.apartments.groupMapping = newGroupMapping;
                config.apartments.allowedGroups = newAllowedGroups;

                let reloadMsg = `✅ *Konfigurasi berhasil di-reload!*\n\n`;
                reloadMsg += `🔧 *Group Mapping (${Object.keys(newGroupMapping).length} entries):*\n`;
                Object.entries(newGroupMapping).forEach(([groupId, apartmentName]) => {
                    reloadMsg += `- ${groupId.substring(0, 25)}...: "${apartmentName}"\n`;
                });

                reloadMsg += `\n✅ *Allowed Groups (${newAllowedGroups.length} groups):*\n`;
                newAllowedGroups.forEach(groupId => {
                    reloadMsg += `- ${groupId.substring(0, 25)}...\n`;
                });

                await bot.sendMessage(message.from, reloadMsg);
                logger.info('Konfigurasi berhasil di-reload');
                logger.info(`New mapping: ${JSON.stringify(newGroupMapping, null, 2)}`);

            } catch (error) {
                logger.error('Error dalam reload command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!testsync')) {
            logger.info(`Memproses command testsync dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !testsync hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Ambil transaksi terbaru untuk testing
                const recentTransactions = await database.getLastTransactions(5);

                if (recentTransactions.length === 0) {
                    await bot.sendMessage(message.from, '❌ Tidak ada transaksi untuk testing.');
                    return;
                }

                let testMsg = `🔄 *Test Sinkronisasi Edit/Delete*\n\n`;
                testMsg += `📊 *5 Transaksi Terbaru:*\n`;

                recentTransactions.forEach((transaction, index) => {
                    testMsg += `${index + 1}. Message ID: ${transaction.message_id}\n`;
                    testMsg += `   Unit: ${transaction.unit}, CS: ${transaction.cs_name}\n`;
                    testMsg += `   Amount: ${transaction.amount.toLocaleString('id-ID')}\n`;
                    testMsg += `   Date: ${transaction.date_only}\n\n`;
                });

                testMsg += `🧪 *Cara test sinkronisasi:*\n`;
                testMsg += `1. **Edit Message**: Edit pesan booking di grup\n`;
                testMsg += `   → Bot akan update database otomatis\n`;
                testMsg += `   → Kirim konfirmasi perubahan\n\n`;
                testMsg += `2. **Delete Message**: Hapus pesan booking di grup\n`;
                testMsg += `   → Bot akan hapus data dari database\n`;
                testMsg += `   → Kirim notifikasi penghapusan\n\n`;
                testMsg += `3. **Cek Log**: Monitor log untuk detail proses\n`;
                testMsg += `4. **Verifikasi**: Gunakan !rekap untuk cek data`;

                await bot.sendMessage(message.from, testMsg);
                logger.info('Test sync info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam testsync command:', error);
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

        } else if (message.body.startsWith('!datetime')) {
            logger.info(`Memproses command datetime dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !datetime hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const moment = require('moment-timezone');
                const now = moment().tz('Asia/Jakarta');

                let debugMsg = `🕐 *Debug DateTime - Business Day Logic*\n\n`;
                debugMsg += `📅 *Current Time:*\n`;
                debugMsg += `- Jakarta Time: ${now.format('YYYY-MM-DD HH:mm:ss')}\n`;
                debugMsg += `- Hour: ${now.hour()}\n`;
                debugMsg += `- Is before 12:00? ${now.hour() < 12 ? 'Yes' : 'No'}\n\n`;

                // Business day logic
                let businessDay;
                if (now.hour() < 12) {
                    businessDay = now.clone().subtract(1, 'day');
                    debugMsg += `🏢 *Business Day (Before 12:00):*\n`;
                    debugMsg += `- Current business day: ${businessDay.format('DD/MM/YYYY')} (kemarin)\n`;
                } else {
                    businessDay = now.clone();
                    debugMsg += `🏢 *Business Day (After 12:00):*\n`;
                    debugMsg += `- Current business day: ${businessDay.format('DD/MM/YYYY')} (hari ini)\n`;
                }

                // Rekap range
                const startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                const endDate = businessDay.clone().add(1, 'day').format('YYYY-MM-DD') + ' 11:59:59';

                debugMsg += `\n📊 *Rekap Range:*\n`;
                debugMsg += `- Start: ${startDate}\n`;
                debugMsg += `- End: ${endDate}\n`;
                debugMsg += `- Display Date: ${businessDay.format('DD/MM/YYYY')}\n\n`;

                // Test specific date
                const testDate = '31072025';
                const day = testDate.substring(0, 2);
                const month = testDate.substring(2, 4);
                const year = testDate.substring(4, 8);

                // Gunakan moment untuk handle overflow tanggal dengan benar
                const testStartMoment = moment.tz(`${year}-${month}-${day}`, 'YYYY-MM-DD', 'Asia/Jakarta');
                const testEndMoment = testStartMoment.clone().add(1, 'day');

                const testStartDate = testStartMoment.format('YYYY-MM-DD') + ' 12:00:00';
                const testEndDate = testEndMoment.format('YYYY-MM-DD') + ' 11:59:59';

                debugMsg += `🧪 *Test Date (${testDate}):*\n`;
                debugMsg += `- Start: ${testStartDate}\n`;
                debugMsg += `- End: ${testEndDate}\n`;
                debugMsg += `- Next Day: ${testEndMoment.format('DD/MM/YYYY')}\n\n`;

                debugMsg += `💡 *Business Day Examples:*\n`;
                debugMsg += `- 31 Juli 2025 jam 00:14 → Business Day: 30 Juli 2025\n`;
                debugMsg += `- 31 Juli 2025 jam 11:59 → Business Day: 30 Juli 2025\n`;
                debugMsg += `- 31 Juli 2025 jam 12:00 → Business Day: 31 Juli 2025\n`;
                debugMsg += `- 31 Juli 2025 jam 23:59 → Business Day: 31 Juli 2025\n\n`;

                debugMsg += `📋 *Rekap Logic:*\n`;
                debugMsg += `- !rekap = data business day saat ini\n`;
                debugMsg += `- !rekap 30072025 = data 30 Juli 12:00 - 31 Juli 11:59\n`;
                debugMsg += `- Ganti hari/tanggal pada jam 12:00 siang`;

                await bot.sendMessage(message.from, debugMsg);
                logger.info('DateTime debug info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam datetime command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!testbusiness')) {
            logger.info(`Memproses command testbusiness dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !testbusiness hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                const moment = require('moment-timezone');

                let testMsg = `🏢 *Test Business Day Logic*\n\n`;

                // Test berbagai waktu pada tanggal 31 Juli 2025
                const testTimes = [
                    { hour: 0, minute: 14, desc: 'Tengah malam' },
                    { hour: 6, minute: 0, desc: 'Pagi' },
                    { hour: 11, minute: 59, desc: 'Sebelum jam 12' },
                    { hour: 12, minute: 0, desc: 'Tepat jam 12' },
                    { hour: 15, minute: 30, desc: 'Sore' },
                    { hour: 23, minute: 59, desc: 'Malam' }
                ];

                testTimes.forEach(time => {
                    const testTime = moment.tz('2025-07-31', 'YYYY-MM-DD', 'Asia/Jakarta')
                        .hour(time.hour).minute(time.minute).second(0);

                    let businessDay;
                    if (testTime.hour() < 12) {
                        businessDay = testTime.clone().subtract(1, 'day');
                    } else {
                        businessDay = testTime.clone();
                    }

                    testMsg += `⏰ *${time.desc} (${testTime.format('HH:mm')}):*\n`;
                    testMsg += `   Business Day: ${businessDay.format('DD/MM/YYYY')}\n`;
                    testMsg += `   Rekap Range: ${businessDay.format('DD/MM')} 12:00 - ${businessDay.clone().add(1, 'day').format('DD/MM')} 11:59\n\n`;
                });

                testMsg += `💡 *Kesimpulan:*\n`;
                testMsg += `- Sebelum jam 12:00 = masih business day kemarin\n`;
                testMsg += `- Setelah jam 12:00 = sudah business day hari ini\n`;
                testMsg += `- Ganti business day tepat jam 12:00 siang`;

                await bot.sendMessage(message.from, testMsg);
                logger.info('Test business day info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam testbusiness command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!debugmsg')) {
            logger.info(`Memproses command debugmsg dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !debugmsg hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Ambil parameter apartemen jika ada
                const parts = message.body.split(' ');
                let targetApartment = null;

                if (parts.length > 1) {
                    targetApartment = findApartmentByPartialName(parts[1]);
                }

                // Ambil transaksi terbaru untuk apartemen tertentu atau semua
                const recentTransactions = await database.getLastTransactions(5);
                const filteredTransactions = targetApartment ?
                    recentTransactions.filter(t => t.location === targetApartment) :
                    recentTransactions;

                let debugMsg = `🔍 *Debug Message ID & Transaksi*\n\n`;

                if (filteredTransactions.length === 0) {
                    debugMsg += `❌ Tidak ada transaksi${targetApartment ? ` untuk ${targetApartment}` : ''}`;
                } else {
                    debugMsg += `📊 *${filteredTransactions.length} Transaksi Terbaru${targetApartment ? ` - ${targetApartment}` : ''}:*\n\n`;

                    filteredTransactions.forEach((transaction, index) => {
                        debugMsg += `${index + 1}. **${transaction.location}**\n`;
                        debugMsg += `   Unit: ${transaction.unit}\n`;
                        debugMsg += `   CS: ${transaction.cs_name}\n`;
                        debugMsg += `   Amount: ${transaction.amount.toLocaleString('id-ID')}\n`;
                        debugMsg += `   Date: ${transaction.date_only}\n`;
                        debugMsg += `   Created: ${transaction.created_at}\n`;
                        debugMsg += `   Message ID: \`${transaction.message_id}\`\n`;
                        debugMsg += `   ID Length: ${transaction.message_id ? transaction.message_id.length : 'null'}\n\n`;
                    });

                    debugMsg += `💡 *Tips untuk Debug:*\n`;
                    debugMsg += `- Edit/hapus pesan booking di grup\n`;
                    debugMsg += `- Cek log untuk melihat message ID format\n`;
                    debugMsg += `- Bandingkan dengan message ID di database\n`;
                    debugMsg += `- Gunakan !rawdata untuk lihat semua data`;
                }

                await bot.sendMessage(message.from, debugMsg);
                logger.info('Debug message ID info berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam debugmsg command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!forcedelete')) {
            logger.info(`Memproses command forcedelete dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !forcedelete hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Format: !forcedelete unit cs_name
                // Contoh: !forcedelete L3/30N dreamy
                const parts = message.body.split(' ');

                if (parts.length < 3) {
                    await bot.sendMessage(message.from, `❌ Format salah. Gunakan: !forcedelete unit cs_name\nContoh: !forcedelete L3/30N dreamy`);
                    return;
                }

                const unit = parts[1];
                const csName = parts[2];

                // Cari transaksi berdasarkan unit dan CS name
                const moment = require('moment-timezone');
                const today = moment().tz('Asia/Jakarta');

                // Business day logic
                let businessDay;
                if (today.hour() < 12) {
                    businessDay = today.clone().subtract(1, 'day');
                } else {
                    businessDay = today.clone();
                }

                const startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                const endDate = businessDay.clone().add(1, 'day').format('YYYY-MM-DD') + ' 11:59:59';

                // Cari transaksi
                const transactions = await database.getTransactionsByDateRange(startDate, endDate);
                const targetTransaction = transactions.find(t =>
                    t.unit.toLowerCase() === unit.toLowerCase() &&
                    t.cs_name.toLowerCase() === csName.toLowerCase()
                );

                if (targetTransaction) {
                    // Hapus transaksi
                    await database.deleteTransaction(targetTransaction.id);

                    // Hapus dari processed messages jika ada
                    if (targetTransaction.message_id) {
                        await database.removeProcessedMessage(targetTransaction.message_id);
                    }

                    const confirmMsg = `✅ *Transaksi berhasil dihapus paksa*\n` +
                        `📝 Unit: ${targetTransaction.unit}\n` +
                        `👤 CS: ${targetTransaction.cs_name}\n` +
                        `💰 Amount: ${targetTransaction.amount.toLocaleString('id-ID')}\n` +
                        `📅 Date: ${targetTransaction.date_only}\n` +
                        `🔑 Message ID: ${targetTransaction.message_id || 'N/A'}\n` +
                        `⚠️ Data telah dihapus dari sistem`;

                    await bot.sendMessage(message.from, confirmMsg);
                    logger.info(`Force delete berhasil: Unit ${unit}, CS ${csName}`);
                } else {
                    await bot.sendMessage(message.from, `❌ Tidak ditemukan transaksi dengan Unit: ${unit}, CS: ${csName} pada business day ${businessDay.format('DD/MM/YYYY')}`);
                }

            } catch (error) {
                logger.error('Error dalam forcedelete command:', error);
                await bot.sendMessage(message.from, `❌ Terjadi error: ${error.message}`);
            }

        } else if (message.body.startsWith('!rawdata')) {
            logger.info(`Memproses command rawdata dari ${message.from}: ${message.body}`);

            // Hanya bisa dipanggil dari private message untuk keamanan
            const isFromGroup = message.from.includes('@g.us');
            if (isFromGroup) {
                await bot.sendMessage(message.from, '❌ Command !rawdata hanya bisa digunakan melalui pesan pribadi untuk keamanan.');
                return;
            }

            try {
                // Ambil 10 transaksi terbaru
                const recentTransactions = await database.getLastTransactions(10);

                let rawMsg = `📊 *Raw Data - 10 Transaksi Terbaru*\n\n`;

                if (recentTransactions.length === 0) {
                    rawMsg += `❌ Tidak ada transaksi di database`;
                } else {
                    recentTransactions.forEach((transaction, index) => {
                        rawMsg += `${index + 1}. **${transaction.location}**\n`;
                        rawMsg += `   Unit: ${transaction.unit}\n`;
                        rawMsg += `   CS: ${transaction.cs_name}\n`;
                        rawMsg += `   Amount: ${transaction.amount.toLocaleString('id-ID')}\n`;
                        rawMsg += `   Date: ${transaction.date_only}\n`;
                        rawMsg += `   Created: ${transaction.created_at}\n`;
                        rawMsg += `   Message ID: ${transaction.message_id}\n\n`;
                    });

                    // Statistik per lokasi
                    const locationStats = {};
                    recentTransactions.forEach(t => {
                        locationStats[t.location] = (locationStats[t.location] || 0) + 1;
                    });

                    rawMsg += `📈 *Statistik per Lokasi:*\n`;
                    Object.entries(locationStats).forEach(([location, count]) => {
                        rawMsg += `- ${location}: ${count} transaksi\n`;
                    });
                }

                await bot.sendMessage(message.from, rawMsg);
                logger.info('Raw data berhasil dikirim');

            } catch (error) {
                logger.error('Error dalam rawdata command:', error);
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
        'tokyo': 'TOKYO PIK 2',
        'testing': 'TESTING BOT',
        'test': 'TESTING BOT'
    };

    return keywords[searchTerm] || null;
}

// Helper functions untuk Excel export
function calculateCSSummaryFromTransactions(transactions) {
    const csSummary = {};

    transactions.forEach(transaction => {
        const csName = transaction.cs_name || 'Unknown';
        if (!csSummary[csName]) {
            csSummary[csName] = {
                cs_name: csName,
                total_bookings: 0,
                total_amount: 0,
                total_commission: 0
            };
        }

        csSummary[csName].total_bookings += 1;
        csSummary[csName].total_amount += parseFloat(transaction.amount || 0);
        csSummary[csName].total_commission += parseFloat(transaction.commission || 0);
    });

    return Object.values(csSummary);
}

function calculateMarketingCommissionFromTransactions(transactions) {
    const marketingCommission = {};

    transactions.forEach(transaction => {
        const csName = transaction.cs_name || 'Unknown';
        // Skip APK dan AMEL (bukan marketing)
        if (csName.toLowerCase() !== 'apk' && csName.toLowerCase() !== 'amel') {
            if (!marketingCommission[csName]) {
                marketingCommission[csName] = {
                    cs_name: csName,
                    booking_count: 0,
                    total_commission: 0
                };
            }

            marketingCommission[csName].booking_count += 1;
            marketingCommission[csName].total_commission += parseFloat(transaction.commission || 0);
        }
    });

    return Object.values(marketingCommission);
}

async function createTransactionsSheetForExport(workbook, transactions, displayDate, apartmentName) {
    const worksheet = workbook.addWorksheet('Transaksi');

    // Title
    const titleText = apartmentName ?
        `Detail Transaksi ${apartmentName} - ${displayDate}` :
        `Detail Transaksi - ${displayDate}`;
    worksheet.addRow([titleText]);
    worksheet.mergeCells('A1:J1');
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
        'No', 'Tanggal', 'Waktu', 'Apartemen', 'Unit', 'Check Out', 'Durasi', 'Payment', 'Amount', 'CS', 'Komisi'
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
    };

    // Column widths
    worksheet.columns = [
        { width: 5 },   // No
        { width: 12 },  // Tanggal
        { width: 8 },   // Waktu
        { width: 20 },  // Apartemen
        { width: 12 },  // Unit
        { width: 10 },  // Check Out
        { width: 10 },  // Durasi
        { width: 12 },  // Payment
        { width: 15 },  // Amount
        { width: 15 },  // CS
        { width: 15 }   // Komisi
    ];

    // Add data
    if (transactions && transactions.length > 0) {
        transactions.forEach((transaction, index) => {
            const moment = require('moment-timezone');
            const createdAt = moment(transaction.created_at).tz('Asia/Jakarta');
            const row = worksheet.addRow([
                index + 1,
                createdAt.format('DD/MM/YYYY'),
                createdAt.format('HH:mm'),
                transaction.location || '-',
                transaction.unit || '-',
                transaction.checkout_time || '-',
                transaction.duration || '-',
                transaction.payment_method || '-',
                parseFloat(transaction.amount || 0),
                transaction.cs_name || '-',
                parseFloat(transaction.commission || 0)
            ]);

            // Format currency columns
            row.getCell(9).numFmt = 'Rp #,##0';  // Amount
            row.getCell(11).numFmt = 'Rp #,##0'; // Komisi
        });

        // Add totals row
        const totalRow = worksheet.addRow([
            '', '', '', '', '', '', '', 'TOTAL:',
            { formula: `SUM(I4:I${3 + transactions.length})` },
            '',
            { formula: `SUM(K4:K${3 + transactions.length})` }
        ]);

        totalRow.font = { bold: true };
        totalRow.getCell(9).numFmt = 'Rp #,##0';
        totalRow.getCell(11).numFmt = 'Rp #,##0';
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
        };
    } else {
        worksheet.addRow(['Tidak ada transaksi pada periode ini']);
        worksheet.mergeCells('A4:K4');
        const noDataRow = worksheet.getRow(4);
        noDataRow.alignment = { horizontal: 'center' };
        noDataRow.font = { italic: true };
    }
}

async function createCSSummarySheetForExport(workbook, csSummary, displayDate, apartmentName) {
    const worksheet = workbook.addWorksheet('Ringkasan CS');

    // Title
    const titleText = apartmentName ?
        `Ringkasan Performa CS ${apartmentName} - ${displayDate}` :
        `Ringkasan Performa CS - ${displayDate}`;
    worksheet.addRow([titleText]);
    worksheet.mergeCells('A1:D1');
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow(['CS Name', 'Total Booking', 'Total Amount', 'Total Komisi']);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
    };

    // Column widths
    worksheet.columns = [
        { width: 20 }, // CS Name
        { width: 15 }, // Total Booking
        { width: 20 }, // Total Amount
        { width: 20 }  // Total Komisi
    ];

    // Add data
    if (csSummary && csSummary.length > 0) {
        csSummary.forEach(cs => {
            const row = worksheet.addRow([
                cs.cs_name,
                cs.total_bookings,
                cs.total_amount,
                cs.total_commission
            ]);

            // Format currency columns
            row.getCell(3).numFmt = 'Rp #,##0';
            row.getCell(4).numFmt = 'Rp #,##0';
        });

        // Add totals row
        const totalRow = worksheet.addRow([
            'TOTAL:',
            { formula: `SUM(B4:B${3 + csSummary.length})` },
            { formula: `SUM(C4:C${3 + csSummary.length})` },
            { formula: `SUM(D4:D${3 + csSummary.length})` }
        ]);

        totalRow.font = { bold: true };
        totalRow.getCell(3).numFmt = 'Rp #,##0';
        totalRow.getCell(4).numFmt = 'Rp #,##0';
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
        };
    } else {
        worksheet.addRow(['Tidak ada data CS pada periode ini']);
        worksheet.mergeCells('A4:D4');
        const noDataRow = worksheet.getRow(4);
        noDataRow.alignment = { horizontal: 'center' };
        noDataRow.font = { italic: true };
    }
}

async function createCommissionSheetForExport(workbook, marketingCommission, displayDate, apartmentName) {
    const worksheet = workbook.addWorksheet('Komisi Marketing');

    // Title
    const titleText = apartmentName ?
        `Komisi Marketing ${apartmentName} - ${displayDate}` :
        `Komisi Marketing - ${displayDate}`;
    worksheet.addRow([titleText]);
    worksheet.mergeCells('A1:C1');
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow(['CS Name', 'Jumlah Booking', 'Total Komisi']);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
    };

    // Column widths
    worksheet.columns = [
        { width: 20 }, // CS Name
        { width: 15 }, // Jumlah Booking
        { width: 20 }  // Total Komisi
    ];

    // Add data
    if (marketingCommission && marketingCommission.length > 0) {
        marketingCommission.forEach(cs => {
            const row = worksheet.addRow([
                cs.cs_name,
                cs.booking_count,
                cs.total_commission
            ]);

            // Format currency column
            row.getCell(3).numFmt = 'Rp #,##0';
        });

        // Add totals row
        const totalRow = worksheet.addRow([
            'TOTAL:',
            { formula: `SUM(B4:B${3 + marketingCommission.length})` },
            { formula: `SUM(C4:C${3 + marketingCommission.length})` }
        ]);

        totalRow.font = { bold: true };
        totalRow.getCell(3).numFmt = 'Rp #,##0';
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
        };
    } else {
        worksheet.addRow(['Tidak ada data komisi marketing pada periode ini']);
        worksheet.mergeCells('A4:C4');
        const noDataRow = worksheet.getRow(4);
        noDataRow.alignment = { horizontal: 'center' };
        noDataRow.font = { italic: true };
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
