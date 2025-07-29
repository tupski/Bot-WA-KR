// Modul WhatsApp Bot
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config.js');
const logger = require('./logger');

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
            logger.info('QR Code generated for WhatsApp authentication');
        });

        // Ready event
        this.client.on('ready', async () => {
            this.isReady = true;
            console.log('\n✅ WhatsApp Bot siap dan terhubung!');
            logger.info('WhatsApp Bot berhasil terhubung');

            // Tampilkan daftar grup
            await this.displayGroupList();
        });

        // Authentication success
        this.client.on('authenticated', () => {
            logger.info('WhatsApp authentication successful');
        });

        // Authentication failure
        this.client.on('auth_failure', (msg) => {
            logger.error('WhatsApp authentication failed:', msg);
        });

        // Disconnected event
        this.client.on('disconnected', (reason) => {
            this.isReady = false;
            logger.warn('WhatsApp Bot disconnected:', reason);
        });

        // Message event
        this.client.on('message', async (message) => {
            try {
                // Skip if message is from status broadcast
                if (message.from === 'status@broadcast') {
                    return;
                }

                // Process message through registered handlers
                for (const handler of this.messageHandlers) {
                    await handler(message);
                }
            } catch (error) {
                logger.error('Error processing message:', error);
            }
        });

        // Group join event
        this.client.on('group_join', (notification) => {
            logger.info(`Bot joined group: ${notification.chatId}`);
        });

        // Error event
        this.client.on('error', (error) => {
            logger.error('WhatsApp client error:', error);
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
