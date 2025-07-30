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

        // Message revoke event
        this.client.on('message_revoke_everyone', async (_, before) => {
            try {
                if (before) {
                    logger.info(`Pesan dihapus untuk semua: ${before.id.id}`);
                    // Tandai pesan sebagai dihapus di database jika diperlukan
                    // Untuk saat ini, kita tidak melakukan apa-apa karena pesan sudah dihapus
                }
            } catch (error) {
                logger.error('Error memproses pesan yang dihapus:', error);
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
        if (!groupId) return config.apartments.defaultApartment;

        // Cek mapping grup ID ke apartemen
        const apartmentName = config.apartments.groupMapping[groupId];
        if (apartmentName) {
            return apartmentName;
        }

        // Jika tidak ada mapping, return default
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
                    // Bandingkan konten pesan dengan data yang tersimpan
                    // Jika berbeda, kemungkinan pesan diedit
                    const lines = message.body.split('\n').map(line => line.trim()).filter(line => line);
                    if (lines.length >= 2 && lines[1].toLowerCase().includes('unit')) {
                        logger.info(`Kemungkinan pesan diedit terdeteksi: ${message.id.id}`);
                        return true;
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

    // Send message to configured group
    async sendToGroup(message) {
        if (!config.groupChatId) {
            logger.error('Group chat ID not configured');
            return false;
        }
        return await this.sendMessage(config.groupChatId, message);
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
