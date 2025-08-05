@extends('layouts.app')

@section('title', 'Tambah Customer Service')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Tambah Customer Service Baru</h2>
            <a href="{{ route('customer-services.index') }}" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Kembali
            </a>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-person-plus"></i> Form Customer Service Baru
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('customer-services.store') }}" method="POST">
                    @csrf
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="name" class="form-label">CS Name (Username) <span class="text-danger">*</span></label>
                            <input type="text" name="name" id="name" class="form-control @error('name') is-invalid @enderror" 
                                   value="{{ old('name') }}" placeholder="Contoh: lia" required>
                            @error('name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                            <small class="text-muted">Username unik untuk CS, digunakan dalam sistem bot</small>
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="full_name" class="form-label">Nama Lengkap</label>
                            <input type="text" name="full_name" id="full_name" class="form-control @error('full_name') is-invalid @enderror" 
                                   value="{{ old('full_name') }}" placeholder="Contoh: Lia Permata">
                            @error('full_name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="phone" class="form-label">No. Telepon</label>
                            <input type="text" name="phone" id="phone" class="form-control @error('phone') is-invalid @enderror" 
                                   value="{{ old('phone') }}" placeholder="Contoh: 081234567890">
                            @error('phone')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="email" class="form-label">Email</label>
                            <input type="email" name="email" id="email" class="form-control @error('email') is-invalid @enderror" 
                                   value="{{ old('email') }}" placeholder="Contoh: lia@example.com">
                            @error('email')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="commission_rate" class="form-label">Commission Rate (%) <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input type="number" name="commission_rate" id="commission_rate" class="form-control @error('commission_rate') is-invalid @enderror" 
                                       value="{{ old('commission_rate', 5) }}" min="0" max="100" step="0.1" required>
                                <span class="input-group-text">%</span>
                            </div>
                            @error('commission_rate')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                            <small class="text-muted">Persentase komisi dari setiap transaksi</small>
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="target_monthly" class="form-label">Target Bulanan <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="number" name="target_monthly" id="target_monthly" class="form-control @error('target_monthly') is-invalid @enderror" 
                                       value="{{ old('target_monthly') }}" min="0" step="100000" required>
                            </div>
                            @error('target_monthly')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                            <small class="text-muted">Target komisi bulanan dalam Rupiah</small>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="join_date" class="form-label">Tanggal Bergabung</label>
                            <input type="date" name="join_date" id="join_date" class="form-control @error('join_date') is-invalid @enderror" 
                                   value="{{ old('join_date', date('Y-m-d')) }}">
                            @error('join_date')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="is_active" class="form-label">Status</label>
                            <select name="is_active" id="is_active" class="form-select @error('is_active') is-invalid @enderror">
                                <option value="1" {{ old('is_active', 1) == 1 ? 'selected' : '' }}>Active</option>
                                <option value="0" {{ old('is_active') == 0 ? 'selected' : '' }}>Inactive</option>
                            </select>
                            @error('is_active')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <label for="notes" class="form-label">Catatan</label>
                            <textarea name="notes" id="notes" class="form-control @error('notes') is-invalid @enderror" 
                                      rows="3" placeholder="Catatan tambahan tentang CS ini...">{{ old('notes') }}</textarea>
                            @error('notes')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Simpan Customer Service
                            </button>
                            <a href="{{ route('customer-services.index') }}" class="btn btn-outline-secondary">
                                <i class="bi bi-x-circle"></i> Batal
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Panduan
                </h5>
            </div>
            <div class="card-body">
                <h6>CS Name (Username):</h6>
                <ul class="list-unstyled small">
                    <li>• Harus unik dan tidak boleh sama</li>
                    <li>• Digunakan dalam sistem bot WhatsApp</li>
                    <li>• Sebaiknya singkat dan mudah diingat</li>
                    <li>• Contoh: lia, sari, dina, maya</li>
                </ul>

                <hr>

                <h6>Commission Rate:</h6>
                <ul class="list-unstyled small">
                    <li>• Persentase komisi dari setiap transaksi</li>
                    <li>• Default: 5%</li>
                    <li>• Dapat disesuaikan per CS</li>
                </ul>

                <hr>

                <h6>Target Bulanan:</h6>
                <ul class="list-unstyled small">
                    <li>• Target komisi yang harus dicapai per bulan</li>
                    <li>• Digunakan untuk tracking performance</li>
                    <li>• Dalam satuan Rupiah</li>
                </ul>

                <hr>

                <h6>Status:</h6>
                <ul class="list-unstyled small">
                    <li><span class="badge bg-success">Active</span> CS dapat menerima transaksi</li>
                    <li><span class="badge bg-secondary">Inactive</span> CS tidak dapat menerima transaksi</li>
                </ul>
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-lightbulb"></i> Tips
                </h5>
            </div>
            <div class="card-body">
                <ul class="small text-muted">
                    <li>Pastikan CS Name sesuai dengan yang digunakan di bot WhatsApp</li>
                    <li>Isi data kontak untuk memudahkan komunikasi</li>
                    <li>Set target yang realistis berdasarkan performa sebelumnya</li>
                    <li>Gunakan status Inactive untuk CS yang sedang cuti</li>
                </ul>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Format target monthly input
document.getElementById('target_monthly').addEventListener('blur', function() {
    const value = parseInt(this.value);
    if (!isNaN(value)) {
        this.value = value;
    }
});

// Auto format CS name to lowercase
document.getElementById('name').addEventListener('blur', function() {
    this.value = this.value.toLowerCase().replace(/[^a-z0-9]/g, '');
});

// Auto calculate suggested target based on commission rate
document.getElementById('commission_rate').addEventListener('input', function() {
    const rate = parseFloat(this.value);
    if (rate > 0) {
        // Suggest target based on average booking (500k) * 30 bookings * commission rate
        const suggestedTarget = Math.round((500000 * 30 * rate / 100) / 100000) * 100000;
        const targetField = document.getElementById('target_monthly');
        if (!targetField.value) {
            targetField.value = suggestedTarget;
        }
    }
});
</script>
@endpush
