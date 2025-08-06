@extends('layouts.app')

@section('title', 'Tambah Transaksi')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Tambah Transaksi Baru</h2>
            <a href="{{ route('transactions.index') }}" class="btn btn-outline-secondary">
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
                    <i class="bi bi-plus-circle"></i> Form Transaksi Baru
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('transactions.store') }}" method="POST">
                    @csrf

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="location" class="form-label">Apartemen <span class="text-danger">*</span></label>
                            <select name="location" id="location" class="form-select @error('location') is-invalid @enderror" required>
                                <option value="">Pilih Apartemen</option>
                                @foreach($apartments as $apartment)
                                    <option value="{{ $apartment->name }}" {{ old('location') == $apartment->name ? 'selected' : '' }}>
                                        {{ $apartment->name }}
                                    </option>
                                @endforeach
                            </select>
                            @error('location')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="unit" class="form-label">Unit <span class="text-danger">*</span></label>
                            <input type="text" name="unit" id="unit" class="form-control @error('unit') is-invalid @enderror"
                                   value="{{ old('unit') }}" placeholder="Contoh: L3/10D" required>
                            @error('unit')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="checkout_time" class="form-label">Checkout Time <span class="text-danger">*</span></label>
                            <input type="text" name="checkout_time" id="checkout_time" class="form-control @error('checkout_time') is-invalid @enderror"
                                   value="{{ old('checkout_time') }}" placeholder="Contoh: 14:00" required>
                            @error('checkout_time')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="duration" class="form-label">Durasi <span class="text-danger">*</span></label>
                            <input type="text" name="duration" id="duration" class="form-control @error('duration') is-invalid @enderror"
                                   value="{{ old('duration') }}" placeholder="Contoh: 3 jam" required>
                            @error('duration')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="payment_method" class="form-label">Payment Method <span class="text-danger">*</span></label>
                            <select name="payment_method" id="payment_method" class="form-select @error('payment_method') is-invalid @enderror" required>
                                <option value="">Pilih Payment Method</option>
                                @foreach($paymentMethods as $method)
                                    <option value="{{ $method }}" {{ old('payment_method') == $method ? 'selected' : '' }}>
                                        {{ $method }}
                                    </option>
                                @endforeach
                            </select>
                            @error('payment_method')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="customer_name" class="form-label">Customer Name <span class="text-danger">*</span></label>
                            <input type="text" name="customer_name" id="customer_name" class="form-control @error('customer_name') is-invalid @enderror"
                                   value="{{ old('customer_name') }}" required placeholder="Nama customer">
                            @error('customer_name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="customer_phone" class="form-label">Customer Phone</label>
                            <input type="text" name="customer_phone" id="customer_phone" class="form-control @error('customer_phone') is-invalid @enderror"
                                   value="{{ old('customer_phone') }}" placeholder="Nomor telepon customer">
                            @error('customer_phone')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="amount" class="form-label">Amount <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="number" name="amount" id="amount" class="form-control @error('amount') is-invalid @enderror"
                                       value="{{ old('amount') }}" placeholder="500000" min="0" step="1000" required>
                            </div>
                            @error('amount')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="commission" class="form-label">Komisi <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="number" name="commission" id="commission" class="form-control @error('commission') is-invalid @enderror"
                                       value="{{ old('commission') }}" placeholder="25000" min="0" step="1000" required>
                            </div>
                            @error('commission')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="date_only" class="form-label">Tanggal Transaksi <span class="text-danger">*</span></label>
                            <input type="date" name="date_only" id="date_only" class="form-control @error('date_only') is-invalid @enderror"
                                   value="{{ old('date_only', date('Y-m-d')) }}" required>
                            @error('date_only')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="net_amount" class="form-label">Net Amount</label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="text" id="net_amount" class="form-control" readonly>
                            </div>
                            <small class="text-muted">Otomatis dihitung: Amount - Komisi</small>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <div class="form-check">
                                <input type="checkbox" name="skip_financial" id="skip_financial" class="form-check-input" value="1" {{ old('skip_financial') ? 'checked' : '' }}>
                                <label for="skip_financial" class="form-check-label">
                                    Skip Financial (Tidak dihitung dalam laporan keuangan)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Simpan Transaksi
                            </button>
                            <a href="{{ route('transactions.index') }}" class="btn btn-outline-secondary">
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
                <h6>Format Input:</h6>
                <ul class="list-unstyled">
                    <li><strong>Unit:</strong> Format apartemen/unit (contoh: L3/10D)</li>
                    <li><strong>Checkout Time:</strong> Format waktu (contoh: 14:00)</li>
                    <li><strong>Durasi:</strong> Lama sewa (contoh: 3 jam)</li>
                    <li><strong>Amount:</strong> Total harga sewa</li>
                    <li><strong>Komisi:</strong> Komisi untuk marketing</li>
                </ul>

                <hr>

                <h6>Payment Methods:</h6>
                <ul class="list-unstyled">
                    <li><span class="badge bg-success">Cash</span> Pembayaran tunai</li>
                    <li><span class="badge bg-primary">TF</span> Transfer bank</li>
                </ul>

                <hr>

                <h6>Tips:</h6>
                <ul class="small text-muted">
                    <li>Net Amount akan otomatis dihitung</li>
                    <li>Gunakan Skip Financial untuk transaksi khusus</li>
                    <li>Pastikan data marketing dan apartemen sudah terdaftar</li>
                </ul>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Auto calculate net amount
function calculateNetAmount() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const commission = parseFloat(document.getElementById('commission').value) || 0;
    const netAmount = amount - commission;

    document.getElementById('net_amount').value = netAmount.toLocaleString('id-ID');
}

document.getElementById('amount').addEventListener('input', calculateNetAmount);
document.getElementById('commission').addEventListener('input', calculateNetAmount);

// Auto calculate commission based on amount
document.getElementById('amount').addEventListener('input', function() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    if (amount > 0) {
        // Default 5% commission
        const commission = Math.round(amount * 0.05);
        document.getElementById('commission').value = commission;
        calculateNetAmount();
    }
});

// Format number inputs
document.getElementById('amount').addEventListener('blur', function() {
    const value = parseInt(this.value);
    if (!isNaN(value)) {
        this.value = value;
    }
});

document.getElementById('commission').addEventListener('blur', function() {
    const value = parseInt(this.value);
    if (!isNaN(value)) {
        this.value = value;
    }
});
</script>
@endpush
