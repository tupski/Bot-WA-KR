# 🚀 KakaRama Room - Deployment Guide

## 📋 **Overview**

This guide covers the complete deployment process for the KakaRama Room system, including both the WhatsApp Bot and Mobile App components.

---

## 🏗️ **System Architecture**

```
[WhatsApp Bot] ←→ [Supabase Database] ←→ [Mobile App]
     ↓                    ↓                    ↓
  Node.js              PostgreSQL        React Native
  Commands              Real-time           Android APK
```

---

## 📱 **Mobile App Deployment**

### **Prerequisites**
- ✅ Node.js 18+ installed
- ✅ React Native development environment
- ✅ Android SDK and Java 17
- ✅ Supabase project configured

### **Build Production APK**

1. **Run Build Script**:
   ```bash
   D:\Projects\Bot-WA-KR\build-production-apk.bat
   ```

2. **Expected Output**:
   - Optimized JavaScript bundle
   - Production APK file
   - Location: `mobile/KakaRamaRoom/android/app/build/outputs/apk/release/app-release.apk`

3. **Deploy APK**:
   ```bash
   D:\Projects\Bot-WA-KR\deploy-apk.bat
   ```

### **Installation Methods**

#### **Method 1: Direct Install**
1. Copy APK to Android device
2. Enable "Install from unknown sources"
3. Tap APK file to install

#### **Method 2: ADB Install**
```bash
adb install KakaRamaRoom-v1.0.0.apk
```

#### **Method 3: USB Transfer**
1. Connect device via USB
2. Copy APK to device storage
3. Install using file manager

---

## 🤖 **WhatsApp Bot Deployment**

### **Prerequisites**
- ✅ Node.js 18+ installed
- ✅ WhatsApp account for bot
- ✅ Supabase project configured
- ✅ Environment variables set

### **Production Setup**

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   # Set your Supabase credentials
   ```

3. **Test Connection**:
   ```bash
   node test-supabase-connection.js
   ```

4. **Start Bot**:
   ```bash
   node index.js
   ```

### **Production Deployment Options**

#### **Option 1: Local Server**
- Run bot on local machine
- Keep terminal open
- Use PM2 for process management

#### **Option 2: VPS/Cloud Server**
- Deploy to cloud provider (AWS, DigitalOcean, etc.)
- Use PM2 for process management
- Setup reverse proxy if needed

#### **Option 3: Docker Container**
- Create Docker image
- Deploy to container platform
- Scale as needed

---

## 🗄️ **Database Setup (Supabase)**

### **Required Tables**

1. **apartments** - Apartment information
2. **units** - Unit details and status
3. **checkins** - Booking/checkin records
4. **admins** - Admin user accounts
5. **field_teams** - Field team accounts
6. **activity_logs** - System activity tracking
7. **transactions** - Bot transaction records
8. **processed_messages** - Bot message tracking
9. **config** - System configuration

### **Setup Process**

1. **Create Supabase Project**:
   - Go to https://supabase.com
   - Create new project
   - Note URL and API keys

2. **Run Schema Setup**:
   ```sql
   -- Run the SQL schema from SETUP-SUPABASE-GUIDE.md
   ```

3. **Configure RLS Policies**:
   - Enable Row Level Security
   - Set appropriate policies for each table

4. **Test Connection**:
   ```bash
   node test-supabase-connection.js
   ```

---

## 🔧 **Configuration**

### **Environment Variables**

#### **Bot WhatsApp (.env)**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Database Configuration
DB_TYPE=supabase

# Bot Configuration
BOT_NAME=KakaRama Room Bot
ENABLE_LOGGING=true
```

#### **Mobile App (mobile/KakaRamaRoom/.env)**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# App Configuration
NODE_ENV=production
```

---

## 🧪 **Testing Deployment**

### **Pre-deployment Tests**
```bash
# Test all features
D:\Projects\Bot-WA-KR\test-all-features.bat

# Test integration
D:\Projects\Bot-WA-KR\test-integration.bat

# Test real-time sync
node test-realtime-sync.js
```

### **Post-deployment Verification**

#### **Mobile App**
- [ ] App installs successfully
- [ ] Login works (admin/admin123)
- [ ] Dashboard loads
- [ ] Real-time sync indicator shows "Online"
- [ ] All menu items accessible
- [ ] Data displays correctly

#### **WhatsApp Bot**
- [ ] Bot starts without errors
- [ ] WhatsApp connection established
- [ ] Commands respond correctly
- [ ] Data saves to Supabase
- [ ] Reports generate successfully

#### **Integration**
- [ ] Bot data appears in mobile app
- [ ] Mobile app changes sync to bot
- [ ] Real-time updates work
- [ ] Offline/online detection works

---

## 🔒 **Security Considerations**

### **Production Security**
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS for all connections
- ✅ Configure Supabase RLS policies
- ✅ Regular security updates
- ✅ Monitor access logs

### **Access Control**
- ✅ Admin accounts with strong passwords
- ✅ Field team role-based access
- ✅ API key rotation schedule
- ✅ Database backup strategy

---

## 📊 **Monitoring & Maintenance**

### **Health Checks**
- Monitor bot uptime
- Check database connections
- Verify real-time sync status
- Monitor app crash reports

### **Regular Maintenance**
- Update dependencies
- Rotate API keys
- Database cleanup
- Performance optimization

---

## 🆘 **Troubleshooting**

### **Common Issues**
```bash
# Debug common problems
D:\Projects\Bot-WA-KR\debug-common-issues.bat
```

### **Support Resources**
- 📚 Documentation: README.md files
- 🔧 Debug scripts: debug-common-issues.bat
- 🧪 Test scripts: test-*.js files
- 📞 Supabase Support: https://supabase.com/support

---

## 🎯 **Success Criteria**

### **Deployment Complete When:**
- ✅ Mobile app installs and runs on target devices
- ✅ WhatsApp bot responds to commands
- ✅ Real-time sync works between bot and app
- ✅ All CRUD operations function correctly
- ✅ Users can login and access features
- ✅ Data persists in Supabase database
- ✅ System handles errors gracefully

---

## 📞 **Support & Contact**

For deployment assistance or technical issues:
- Check troubleshooting scripts
- Review error logs
- Test individual components
- Contact development team if needed

---

**🚀 Ready for Production Deployment!**
