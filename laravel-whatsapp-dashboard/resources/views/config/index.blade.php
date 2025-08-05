@extends('layouts.app')

@section('title', 'Konfigurasi Sistem')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <h2>Konfigurasi Sistem</h2>
        <p class="text-muted">Pengaturan sistem bot WhatsApp dan dashboard</p>
    </div>
</div>

<form action="{{ route('config.update') }}" method="POST">
    @csrf
    @method('PUT')
    
    <div class="row">
        <!-- Bot Configuration -->
        <div class="col-lg-6 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-robot"></i> Konfigurasi Bot WhatsApp
                    </h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Nama Bot</label>
                        <input type="text" name="configs[bot_name]" class="form-control" 
                               value="{{ $configs['bot_name']->value ?? 'KakaRama Bot' }}" 
                               placeholder="KakaRama Bot">
                        <small class="text-muted">Nama yang akan ditampilkan oleh bot</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">WhatsApp API URL</label>
                        <input type="url" name="configs[whatsapp_api_url]" class="form-control" 
                               value="{{ $configs['whatsapp_api_url']->value ?? '' }}" 
                               placeholder="https://api.whatsapp.com">
                        <small class="text-muted">URL endpoint API WhatsApp</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">WhatsApp API Token</label>
                        <input type="password" name="configs[whatsapp_api_token]" class="form-control" 
                               value="{{ $configs['whatsapp_api_token']->value ?? '' }}" 
                               placeholder="Token API">
                        <small class="text-muted">Token autentikasi untuk API WhatsApp</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Default Commission Rate (%)</label>
                        <input type="number" name="configs[default_commission_rate]" class="form-control" 
                               value="{{ $configs['default_commission_rate']->value ?? '5' }}" 
                               min="0" max="100" step="0.1">
                        <small class="text-muted">Rate komisi default untuk CS baru</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- System Configuration -->
        <div class="col-lg-6 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-gear"></i> Konfigurasi Sistem
                    </h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Email Notifikasi</label>
                        <input type="email" name="configs[notification_email]" class="form-control" 
                               value="{{ $configs['notification_email']->value ?? '' }}" 
                               placeholder="admin@example.com">
                        <small class="text-muted">Email untuk menerima notifikasi sistem</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Waktu Laporan Harian</label>
                        <input type="time" name="configs[daily_report_time]" class="form-control" 
                               value="{{ $configs['daily_report_time']->value ?? '23:00' }}">
                        <small class="text-muted">Waktu pengiriman laporan harian otomatis</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Timezone Sistem</label>
                        <select name="configs[system_timezone]" class="form-select">
                            <option value="Asia/Jakarta" {{ ($configs['system_timezone']->value ?? 'Asia/Jakarta') == 'Asia/Jakarta' ? 'selected' : '' }}>Asia/Jakarta (WIB)</option>
                            <option value="Asia/Makassar" {{ ($configs['system_timezone']->value ?? '') == 'Asia/Makassar' ? 'selected' : '' }}>Asia/Makassar (WITA)</option>
                            <option value="Asia/Jayapura" {{ ($configs['system_timezone']->value ?? '') == 'Asia/Jayapura' ? 'selected' : '' }}>Asia/Jayapura (WIT)</option>
                        </select>
                        <small class="text-muted">Timezone untuk sistem dan laporan</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Jadwal Backup</label>
                        <input type="text" name="configs[backup_schedule]" class="form-control" 
                               value="{{ $configs['backup_schedule']->value ?? '0 2 * * *' }}" 
                               placeholder="0 2 * * *">
                        <small class="text-muted">Cron format untuk jadwal backup (default: 02:00 setiap hari)</small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <!-- Transaction Limits -->
        <div class="col-lg-6 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-cash-stack"></i> Batas Transaksi
                    </h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">Minimal Amount Transaksi</label>
                        <div class="input-group">
                            <span class="input-group-text">Rp</span>
                            <input type="number" name="configs[min_transaction_amount]" class="form-control" 
                                   value="{{ $configs['min_transaction_amount']->value ?? '50000' }}" 
                                   min="0" step="10000">
                        </div>
                        <small class="text-muted">Minimal amount untuk transaksi valid</small>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Maksimal Amount Transaksi</label>
                        <div class="input-group">
                            <span class="input-group-text">Rp</span>
                            <input type="number" name="configs[max_transaction_amount]" class="form-control" 
                                   value="{{ $configs['max_transaction_amount']->value ?? '5000000' }}" 
                                   min="0" step="100000">
                        </div>
                        <small class="text-muted">Maksimal amount untuk transaksi valid</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Notification Settings -->
        <div class="col-lg-6 mb-4">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-bell"></i> Pengaturan Notifikasi
                    </h5>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" name="configs[enable_email_notifications]" 
                                   value="1" {{ ($configs['enable_email_notifications']->value ?? '1') == '1' ? 'checked' : '' }}>
                            <label class="form-check-label">
                                Email Notifications
                            </label>
                        </div>
                        <small class="text-muted">Aktifkan notifikasi email untuk transaksi dan laporan</small>
                    </div>

                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" name="configs[enable_realtime_notifications]" 
                                   value="1" {{ ($configs['enable_realtime_notifications']->value ?? '1') == '1' ? 'checked' : '' }}>
                            <label class="form-check-label">
                                Real-time Notifications
                            </label>
                        </div>
                        <small class="text-muted">Aktifkan notifikasi real-time di dashboard</small>
                    </div>

                    <div class="mb-3">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" name="configs[enable_daily_reports]" 
                                   value="1" {{ ($configs['enable_daily_reports']->value ?? '1') == '1' ? 'checked' : '' }}>
                            <label class="form-check-label">
                                Daily Reports
                            </label>
                        </div>
                        <small class="text-muted">Aktifkan pengiriman laporan harian otomatis</small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Save Button -->
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <button type="submit" class="btn btn-primary btn-lg">
                        <i class="bi bi-save"></i> Simpan Konfigurasi
                    </button>
                    <button type="reset" class="btn btn-outline-secondary btn-lg">
                        <i class="bi bi-arrow-clockwise"></i> Reset
                    </button>
                </div>
            </div>
        </div>
    </div>
</form>

<!-- Current Configuration Info -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Informasi Konfigurasi
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Status Sistem:</h6>
                        <ul class="list-unstyled">
                            <li><span class="badge bg-success">Online</span> Dashboard</li>
                            <li><span class="badge bg-{{ isset($configs['whatsapp_api_url']) && $configs['whatsapp_api_url']->value ? 'success' : 'warning' }}">
                                {{ isset($configs['whatsapp_api_url']) && $configs['whatsapp_api_url']->value ? 'Connected' : 'Not Configured' }}
                            </span> WhatsApp API</li>
                            <li><span class="badge bg-{{ isset($configs['notification_email']) && $configs['notification_email']->value ? 'success' : 'warning' }}">
                                {{ isset($configs['notification_email']) && $configs['notification_email']->value ? 'Configured' : 'Not Configured' }}
                            </span> Email Notifications</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6>Last Updated:</h6>
                        <p class="text-muted">
                            @if($configs->isNotEmpty())
                                {{ $configs->first()->updated_at->format('d/m/Y H:i:s') }}
                            @else
                                Belum pernah diupdate
                            @endif
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Auto-format number inputs
document.querySelectorAll('input[type="number"]').forEach(input => {
    if (input.name.includes('amount')) {
        input.addEventListener('blur', function() {
            const value = parseInt(this.value);
            if (!isNaN(value)) {
                this.value = value;
            }
        });
    }
});

// Confirm before reset
document.querySelector('button[type="reset"]').addEventListener('click', function(e) {
    if (!confirm('Apakah Anda yakin ingin mereset semua perubahan?')) {
        e.preventDefault();
    }
});
</script>
@endpush
