// Modul WhatsApp Bot
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config.js');
const logger = require('./logger');
const database = require('./database');

class WhatsAppBot {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.messageHandlers = [];
    }

    initialize() {
        // Initialize WhatsApp client with authentication strategy
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "bot-kr-session"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventHandlers();
        return this.client.initialize();
    }

    setupEventHandlers() {
        // QR Code event
        this.client.on('qr', (qr) => {
            console.log('\n=== WhatsApp Bot QR Code ===');
            console.log('Scan this QR code with your WhatsApp mobile app:');
            qrcode.generate(qr, { small: true });
            logger.info('QR Code dibuat untuk autentikasi WhatsApp');
        });

        // Ready event
        this.client.on('ready', async () => {
            this.isReady = true;
            console.log('\n✅ WhatsApp Bot siap dan terhubung!');
            logger.info('WhatsApp Bot berhasil terhubung');

            // Tampilkan daftar grup
            await this.displayGroupList();

            // Proses pesan yang tertinggal dari jam 12:00 WIB hari ini
            await this.processBacklogMessages();
        });

        // Authentication success
        this.client.on('authenticated', () => {
            logger.info('Autentikasi WhatsApp berhasil');
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            logger.error('Autentikasi WhatsApp gagal:', msg);
        });

        // Disconnected event
        this.client.on('disconnected', (reason) => {
            this.isReady = false;
            logger.warn('Bot WhatsApp terputus:', reason);
        });

        // Message event with edit detection
        this.client.on('message', async (message) => {
            try {
                // Skip if message is from status broadcast
                if (message.from === 'status@broadcast') {
                    return;
                }

                // Check if this message ID already exists in our processed messages
                // If it does, it might be an edited message (though this is not perfect)
                const wasProcessed = await this.checkIfMessageWasEdited(message);

                // Process message through registered handlers
                for (const handler of this.messageHandlers) {
                    await handler(message, wasProcessed); // wasProcessed = potential edit flag
                }
            } catch (error) {
                logger.error('Error memproses pesan:', error);
            }
        });

        // Message revoke event - Handle message deletion
        this.client.on('message_revoke_everyone', async (_, before) => {
            try {
                if (before) {
                    logger.info(`Pesan dihapus untuk semua: ${before.id.id}`);
                    await this.handleDeletedMessage(before);
                }
            } catch (error) {
                logger.error('Error memproses pesan yang dihapus:', error);
            }
        });

        // Message revoke for me event - Handle message deletion for sender only
        this.client.on('message_revoke_me', async (message) => {
            try {
                logger.info(`Pesan dihapus untuk pengirim: ${message.id.id}`);
                // Tidak perlu hapus dari database karena hanya dihapus untuk pengirim
            } catch (error) {
                logger.error('Error memproses pesan yang dihapus untuk pengirim:', error);
            }
        });

        // Group join event
        this.client.on('group_join', (notification) => {
            logger.info(`Bot bergabung ke grup: ${notification.chatId}`);
        });

        // Error event
        this.client.on('error', (error) => {
            logger.error('Error klien WhatsApp:', error);
        });
    }

    /**
     * Tampilkan daftar grup dan ID-nya
     */
    async displayGroupList() {
        try {
            const chats = await this.client.getChats();
            const groups = chats.filter(chat => chat.isGroup);

            console.log('\n📋 Daftar Grup WhatsApp:');
            console.log('========================');

            if (groups.length === 0) {
                console.log('Tidak ada grup ditemukan.');
                return;
            }

            groups.forEach((group, index) => {
                console.log(`${index + 1}. ${group.name}`);
                console.log(`   ID: ${group.id._serialized}`);
                console.log(`   Anggota: ${group.participants ? group.participants.length : 'Unknown'}`);
                console.log('');
            });

            logger.info(`Ditemukan ${groups.length} grup WhatsApp`);
        } catch (error) {
            logger.error('Error menampilkan daftar grup:', error);
        }
    }

    /**
     * Dapatkan nama grup dari chat ID
     */
    async getGroupName(chatId) {
        try {
            const chat = await this.client.getChatById(chatId);
            if (chat.isGroup) {
                return chat.name;
            }
            return null;
        } catch (error) {
            logger.error('Error mendapatkan nama grup:', error);
            return null;
        }
    }

    /**
     * Dapatkan nama apartemen berdasarkan ID grup
     */
    getApartmentName(groupId) {
        if (!groupId) {
            logger.warn('getApartmentName: groupId is null/undefined');
            return config.apartments.defaultApartment;
        }

        // Debug logging
        logger.info(`getApartmentName: Looking for groupId "${groupId}"`);
        logger.info(`getApartmentName: Available mappings: ${JSON.stringify(Object.keys(config.apartments.groupMapping))}`);
        logger.info(`getApartmentName: Full mapping object: ${JSON.stringify(config.apartments.groupMapping)}`);

        // Debug: Cek apakah config sudah di-load dengan benar
        if (!config.apartments.groupMapping || Object.keys(config.apartments.groupMapping).length === 0) {
            logger.error('getApartmentName: Group mapping is empty! Trying to reload config...');

            // Force reload config
            try {
                // Reload dotenv first
                require('dotenv').config();

                delete require.cache[require.resolve('../config/config.js')];
                const freshConfig = require('../config/config.js');

                logger.info(`getApartmentName: Fresh config loaded. New mappings: ${JSON.stringify(Object.keys(freshConfig.apartments.groupMapping))}`);

                // Update global config
                config.apartments.groupMapping = freshConfig.apartments.groupMapping;
                config.apartments.allowedGroups = freshConfig.apartments.allowedGroups;

                // Try again with fresh config
                const apartmentName = config.apartments.groupMapping[groupId];
                if (apartmentName) {
                    logger.info(`getApartmentName: Found mapping after reload "${groupId}" -> "${apartmentName}"`);
                    return apartmentName;
                }
            } catch (error) {
                logger.error('getApartmentName: Error reloading config:', error);
            }
        }

        // Cek mapping grup ID ke apartemen
        const apartmentName = config.apartments.groupMapping[groupId];
        if (apartmentName) {
            logger.info(`getApartmentName: Found mapping "${groupId}" -> "${apartmentName}"`);
            return apartmentName;
        }

        // Jika tidak ada mapping, return default
        logger.warn(`getApartmentName: No mapping found for "${groupId}", using default: "${config.apartments.defaultApartment}"`);
        return config.apartments.defaultApartment;
    }

    /**
     * Cek apakah grup diizinkan untuk menggunakan bot berdasarkan ID grup
     */
    isGroupAllowed(groupId) {
        if (!groupId) return false;

        // Jika tidak ada konfigurasi allowedGroups, izinkan semua
        if (!config.apartments.allowedGroups || config.apartments.allowedGroups.length === 0) {
            return true;
        }

        return config.apartments.allowedGroups.includes(groupId);
    }

    /**
     * Cek apakah nomor adalah owner yang diizinkan
     */
    isOwner(phoneNumber) {
        if (!phoneNumber) {
            logger.warn('isOwner: phoneNumber is null/undefined');
            return false;
        }

        // Bersihkan nomor dari format WhatsApp (hapus @c.us)
        const cleanNumber = phoneNumber.replace('@c.us', '');

        // Debug logging
        logger.info(`isOwner: Checking number "${cleanNumber}"`);
        logger.info(`isOwner: Allowed numbers: ${JSON.stringify(config.owner.allowedNumbers)}`);

        // Cek apakah config owner ada
        if (!config.owner || !config.owner.allowedNumbers) {
            logger.error('isOwner: Owner config is missing! Trying to reload...');

            try {
                // Reload dotenv and config
                require('dotenv').config();
                delete require.cache[require.resolve('../config/config.js')];
                const freshConfig = require('../config/config.js');

                // Update global config
                config.owner = freshConfig.owner;

                logger.info(`isOwner: Fresh config loaded. New owner numbers: ${JSON.stringify(freshConfig.owner.allowedNumbers)}`);
            } catch (error) {
                logger.error('isOwner: Error reloading config:', error);
                return false;
            }
        }

        // Cek apakah nomor ada di daftar owner
        const isOwnerResult = config.owner.allowedNumbers.includes(cleanNumber);
        logger.info(`isOwner: Result for "${cleanNumber}": ${isOwnerResult}`);

        return isOwnerResult;
    }

    /**
     * Handle deleted message - remove from database if it was a booking message
     */
    async handleDeletedMessage(deletedMessage) {
        try {
            const database = require('./database');

            logger.info(`Menangani pesan yang dihapus: ${deletedMessage.id.id}`);
            logger.info(`Message ID format: ${JSON.stringify(deletedMessage.id)}`);

            // Cek apakah ada transaksi dengan message ID ini
            const existingTransaction = await database.getTransactionByMessageId(deletedMessage.id.id);

            if (existingTransaction) {
                logger.info(`Transaksi ditemukan untuk pesan yang dihapus: Unit ${existingTransaction.unit}, CS ${existingTransaction.cs_name}`);

                // Hapus transaksi dari database
                await database.deleteTransactionByMessageId(deletedMessage.id.id);

                // Hapus dari processed messages
                await database.removeProcessedMessage(deletedMessage.id.id);

                logger.info(`Transaksi berhasil dihapus dari database: ${deletedMessage.id.id}`);

                // Kirim notifikasi ke grup bahwa transaksi dihapus
                if (deletedMessage.from && deletedMessage.from.includes('@g.us')) {
                    const notificationMsg = `🗑️ *Transaksi dihapus*\n` +
                        `📝 Unit: ${existingTransaction.unit}\n` +
                        `👤 CS: ${existingTransaction.cs_name}\n` +
                        `💰 Amount: ${existingTransaction.amount.toLocaleString('id-ID')}\n` +
                        `⚠️ Data telah dihapus dari sistem`;

                    await this.sendMessage(deletedMessage.from, notificationMsg);
                }
            } else {
                logger.info(`Tidak ada transaksi untuk pesan yang dihapus: ${deletedMessage.id.id}`);

                // Debug: Cari transaksi dengan message ID yang mirip
                const recentTransactions = await database.getLastTransactions(10);
                logger.info(`Debug: 10 transaksi terbaru dengan message ID:`);
                recentTransactions.forEach(t => {
                    logger.info(`  - Unit: ${t.unit}, CS: ${t.cs_name}, Message ID: ${t.message_id}`);
                });

                // Cek apakah ada transaksi dengan format message ID yang berbeda
                const alternativeFormats = [
                    deletedMessage.id._serialized,
                    deletedMessage.id.id,
                    `${deletedMessage.id.remote}_${deletedMessage.id.id}`,
                    deletedMessage.id.remote + '_' + deletedMessage.id.id
                ];

                logger.info(`Debug: Mencoba format message ID alternatif:`);
                for (const altId of alternativeFormats) {
                    if (altId) {
                        logger.info(`  - Trying: ${altId}`);
                        const altTransaction = await database.getTransactionByMessageId(altId);
                        if (altTransaction) {
                            logger.info(`  - FOUND with alternative ID: ${altId}`);
                            // Hapus dengan ID alternatif
                            await database.deleteTransactionByMessageId(altId);
                            await database.removeProcessedMessage(altId);

                            // Kirim notifikasi
                            if (deletedMessage.from && deletedMessage.from.includes('@g.us')) {
                                const notificationMsg = `🗑️ *Transaksi dihapus*\n` +
                                    `📝 Unit: ${altTransaction.unit}\n` +
                                    `👤 CS: ${altTransaction.cs_name}\n` +
                                    `💰 Amount: ${altTransaction.amount.toLocaleString('id-ID')}\n` +
                                    `⚠️ Data telah dihapus dari sistem`;

                                await this.sendMessage(deletedMessage.from, notificationMsg);
                            }
                            return;
                        }
                    }
                }

                logger.warn(`Tidak dapat menemukan transaksi untuk pesan yang dihapus dengan format ID apapun`);
            }

        } catch (error) {
            logger.error('Error handling deleted message:', error);
        }
    }

    /**
     * Check if message was potentially edited by comparing with processed messages
     */
    async checkIfMessageWasEdited(message) {
        try {
            const database = require('./database');

            // Cek apakah message ID ini sudah pernah diproses
            const wasProcessed = await database.isMessageProcessed(message.id.id);

            if (wasProcessed) {
                // Cek apakah ada transaksi dengan message ID ini
                const existingTransaction = await database.getTransactionByMessageId(message.id.id);

                if (existingTransaction) {
                    // Parse pesan saat ini untuk membandingkan dengan data yang tersimpan
                    const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
                    if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
                        // Bandingkan data untuk mendeteksi perubahan
                        const messageParser = require('./messageParser');
                        const apartmentName = this.getApartmentName(message.from);
                        const parseResult = messageParser.parseBookingMessage(message.body, message.id.id, apartmentName);

                        if (parseResult.status === 'VALID') {
                            const newData = parseResult.data;

                            // Bandingkan data kunci untuk mendeteksi perubahan
                            const hasChanges = (
                                existingTransaction.unit !== newData.unit ||
                                existingTransaction.checkout_time !== newData.checkoutTime ||
                                existingTransaction.amount !== newData.amount ||
                                existingTransaction.cs_name !== newData.csName ||
                                existingTransaction.payment_method !== newData.paymentMethod
                            );

                            if (hasChanges) {
                                logger.info(`Perubahan terdeteksi pada pesan: ${message.id.id}`);
                                return true;
                            }
                        }
                    }
                }
            }

            return false;
        } catch (error) {
            logger.error('Error checking if message was edited:', error);
            return false;
        }
    }

    // Register message handler
    addMessageHandler(handler) {
        if (typeof handler === 'function') {
            this.messageHandlers.push(handler);
        }
    }

    // Send message to specific chat
    async sendMessage(chatId, message) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready');
            }

            const chat = await this.client.getChatById(chatId);
            await chat.sendMessage(message);
            logger.info(`Message sent to ${chatId}`);
            return true;
        } catch (error) {
            logger.error(`Error sending message to ${chatId}:`, error);
            return false;
        }
    }

    // Send message to configured group (legacy - untuk backward compatibility)
    async sendToGroup(message) {
        if (!config.groupChatId) {
            logger.error('Group chat ID not configured');
            return false;
        }
        return await this.sendMessage(config.groupChatId, message);
    }

    // Send message to all enabled groups
    async sendToAllEnabledGroups(message) {
        try {
            if (!config.apartments.allowedGroups || config.apartments.allowedGroups.length === 0) {
                logger.error('No enabled groups configured');
                return false;
            }

            let successCount = 0;
            let totalGroups = config.apartments.allowedGroups.length;

            logger.info(`Mengirim pesan ke ${totalGroups} grup yang enabled...`);

            for (const groupId of config.apartments.allowedGroups) {
                try {
                    const success = await this.sendMessage(groupId, message);
                    if (success) {
                        successCount++;
                        const groupName = config.apartments.groupMapping[groupId] || 'Unknown';
                        logger.info(`✅ Pesan berhasil dikirim ke grup: ${groupName} (${groupId})`);
                    } else {
                        const groupName = config.apartments.groupMapping[groupId] || 'Unknown';
                        logger.error(`❌ Gagal mengirim pesan ke grup: ${groupName} (${groupId})`);
                    }

                    // Delay antar pengiriman untuk menghindari rate limiting
                    await new Promise(resolve => setTimeout(resolve, config.whatsapp.messageDelay || 1000));
                } catch (error) {
                    const groupName = config.apartments.groupMapping[groupId] || 'Unknown';
                    logger.error(`Error mengirim pesan ke grup ${groupName} (${groupId}):`, error);
                }
            }

            logger.info(`Pengiriman selesai: ${successCount}/${totalGroups} grup berhasil`);
            return successCount > 0;
        } catch (error) {
            logger.error('Error dalam sendToAllEnabledGroups:', error);
            return false;
        }
    }

    // Get chat information
    async getChatInfo(chatId) {
        try {
            const chat = await this.client.getChatById(chatId);
            return {
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                participantCount: chat.participants ? chat.participants.length : 0
            };
        } catch (error) {
            logger.error(`Error getting chat info for ${chatId}:`, error);
            return null;
        }
    }

    // Get all chats
    async getAllChats() {
        try {
            const chats = await this.client.getChats();
            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount
            }));
        } catch (error) {
            logger.error('Error getting chats:', error);
            return [];
        }
    }

    // Check if client is ready
    isClientReady() {
        return this.isReady;
    }

    // Get client info
    async getClientInfo() {
        try {
            if (!this.isReady) {
                return null;
            }

            const info = this.client.info;
            return {
                wid: info.wid._serialized,
                pushname: info.pushname,
                phone: info.wid.user
            };
        } catch (error) {
            logger.error('Error getting client info:', error);
            return null;
        }
    }

    /**
     * Mulai WhatsApp bot
     */
    async start() {
        try {
            logger.info('Memulai WhatsApp Bot...');
            await this.client.initialize();
        } catch (error) {
            logger.error('Gagal memulai WhatsApp Bot:', error);
            throw error;
        }
    }

    // Graceful shutdown
    /**
     * Cek apakah bot adalah admin di grup
     */
    async isBotAdmin(chatId) {
        try {
            const chat = await this.client.getChatById(chatId);
            if (!chat.isGroup) return false;

            const participants = await chat.participants;
            const botNumber = this.client.info.wid._serialized;

            const botParticipant = participants.find(p => p.id._serialized === botNumber);
            return botParticipant && botParticipant.isAdmin;
        } catch (error) {
            logger.error('Error checking admin status:', error);
            return false;
        }
    }

    /**
     * Hapus pesan (jika bot admin)
     */
    async deleteMessage(message) {
        try {
            const isAdmin = await this.isBotAdmin(message.from);
            if (isAdmin) {
                await message.delete(true); // true = delete for everyone
                logger.info(`Pesan dihapus: ${message.id._serialized}`);
                return true;
            } else {
                logger.warn('Bot bukan admin, tidak bisa hapus pesan');
                return false;
            }
        } catch (error) {
            logger.error('Error deleting message:', error);
            return false;
        }
    }

    /**
     * Kirim pesan dengan mention
     */
    async sendMessageWithMention(chatId, text, mentionedUser) {
        try {
            const mentions = [mentionedUser];
            await this.client.sendMessage(chatId, text, { mentions });
            logger.info(`Pesan dengan mention dikirim ke ${chatId}`);
            return true;
        } catch (error) {
            logger.error('Error sending message with mention:', error);
            return false;
        }
    }

    /**
     * Kirim pesan biasa
     */
    async sendMessage(chatId, text) {
        try {
            await this.client.sendMessage(chatId, text);
            logger.info(`Pesan dikirim ke ${chatId}`);
            return true;
        } catch (error) {
            logger.error('Error sending message:', error);
            return false;
        }
    }

    /**
     * Proses pesan yang tertinggal dari jam 12:00 WIB hari ini
     */
    async processBacklogMessages() {
        try {
            logger.info('Memulai pemrosesan pesan yang tertinggal...');

            const moment = require('moment-timezone');
            const now = moment().tz('Asia/Jakarta');
            const todayStart = now.clone().hour(12).minute(0).second(0);

            // Jika sekarang masih sebelum jam 12:00, skip
            if (now.isBefore(todayStart)) {
                logger.info('Belum jam 12:00 WIB, skip pemrosesan backlog');
                return;
            }

            logger.info(`Mencari pesan dari ${todayStart.format('YYYY-MM-DD HH:mm:ss')} hingga sekarang`);

            // Ambil semua chat yang diizinkan
            const chats = await this.client.getChats();
            let processedCount = 0;

            for (const chat of chats) {
                // Skip jika bukan grup yang diizinkan
                if (!chat.isGroup || (config.allowedGroups && !config.allowedGroups.includes(chat.id._serialized))) {
                    continue;
                }

                try {
                    // Ambil pesan dari jam 12:00 WIB hari ini
                    const messages = await chat.fetchMessages({
                        limit: 100,
                        fromMe: false
                    });

                    for (const message of messages) {
                        const messageTime = moment.unix(message.timestamp).tz('Asia/Jakarta');

                        // Skip jika pesan sebelum jam 12:00 WIB hari ini
                        if (messageTime.isBefore(todayStart)) {
                            continue;
                        }

                        // Cek apakah pesan memiliki format booking (baris kedua mengandung "Unit")
                        const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
                        if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
                            try {
                                // Parse pesan untuk mendapatkan data transaksi
                                const MessageParser = require('./messageParser');
                                const parseResult = MessageParser.parseBookingMessage(message.body, message.id._serialized);

                                if (parseResult.status === 'VALID') {
                                    const data = parseResult.data;

                                    // Cek apakah transaksi sudah ada di database
                                    const exists = await database.isTransactionExists(
                                        data.unit,
                                        data.dateOnly,
                                        data.csName,
                                        data.checkoutTime
                                    );

                                    if (!exists) {
                                        logger.info(`Memproses pesan tertinggal: ${message.id._serialized} - Unit: ${data.unit}, CS: ${data.csName}`);

                                        // Simpan transaksi ke database
                                        await database.saveTransaction(data);
                                        await database.markMessageProcessed(message.id._serialized, message.from);
                                        logger.info('Transaksi tertinggal berhasil disimpan');

                                        processedCount++;
                                    } else {
                                        logger.info(`Transaksi sudah ada, skip: Unit ${data.unit}, CS ${data.csName}`);
                                    }
                                }
                            } catch (parseError) {
                                logger.error(`Error parsing pesan tertinggal ${message.id._serialized}:`, parseError);
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`Error memproses chat ${chat.name}:`, error);
                }
            }

            logger.info(`Selesai memproses ${processedCount} pesan yang tertinggal`);

        } catch (error) {
            logger.error('Error memproses pesan yang tertinggal:', error);
        }
    }

    async destroy() {
        try {
            if (this.client) {
                await this.client.destroy();
                this.isReady = false;
                logger.info('WhatsApp client berhasil dihancurkan');
            }
        } catch (error) {
            logger.error('Error menghancurkan WhatsApp client:', error);
        }
    }
}

module.exports = WhatsAppBot;
