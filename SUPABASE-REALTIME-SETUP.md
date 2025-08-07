# 🔄 Supabase Real-time Setup Guide

## 📋 **Overview**

This guide helps you enable and configure real-time subscriptions in Supabase for the KakaRama Room system.

---

## 🚀 **Enable Real-time in Supabase**

### **Step 1: Access Supabase Dashboard**
1. Go to https://supabase.com/dashboard
2. Select your project: `rvcknyuinfssgpgkfetx`
3. Navigate to **Settings** → **API**

### **Step 2: Enable Real-time**
1. Go to **Database** → **Replication**
2. Find **Real-time** section
3. **Enable real-time** for required tables:
   - ✅ `apartments`
   - ✅ `units` 
   - ✅ `checkins`
   - ✅ `activity_logs`
   - ✅ `admins`
   - ✅ `field_teams`

### **Step 3: Configure Table Permissions**
For each table, set real-time permissions:

```sql
-- Enable real-time for apartments
ALTER PUBLICATION supabase_realtime ADD TABLE apartments;

-- Enable real-time for units
ALTER PUBLICATION supabase_realtime ADD TABLE units;

-- Enable real-time for checkins
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;

-- Enable real-time for activity_logs (if exists)
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

---

## 🗄️ **Create Missing Tables**

### **Activity Logs Table**
```sql
-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    related_table VARCHAR(100),
    related_id VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Allow authenticated users to read activity_logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (true);

-- Policy for service role to insert
CREATE POLICY "Allow service role to insert activity_logs" 
ON activity_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

### **Processed Messages Table (for Bot)**
```sql
-- Create processed_messages table for bot
CREATE TABLE IF NOT EXISTS processed_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    chat_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Allow service role full access to processed_messages" 
ON processed_messages FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
```

### **Transactions Table (for Bot)**
```sql
-- Create transactions table for bot
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    duration_hours INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_amount INTEGER NOT NULL,
    marketing_name VARCHAR(255),
    checkout_time TIMESTAMP WITH TIME ZONE NOT NULL,
    date_only DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Allow service role full access to transactions" 
ON transactions FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

### **Config Table (for Bot)**
```sql
-- Create config table for bot
CREATE TABLE IF NOT EXISTS config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Allow service role full access to config" 
ON config FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
```

---

## 🔧 **Test Real-time Setup**

### **Method 1: Run Test Script**
```bash
node test-realtime-sync.js
```

### **Method 2: Manual Test in Supabase**
1. Go to **Database** → **Tables**
2. Select `apartments` table
3. Insert or update a record
4. Check if real-time events are triggered

### **Method 3: Browser Console Test**
```javascript
// Test in browser console
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rvcknyuinfssgpgkfetx.supabase.co',
  'your_anon_key'
)

// Subscribe to changes
const subscription = supabase
  .channel('test')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'apartments' }, 
    (payload) => console.log('Change received!', payload)
  )
  .subscribe()
```

---

## 🛠️ **Troubleshooting**

### **Issue: Real-time not working**
**Solutions:**
1. Check if real-time is enabled in project settings
2. Verify table is added to `supabase_realtime` publication
3. Check RLS policies allow access
4. Ensure network allows WebSocket connections

### **Issue: Permission denied**
**Solutions:**
1. Check RLS policies are correctly configured
2. Verify API key has correct permissions
3. Test with service role key for debugging

### **Issue: Table not found**
**Solutions:**
1. Run the SQL commands above to create missing tables
2. Check table names are correct (case-sensitive)
3. Verify schema is `public`

---

## ✅ **Verification Checklist**

- [ ] Real-time enabled in Supabase dashboard
- [ ] All required tables added to real-time publication
- [ ] RLS policies configured correctly
- [ ] Test script passes without errors
- [ ] Mobile app shows "Online" sync status
- [ ] Bot WhatsApp connects successfully

---

## 📞 **Support**

If real-time still doesn't work:
1. Check Supabase project status
2. Verify your plan includes real-time features
3. Contact Supabase support if needed
4. System will work without real-time (manual refresh required)

---

**Note**: Real-time is optional for basic functionality. The system will work without it, but users need to manually refresh data.
