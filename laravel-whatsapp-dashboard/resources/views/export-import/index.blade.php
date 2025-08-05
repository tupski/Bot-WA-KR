@extends('layouts.app')

@section('title', 'Export & Import Data')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <h2>Export & Import Data</h2>
        <p class="text-muted">Kelola data dengan fitur export dan import</p>
    </div>
</div>

<div class="row">
    <!-- Export Reports -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-download"></i> Export Laporan
                </h5>
            </div>
            <div class="card-body">
                <!-- PDF Export -->
                <form action="{{ route('export.pdf') }}" method="POST" class="mb-4">
                    @csrf
                    <h6>Export PDF Report</h6>
                    
                    <div class="mb-3">
                        <label class="form-label">Jenis Laporan</label>
                        <select name="type" class="form-select" id="reportType" required>
                            <option value="">Pilih jenis laporan</option>
                            <option value="daily">Laporan Harian</option>
                            <option value="monthly">Laporan Bulanan</option>
                            <option value="custom">Custom Period</option>
                        </select>
                    </div>

                    <div class="mb-3" id="dailyDate" style="display: none;">
                        <label class="form-label">Tanggal</label>
                        <input type="date" name="date" class="form-control" value="{{ date('Y-m-d') }}">
                    </div>

                    <div class="mb-3" id="monthlyDate" style="display: none;">
                        <label class="form-label">Bulan</label>
                        <input type="month" name="month" class="form-control" value="{{ date('Y-m') }}">
                    </div>

                    <div class="row" id="customDates" style="display: none;">
                        <div class="col-6 mb-3">
                            <label class="form-label">Tanggal Mulai</label>
                            <input type="date" name="start_date" class="form-control">
                        </div>
                        <div class="col-6 mb-3">
                            <label class="form-label">Tanggal Selesai</label>
                            <input type="date" name="end_date" class="form-control">
                        </div>
                    </div>

                    <button type="submit" class="btn btn-danger">
                        <i class="bi bi-file-pdf"></i> Export PDF
                    </button>
                </form>

                <hr>

                <!-- CSV Export -->
                <form action="{{ route('export.csv') }}" method="POST">
                    @csrf
                    <h6>Export CSV Data</h6>
                    
                    <div class="mb-3">
                        <label class="form-label">Jenis Data</label>
                        <select name="type" class="form-select" required>
                            <option value="">Pilih jenis data</option>
                            <option value="transactions">Transaksi</option>
                            <option value="cs">Customer Service</option>
                            <option value="apartments">Apartemen</option>
                        </select>
                    </div>

                    <div class="row">
                        <div class="col-6 mb-3">
                            <label class="form-label">Tanggal Mulai (Opsional)</label>
                            <input type="date" name="start_date" class="form-control">
                        </div>
                        <div class="col-6 mb-3">
                            <label class="form-label">Tanggal Selesai (Opsional)</label>
                            <input type="date" name="end_date" class="form-control">
                        </div>
                    </div>

                    <button type="submit" class="btn btn-success">
                        <i class="bi bi-file-spreadsheet"></i> Export CSV
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- Backup & Restore -->
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-shield-check"></i> Backup & Restore
                </h5>
            </div>
            <div class="card-body">
                <!-- Backup -->
                <div class="mb-4">
                    <h6>Backup Database</h6>
                    <p class="text-muted small">Backup semua data sistem dalam format JSON</p>
                    
                    <a href="{{ route('export.backup') }}" class="btn btn-warning">
                        <i class="bi bi-cloud-download"></i> Download Backup
                    </a>
                </div>

                <hr>

                <!-- Restore -->
                <form action="{{ route('import.restore') }}" method="POST" enctype="multipart/form-data">
                    @csrf
                    <h6>Restore Database</h6>
                    <p class="text-muted small">Upload file backup untuk restore data</p>
                    
                    <div class="mb-3">
                        <label class="form-label">File Backup</label>
                        <input type="file" name="backup_file" class="form-control" accept=".json" required>
                        <small class="text-muted">File harus berformat JSON dari backup sistem</small>
                    </div>

                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        <strong>Perhatian!</strong> Proses restore akan menimpa data yang ada. Pastikan Anda sudah melakukan backup terlebih dahulu.
                    </div>

                    <button type="submit" class="btn btn-danger" onclick="return confirm('Apakah Anda yakin ingin melakukan restore? Data yang ada akan ditimpa!')">
                        <i class="bi bi-cloud-upload"></i> Restore Data
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Quick Export Actions -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-lightning"></i> Quick Export
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <form action="{{ route('export.pdf') }}" method="POST">
                            @csrf
                            <input type="hidden" name="type" value="daily">
                            <input type="hidden" name="date" value="{{ date('Y-m-d') }}">
                            <button type="submit" class="btn btn-outline-danger w-100">
                                <i class="bi bi-file-pdf"></i><br>
                                PDF Hari Ini
                            </button>
                        </form>
                    </div>
                    <div class="col-md-3 mb-3">
                        <form action="{{ route('export.pdf') }}" method="POST">
                            @csrf
                            <input type="hidden" name="type" value="monthly">
                            <input type="hidden" name="month" value="{{ date('Y-m') }}">
                            <button type="submit" class="btn btn-outline-danger w-100">
                                <i class="bi bi-file-pdf"></i><br>
                                PDF Bulan Ini
                            </button>
                        </form>
                    </div>
                    <div class="col-md-3 mb-3">
                        <form action="{{ route('export.csv') }}" method="POST">
                            @csrf
                            <input type="hidden" name="type" value="transactions">
                            <input type="hidden" name="start_date" value="{{ date('Y-m-01') }}">
                            <input type="hidden" name="end_date" value="{{ date('Y-m-d') }}">
                            <button type="submit" class="btn btn-outline-success w-100">
                                <i class="bi bi-file-spreadsheet"></i><br>
                                CSV Transaksi Bulan Ini
                            </button>
                        </form>
                    </div>
                    <div class="col-md-3 mb-3">
                        <a href="{{ route('export.backup') }}" class="btn btn-outline-warning w-100">
                            <i class="bi bi-cloud-download"></i><br>
                            Backup Sekarang
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Export History -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-clock-history"></i> Riwayat Export
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Jenis</th>
                                <th>Format</th>
                                <th>Period</th>
                                <th>User</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{{ now()->format('d/m/Y H:i') }}</td>
                                <td>Laporan Harian</td>
                                <td><span class="badge bg-danger">PDF</span></td>
                                <td>{{ date('d/m/Y') }}</td>
                                <td>{{ auth()->user()->name }}</td>
                                <td><span class="badge bg-success">Success</span></td>
                            </tr>
                            <tr>
                                <td colspan="6" class="text-center text-muted">
                                    <em>Riwayat export akan ditampilkan di sini</em>
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
// Show/hide date fields based on report type
document.getElementById('reportType').addEventListener('change', function() {
    const type = this.value;
    
    // Hide all date fields
    document.getElementById('dailyDate').style.display = 'none';
    document.getElementById('monthlyDate').style.display = 'none';
    document.getElementById('customDates').style.display = 'none';
    
    // Show relevant date field
    if (type === 'daily') {
        document.getElementById('dailyDate').style.display = 'block';
    } else if (type === 'monthly') {
        document.getElementById('monthlyDate').style.display = 'block';
    } else if (type === 'custom') {
        document.getElementById('customDates').style.display = 'block';
    }
});

// Set default dates for custom range
document.addEventListener('DOMContentLoaded', function() {
    const startDate = document.querySelector('input[name="start_date"]');
    const endDate = document.querySelector('input[name="end_date"]');
    
    if (startDate && endDate) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        startDate.value = firstDay.toISOString().split('T')[0];
        endDate.value = today.toISOString().split('T')[0];
    }
});
</script>
@endpush
