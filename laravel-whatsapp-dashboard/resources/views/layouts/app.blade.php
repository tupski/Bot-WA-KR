<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#667eea">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="KakaRama">
    <meta name="description" content="Dashboard untuk mengelola transaksi booking apartemen melalui bot WhatsApp">
    <meta name="keywords" content="whatsapp, dashboard, booking, apartemen, kakarama">

    <title>@yield('title', 'Dashboard') - {{ config('app.name') }}</title>

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/icons/icon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/icons/icon-16x16.png">

    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="180x180" href="/images/icons/icon-180x180.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/images/icons/icon-152x152.png">
    <link rel="apple-touch-icon" sizes="144x144" href="/images/icons/icon-144x144.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/images/icons/icon-120x120.png">
    <link rel="apple-touch-icon" sizes="114x114" href="/images/icons/icon-114x114.png">
    <link rel="apple-touch-icon" sizes="76x76" href="/images/icons/icon-76x76.png">
    <link rel="apple-touch-icon" sizes="72x72" href="/images/icons/icon-72x72.png">
    <link rel="apple-touch-icon" sizes="60x60" href="/images/icons/icon-60x60.png">
    <link rel="apple-touch-icon" sizes="57x57" href="/images/icons/icon-57x57.png">

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Pusher -->
    <script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>

    <!-- Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <style>
        .sidebar {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .sidebar .nav-link {
            color: rgba(255, 255, 255, 0.8);
            border-radius: 8px;
            margin: 2px 0;
            transition: all 0.3s ease;
        }

        .sidebar .nav-link:hover,
        .sidebar .nav-link.active {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
            transform: translateX(5px);
        }

        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .stat-card-success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        .stat-card-warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-card-info {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .navbar-brand {
            font-weight: 600;
            color: #667eea !important;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
            transform: translateY(-2px);
        }

        .table {
            border-radius: 10px;
            overflow: hidden;
        }

        .table thead th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
        }

        .badge {
            border-radius: 20px;
            padding: 8px 12px;
        }

        .status-online {
            color: #28a745;
        }

        .status-offline {
            color: #dc3545;
        }
    </style>
</head>
<body class="bg-light">
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-3 col-lg-2 d-md-block sidebar collapse">
                <div class="position-sticky pt-3">
                    <div class="text-center mb-4">
                        <h4 class="text-white">
                            <i class="bi bi-whatsapp"></i>
                            WA Dashboard
                        </h4>
                        <small class="text-white-50">Kakarama Room</small>
                    </div>

                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('dashboard') ? 'active' : '' }}" href="{{ route('dashboard') }}">
                                <i class="bi bi-speedometer2"></i>
                                Dashboard
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('transactions.*') ? 'active' : '' }}" href="{{ route('transactions.index') }}">
                                <i class="bi bi-receipt"></i>
                                Transaksi
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('reports.*') ? 'active' : '' }}" href="{{ route('reports.index') }}">
                                <i class="bi bi-graph-up"></i>
                                Laporan
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('apartments.*') ? 'active' : '' }}" href="{{ route('apartments.index') }}">
                                <i class="bi bi-building"></i>
                                Apartemen
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('customer-services.*') ? 'active' : '' }}" href="{{ route('customer-services.index') }}">
                                <i class="bi bi-people"></i>
                                Customer Service
                            </a>
                        </li>

                        @if(auth()->user()->isAdmin())
                        <hr class="text-white-50">
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('users.*') ? 'active' : '' }}" href="{{ route('users.index') }}">
                                <i class="bi bi-person-gear"></i>
                                Manajemen User
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('bot-status.*') ? 'active' : '' }}" href="{{ route('bot-status.index') }}">
                                <i class="bi bi-whatsapp"></i>
                                Status Bot
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('whatsapp-groups.*') ? 'active' : '' }}" href="{{ route('whatsapp-groups.index') }}">
                                <i class="bi bi-people"></i>
                                Grup WhatsApp
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('config.*') ? 'active' : '' }}" href="{{ route('config.index') }}">
                                <i class="bi bi-gear"></i>
                                Konfigurasi Bot
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('export-import.*') ? 'active' : '' }}" href="{{ route('export-import.index') }}">
                                <i class="bi bi-download"></i>
                                Export/Import
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link {{ request()->routeIs('monitoring.*') ? 'active' : '' }}" href="{{ route('monitoring.index') }}">
                                <i class="bi bi-activity"></i>
                                Monitoring
                            </a>
                        </li>
                        @endif
                    </ul>
                </div>
            </nav>

            <!-- Main content -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <!-- Top Navigation -->
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">@yield('title', 'Dashboard')</h1>

                    <div class="btn-toolbar mb-2 mb-md-0">
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-person-circle"></i>
                                {{ auth()->user()->name }}
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="{{ route('profile.edit') }}">
                                    <i class="bi bi-person"></i> Profile
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <form method="POST" action="{{ route('logout') }}">
                                        @csrf
                                        <button type="submit" class="dropdown-item">
                                            <i class="bi bi-box-arrow-right"></i> Logout
                                        </button>
                                    </form>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Page Content -->
                @if(session('success'))
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        {{ session('success') }}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                @if(session('error'))
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        {{ session('error') }}
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                @endif

                @yield('content')
                {{ $slot ?? '' }}
            </main>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- PWA Installation Prompt -->
    <div id="pwaInstallPrompt" class="position-fixed bottom-0 start-50 translate-middle-x mb-3" style="display: none; z-index: 9999;">
        <div class="card shadow-lg" style="max-width: 350px;">
            <div class="card-body text-center">
                <h6 class="card-title">Install KakaRama App</h6>
                <p class="card-text small">Install aplikasi untuk akses yang lebih cepat dan notifikasi real-time</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button id="pwaInstallBtn" class="btn btn-primary btn-sm">Install</button>
                    <button id="pwaCloseBtn" class="btn btn-outline-secondary btn-sm">Nanti</button>
                </div>
            </div>
        </div>
    </div>

    <!-- PWA Scripts -->
    <script>
        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);

                        // Check for updates
                        registration.addEventListener('updatefound', function() {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New content is available
                                    if (confirm('Update tersedia! Refresh halaman untuk mendapatkan versi terbaru?')) {
                                        window.location.reload();
                                    }
                                }
                            });
                        });
                    })
                    .catch(function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }

        // PWA Install Prompt
        let deferredPrompt;
        const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
        const pwaInstallBtn = document.getElementById('pwaInstallBtn');
        const pwaCloseBtn = document.getElementById('pwaCloseBtn');

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;
            // Show install prompt
            pwaInstallPrompt.style.display = 'block';
        });

        pwaInstallBtn.addEventListener('click', (e) => {
            // Hide the app provided install promotion
            pwaInstallPrompt.style.display = 'none';
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        });

        pwaCloseBtn.addEventListener('click', (e) => {
            pwaInstallPrompt.style.display = 'none';
            // Remember user choice for 7 days
            localStorage.setItem('pwaPromptDismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
        });

        // Check if user previously dismissed the prompt
        window.addEventListener('load', function() {
            const dismissedTime = localStorage.getItem('pwaPromptDismissed');
            if (dismissedTime && Date.now() < parseInt(dismissedTime)) {
                // Don't show prompt if recently dismissed
                window.addEventListener('beforeinstallprompt', (e) => {
                    e.preventDefault();
                });
            }
        });

        // PWA App Installed
        window.addEventListener('appinstalled', (evt) => {
            console.log('PWA was installed');
            // Hide install prompt
            pwaInstallPrompt.style.display = 'none';
            // Show success message
            if (typeof showNotification === 'function') {
                showNotification({
                    unit: 'PWA',
                    location: 'Installed',
                    cs_name: 'System',
                    formatted_amount: 'Success'
                });
            }
        });

        // Push Notification Permission
        if ('Notification' in window && 'serviceWorker' in navigator) {
            // Request notification permission on first visit
            if (Notification.permission === 'default') {
                setTimeout(() => {
                    Notification.requestPermission().then(permission => {
                        console.log('Notification permission:', permission);
                    });
                }, 5000); // Wait 5 seconds before asking
            }
        }

        // Online/Offline Status
        window.addEventListener('online', function() {
            console.log('App is online');
            // Show online indicator
            const offlineIndicator = document.getElementById('offlineIndicator');
            if (offlineIndicator) {
                offlineIndicator.style.display = 'none';
            }
        });

        window.addEventListener('offline', function() {
            console.log('App is offline');
            // Show offline indicator
            let offlineIndicator = document.getElementById('offlineIndicator');
            if (!offlineIndicator) {
                offlineIndicator = document.createElement('div');
                offlineIndicator.id = 'offlineIndicator';
                offlineIndicator.className = 'position-fixed top-0 start-0 w-100 bg-warning text-dark text-center py-2';
                offlineIndicator.style.zIndex = '9999';
                offlineIndicator.innerHTML = '<i class="bi bi-wifi-off"></i> Anda sedang offline. Beberapa fitur mungkin tidak tersedia.';
                document.body.appendChild(offlineIndicator);
            }
            offlineIndicator.style.display = 'block';
        });
    </script>

    @stack('scripts')
</body>
</html>
