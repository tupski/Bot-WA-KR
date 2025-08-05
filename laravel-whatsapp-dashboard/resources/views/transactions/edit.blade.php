@extends('layouts.app')

@section('title', 'Edit Transaksi')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Edit Transaksi</h2>
            <div>
                <a href="{{ route('transactions.show', $transaction) }}" class="btn btn-outline-info">
                    <i class="bi bi-eye"></i> View
                </a>
                <a href="{{ route('transactions.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-pencil"></i> Form Edit Transaksi
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('transactions.update', $transaction) }}" method="POST">
                    @csrf
                    @method('PUT')
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="location" class="form-label">Apartemen <span class="text-danger">*</span></label>
                            <select name="location" id="location" class="form-select @error('location') is-invalid @enderror" required>
                                <option value="">Pilih Apartemen</option>
                                @foreach($apartments as $apartment)
                                    <option value="{{ $apartment->name }}" {{ (old('location') ?? $transaction->location) == $apartment->name ? 'selected' : '' }}>
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
                                   value="{{ old('unit') ?? $transaction->unit }}" placeholder="Contoh: L3/10D" required>
                            @error('unit')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="checkout_time" class="form-label">Checkout Time <span class="text-danger">*</span></label>
                            <input type="text" name="checkout_time" id="checkout_time" class="form-control @error('checkout_time') is-invalid @enderror" 
                                   value="{{ old('checkout_time') ?? $transaction->checkout_time }}" placeholder="Contoh: 14:00" required>
                            @error('checkout_time')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="duration" class="form-label">Durasi <span class="text-danger">*</span></label>
                            <input type="text" name="duration" id="duration" class="form-control @error('duration') is-invalid @enderror" 
                                   value="{{ old('duration') ?? $transaction->duration }}" placeholder="Contoh: 3 jam" required>
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
                                    <option value="{{ $method }}" {{ (old('payment_method') ?? $transaction->payment_method) == $method ? 'selected' : '' }}>
                                        {{ $method }}
                                    </option>
                                @endforeach
                            </select>
                            @error('payment_method')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="cs_name" class="form-label">Customer Service <span class="text-danger">*</span></label>
                            <select name="cs_name" id="cs_name" class="form-select @error('cs_name') is-invalid @enderror" required>
                                <option value="">Pilih CS</option>
                                @foreach($customerServices as $cs)
                                    <option value="{{ $cs->name }}" {{ (old('cs_name') ?? $transaction->cs_name) == $cs->name ? 'selected' : '' }}>
                                        {{ $cs->full_name ?? $cs->name }} ({{ $cs->name }})
                                    </option>
                                @endforeach
                            </select>
                            @error('cs_name')
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
                                       value="{{ old('amount') ?? $transaction->amount }}" placeholder="500000" min="0" step="1000" required>
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
                                       value="{{ old('commission') ?? $transaction->commission }}" placeholder="25000" min="0" step="1000" required>
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
                                   value="{{ old('date_only') ?? $transaction->date_only->format('Y-m-d') }}" required>
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
                                <input type="checkbox" name="skip_financial" id="skip_financial" class="form-check-input" value="1" 
                                       {{ (old('skip_financial') ?? $transaction->skip_financial) ? 'checked' : '' }}>
                                <label for="skip_financial" class="form-check-label">
                                    Skip Financial (Tidak dihitung dalam laporan keuangan)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Update Transaksi
                            </button>
                            <a href="{{ route('transactions.show', $transaction) }}" class="btn btn-outline-info">
                                <i class="bi bi-eye"></i> View
                            </a>
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
                    <i class="bi bi-info-circle"></i> Info Transaksi
                </h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <td><strong>ID:</strong></td>
                        <td>{{ $transaction->id }}</td>
                    </tr>
                    <tr>
                        <td><strong>Message ID:</strong></td>
                        <td><small>{{ $transaction->message_id }}</small></td>
                    </tr>
                    <tr>
                        <td><strong>Dibuat:</strong></td>
                        <td>{{ $transaction->created_at->format('d/m/Y H:i') }}</td>
                    </tr>
                    <tr>
                        <td><strong>Diupdate:</strong></td>
                        <td>{{ $transaction->updated_at->format('d/m/Y H:i') }}</td>
                    </tr>
                </table>

                <hr>

                <h6>Current Values:</h6>
                <ul class="list-unstyled small">
                    <li><strong>Amount:</strong> Rp {{ number_format($transaction->amount, 0, ',', '.') }}</li>
                    <li><strong>Commission:</strong> Rp {{ number_format($transaction->commission, 0, ',', '.') }}</li>
                    <li><strong>Net Amount:</strong> Rp {{ number_format($transaction->net_amount, 0, ',', '.') }}</li>
                    <li><strong>Skip Financial:</strong> {{ $transaction->skip_financial ? 'Yes' : 'No' }}</li>
                </ul>

                <hr>

                <div class="alert alert-warning alert-sm">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Perhatian:</strong> Perubahan data transaksi akan mempengaruhi laporan dan statistik.
                </div>
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

// Calculate on page load
document.addEventListener('DOMContentLoaded', function() {
    calculateNetAmount();
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
