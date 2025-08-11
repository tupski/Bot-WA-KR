# Firebase Credentials

This folder contains sensitive Firebase credentials that should NOT be committed to Git.

## Files

### firebase-service-account.json
- **Description**: Firebase Service Account Key for server-side operations
- **Usage**: Used by Supabase Edge Functions to send push notifications
- **Security**: This file contains private keys and should be kept secure
- **Original**: kr-app-12092-d0cba190204d.json

## Firebase Configuration

### Project Details
- **Project ID**: kr-app-12092
- **Sender ID**: 241468377
- **Database URL**: https://kr-app-12092-default-rtdb.firebaseio.com

### Security Notes
1. Never commit these files to version control
2. Use environment variables in production
3. Restrict API key permissions in Firebase Console
4. Regularly rotate service account keys

## Setup Instructions

1. Place your Firebase Service Account Key as `firebase-service-account.json`
2. Ensure this folder is in .gitignore
3. For production, use secure environment variables
4. Test push notifications with proper device tokens

## Supabase Edge Function Setup

The service account key will be used in Supabase Edge Function:

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
const app = initializeApp({
  credential: cert(serviceAccount),
});
```

## Environment Variables for Production

```bash
FIREBASE_PROJECT_ID=kr-app-12092
FIREBASE_SENDER_ID=241468377
FIREBASE_SERVICE_ACCOUNT=<base64_encoded_service_account_json>
```
