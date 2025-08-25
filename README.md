# KakaRama Room Mobile App

Aplikasi mobile untuk manajemen checkin apartemen KakaRama Room yang terintegrasi dengan bot WhatsApp.

## Fitur Utama

- **Dashboard Admin & Tim Lapangan**: Monitoring real-time checkin/checkout
- **Business Day Logic**: Sistem closing harian jam 12 siang
- **Multi-Filter Laporan**: Filter apartemen dan rentang tanggal
- **Statistik Real-time**: Card statistik harian dan per apartemen
- **Marketing Analytics**: Tracking performa marketing terbaik
- **Supabase Integration**: Database real-time dengan sinkronisasi

## Versi Terbaru: 1.2.0

### Perubahan Terbaru
- ✅ Fix error "Cannot read property 'from' of undefined" di tim lapangan
- ✅ Fix AdminCheckinScreen force close issue
- ✅ Implementasi business day logic (closing jam 12 siang)
- ✅ Pindahkan logout ke Pengaturan -> Keluar
- ✅ Filter multi-select apartemen dan rentang tanggal
- ✅ Card statistik harian dengan business day logic
- ✅ Statistik per apartemen dengan total unit dan pendapatan
- ✅ Marketing terbaik dengan business day logic

## Getting Started

> **Note**: Pastikan sudah setup [React Native Environment](https://reactnative.dev/docs/set-up-your-environment) dan konfigurasi Supabase.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

## Konfigurasi Supabase

Sebelum menjalankan aplikasi, pastikan konfigurasi Supabase sudah benar:

1. **Setup Environment Variables**:
   ```bash
   # Copy file .env.example ke .env
   cp .env.example .env

   # Edit .env dengan kredensial Supabase Anda
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Database Schema**:
   - Jalankan script `supabase-schema.sql` di Supabase SQL Editor
   - Import data sample dari `migration-data-fixed.sql` jika diperlukan

3. **Test Koneksi**:
   ```bash
   # Test koneksi database
   npm run test-db
   ```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
