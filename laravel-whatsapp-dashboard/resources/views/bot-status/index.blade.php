@extends('layouts.app')

@section('title', 'Status Bot WhatsApp')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Status Bot WhatsApp</h2>
            <div>
                <button class="btn btn-outline-success" onclick="refreshStatus()">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
                <button class="btn btn-outline-warning" onclick="restartBot()">
                    <i class="bi bi-bootstrap-reboot"></i> Restart Bot
                </button>
                <button class="btn btn-outline-danger" onclick="logoutBot()">
                    <i class="bi bi-box-arrow-right"></i> Logout Bot
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Bot Status Card -->
<div class="row mb-4">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-whatsapp"></i> Status Bot
                </h5>
            </div>
            <div class="card-body" id="botStatusCard">
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-qr-code"></i> QR Code Scanner
                </h5>
            </div>
            <div class="card-body text-center" id="qrCodeCard">
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- QR Code Instructions -->
        <div class="card mt-3">
            <div class="card-header">
                <h6 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Cara Scan QR Code
                </h6>
            </div>
            <div class="card-body">
                <ol class="small">
                    <li>Buka WhatsApp di ponsel Anda</li>
                    <li>Tap menu <strong>⋮</strong> (titik tiga)</li>
                    <li>Pilih <strong>WhatsApp Web</strong></li>
                    <li>Tap <strong>Scan QR Code</strong></li>
                    <li>Arahkan kamera ke QR code di atas</li>
                </ol>
                <div class="alert alert-info alert-sm mt-3">
                    <i class="bi bi-lightbulb"></i>
                    <strong>Tips:</strong> Pastikan QR code terlihat jelas dan tidak terpotong
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Bot Information -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Informasi Bot
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Konfigurasi Bot:</h6>
                        <ul class="list-unstyled">
                            <li><strong>Nama Bot:</strong> {{ config('app.name') }}</li>
                            <li><strong>Environment:</strong> {{ config('app.env') }}</li>
                            <li><strong>Webhook URL:</strong> {{ url('/api/webhook/transaction') }}</li>
                            <li><strong>API Status:</strong> <span class="badge bg-success">Active</span></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>Statistik Hari Ini:</h6>
                        <ul class="list-unstyled">
                            <li><strong>Pesan Diterima:</strong> <span id="todayMessages">-</span></li>
                            <li><strong>Transaksi Diproses:</strong> <span id="todayTransactions">-</span></li>
                            <li><strong>Error Rate:</strong> <span id="errorRate">-</span></li>
                            <li><strong>Uptime:</strong> <span id="uptime">-</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recent Activities -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-clock-history"></i> Aktivitas Terbaru
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Aktivitas</th>
                                <th>Status</th>
                                <th>Detail</th>
                            </tr>
                        </thead>
                        <tbody id="recentActivities">
                            <tr>
                                <td colspan="4" class="text-center text-muted">
                                    <em>Loading aktivitas...</em>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
let statusInterval;

function loadBotStatus() {
    fetch('/bot-status/status')
        .then(response => response.json())
        .then(data => {
            updateStatusCard(data);
        })
        .catch(error => {
            console.error('Error loading bot status:', error);
            document.getElementById('botStatusCard').innerHTML =
                '<div class="alert alert-danger">Gagal memuat status bot</div>';
        });
}

function loadQrCode() {
    fetch('/bot-status/qr-code')
        .then(response => response.json())
        .then(data => {
            updateQrCodeCard(data.qr_code);
        })
        .catch(error => {
            console.error('Error loading QR code:', error);
        });
}

function updateStatusCard(status) {
    const statusColors = {
        'connected': 'success',
        'connecting': 'warning',
        'disconnected': 'danger'
    };

    const statusIcons = {
        'connected': 'check-circle-fill',
        'connecting': 'clock-fill',
        'disconnected': 'x-circle-fill'
    };

    const color = statusColors[status.status] || 'secondary';
    const icon = statusIcons[status.status] || 'question-circle';

    let html = `
        <div class="row align-items-center">
            <div class="col-auto">
                <div class="status-indicator status-${status.status}">
                    <i class="bi bi-${icon} h1 text-${color}"></i>
                </div>
            </div>
            <div class="col">
                <h4 class="text-${color} mb-1">${status.status.toUpperCase()}</h4>
                <p class="text-muted mb-2">${status.message}</p>
                <small class="text-muted">Last seen: ${new Date(status.last_seen).toLocaleString('id-ID')}</small>
    `;

    if (status.phone_number) {
        html += `
                <div class="mt-3">
                    <div class="row">
                        <div class="col-6">
                            <strong>Phone:</strong> ${status.phone_number}
                        </div>
                        <div class="col-6">
                            <strong>Device:</strong> ${status.device_name}
                        </div>
                    </div>
        `;

        if (status.battery) {
            html += `
                    <div class="row mt-2">
                        <div class="col-6">
                            <strong>Battery:</strong> ${status.battery}%
                        </div>
                        <div class="col-6">
                            <strong>Signal:</strong> ${status.signal_strength}
                        </div>
                    </div>
            `;
        }

        html += '</div>';
    }

    html += `
            </div>
        </div>
    `;

    document.getElementById('botStatusCard').innerHTML = html;
}

function updateQrCodeCard(qrCode) {
    const qrCard = document.getElementById('qrCodeCard');

    if (qrCode) {
        qrCard.innerHTML = `
            <div class="qr-code-container">
                <div class="qr-code-wrapper mb-3">
                    <img src="${qrCode}" alt="QR Code" class="img-fluid qr-code-image" style="max-width: 200px;">
                    <div class="qr-code-overlay">
                        <div class="qr-code-timer">
                            <div class="timer-circle">
                                <span id="qrTimer">30</span>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-muted small">Scan QR code dengan WhatsApp untuk menghubungkan bot</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-outline-primary btn-sm" onclick="loadQrCode()">
                        <i class="bi bi-arrow-clockwise"></i> Refresh QR
                    </button>
                    <button class="btn btn-outline-success btn-sm" onclick="simulateConnection()">
                        <i class="bi bi-check-circle"></i> Simulasi Connect
                    </button>
                </div>
            </div>
        `;

        // Start QR code timer
        startQrTimer();
    } else {
        qrCard.innerHTML = `
            <div class="text-center">
                <i class="bi bi-check-circle h1 text-success pulse"></i>
                <p class="text-success">Bot sudah terhubung</p>
                <p class="text-muted small">QR code tidak diperlukan</p>
                <div class="mt-3">
                    <button class="btn btn-outline-danger btn-sm" onclick="logoutBot()">
                        <i class="bi bi-box-arrow-right"></i> Logout Bot
                    </button>
                </div>
            </div>
        `;
    }
}

function refreshStatus() {
    loadBotStatus();
    loadQrCode();

    // Show refresh feedback
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 1000);
}

function restartBot() {
    if (confirm('Apakah Anda yakin ingin restart bot? Bot akan terputus sementara.')) {
        fetch('/bot-status/restart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
            .then(response => response.json())
            .then(data => {
                alert('Bot restart berhasil dimulai');
                setTimeout(() => {
                    refreshStatus();
                }, 3000);
            })
            .catch(error => {
                alert('Gagal restart bot');
            });
    }
}

function logoutBot() {
    if (confirm('Apakah Anda yakin ingin logout bot? Anda perlu scan QR code lagi.')) {
        fetch('/bot-status/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
            .then(response => response.json())
            .then(data => {
                alert('Bot berhasil logout');
                refreshStatus();
            })
            .catch(error => {
                alert('Gagal logout bot');
            });
    }
}

// Load initial data
document.addEventListener('DOMContentLoaded', function() {
    loadBotStatus();
    loadQrCode();

    // Auto refresh every 30 seconds
    statusInterval = setInterval(() => {
        loadBotStatus();
        loadQrCode();
    }, 30000);
});

// QR Code Timer
let qrTimer;
let qrTimeLeft = 30;

function startQrTimer() {
    qrTimeLeft = 30;
    const timerElement = document.getElementById('qrTimer');

    if (qrTimer) clearInterval(qrTimer);

    qrTimer = setInterval(() => {
        qrTimeLeft--;
        if (timerElement) {
            timerElement.textContent = qrTimeLeft;
        }

        if (qrTimeLeft <= 0) {
            clearInterval(qrTimer);
            loadQrCode(); // Auto refresh QR code
        }
    }, 1000);
}

function simulateConnection() {
    if (confirm('Simulasi koneksi bot? (untuk testing)')) {
        // Simulate successful connection
        fetch('/bot-status/restart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        })
            .then(() => {
                // Update cache to show connected status
                setTimeout(() => {
                    refreshStatus();
                }, 1000);
            });
    }
}

// Cleanup intervals on page unload
window.addEventListener('beforeunload', function() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    if (qrTimer) {
        clearInterval(qrTimer);
    }
});
</script>
@endpush

@push('styles')
<style>
.status-indicator {
    animation: pulse 2s infinite;
}

.status-connected {
    animation: none;
}

.status-connecting {
    animation: pulse 1s infinite;
}

.status-disconnected {
    animation: none;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.qr-code-container img {
    border: 2px solid #dee2e6;
    border-radius: 8px;
    padding: 10px;
    background: white;
}

.qr-code-wrapper {
    position: relative;
    display: inline-block;
}

.qr-code-overlay {
    position: absolute;
    top: 10px;
    right: 10px;
}

.qr-code-timer {
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    padding: 5px;
}

.timer-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #667eea;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 12px;
    animation: timerPulse 1s infinite;
}

@keyframes timerPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.qr-code-image {
    transition: all 0.3s ease;
}

.qr-code-image:hover {
    transform: scale(1.05);
}
</style>
@endpush
