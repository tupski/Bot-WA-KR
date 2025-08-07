# 🔑 RESET SUPABASE KEYS - STEP BY STEP

## 🚨 **URGENT ACTION REQUIRED**

Your Supabase keys were exposed and need to be reset immediately!

---

## 📋 **Step-by-Step Guide**

### **Step 1: Login to Supabase Dashboard**
1. Go to: https://supabase.com/dashboard
2. Login with your account
3. Select project: **rvcknyuinfssgpgkfetx**

### **Step 2: Navigate to API Settings**
1. Click on **Settings** (gear icon) in left sidebar
2. Click on **API** tab
3. You'll see your current keys

### **Step 3: Reset Service Role Key**
1. Find **Service Role Key** section
2. Click **Reset** or **Regenerate** button
3. **Copy the new Service Role Key**
4. Save it temporarily (you'll need it for .env)

### **Step 4: Reset Anon Key**
1. Find **Anon Key** section  
2. Click **Reset** or **Regenerate** button
3. **Copy the new Anon Key**
4. Save it temporarily (you'll need it for .env)

### **Step 5: Update .env File**
Replace the placeholder values in your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://rvcknyuinfssgpgkfetx.supabase.co
SUPABASE_ANON_KEY=your_new_anon_key_from_step_4
SUPABASE_SERVICE_KEY=your_new_service_role_key_from_step_3
```

### **Step 6: Test Connections**
1. **Test Bot WhatsApp:**
   ```bash
   node index.js
   ```
   
2. **Test Mobile App:**
   - Restart Metro bundler
   - Test login with admin/admin123

### **Step 7: Verify Everything Works**
- [ ] Bot WhatsApp connects to Supabase
- [ ] Mobile app connects to Supabase  
- [ ] Login works in mobile app
- [ ] Data sync works between bot and app

---

## 🔍 **What to Look For**

### **✅ Success Indicators:**
- No connection errors in console
- Bot responds to WhatsApp commands
- Mobile app login works
- Data appears in both bot and app

### **❌ Error Indicators:**
- "Invalid API key" errors
- "Authentication failed" messages
- Connection timeout errors
- Empty data in app/bot

---

## 🆘 **If You Need Help**

### **Can't Access Supabase Dashboard?**
- Check your login credentials
- Try password reset if needed
- Contact Supabase support

### **Keys Not Working After Reset?**
- Double-check you copied the full key
- Make sure no extra spaces in .env file
- Restart all applications after updating .env

### **Still Getting Errors?**
- Check Supabase project status
- Verify database tables exist
- Check RLS policies are correct

---

## 📞 **Emergency Contacts**

- **Supabase Support**: https://supabase.com/support
- **Documentation**: https://supabase.com/docs
- **Status Page**: https://status.supabase.com

---

## ⏰ **Timeline**

**URGENT**: Complete within 1 hour
- [ ] Reset keys (15 minutes)
- [ ] Update .env file (5 minutes)  
- [ ] Test bot WhatsApp (10 minutes)
- [ ] Test mobile app (10 minutes)
- [ ] Verify full functionality (20 minutes)

---

**🔐 Your security is our priority. Complete these steps ASAP!**
