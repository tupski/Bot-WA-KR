@extends('layouts.app')

@section('title', 'Manajemen Transaksi')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Manajemen Transaksi</h2>
            <div>
                <a href="{{ route('transactions.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Tambah Transaksi
                </a>
                <button type="button" class="btn btn-success" onclick="exportTransactions()">
                    <i class="bi bi-download"></i> Export Excel
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Statistics Cards -->
<div class="row mb-4">
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h5 class="text-white">{{ $stats['total_transactions'] }}</h5>
                <small class="text-white-50">Total Transaksi</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-success">
            <div class="card-body text-center">
                <h6 class="text-white">Rp {{ number_format($stats['total_revenue'], 0, ',', '.') }}</h6>
                <small class="text-white-50">Total Revenue</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-warning">
            <div class="card-body text-center">
                <h6 class="text-white">Rp {{ number_format($stats['total_commission'], 0, ',', '.') }}</h6>
                <small class="text-white-50">Total Komisi</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h6 class="text-white">Rp {{ number_format($stats['total_cash'], 0, ',', '.') }}</h6>
                <small class="text-white-50">Cash</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h6 class="text-white">Rp {{ number_format($stats['total_transfer'], 0, ',', '.') }}</h6>
                <small class="text-white-50">Transfer</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h6 class="text-white">Rp {{ number_format($stats['total_net'], 0, ',', '.') }}</h6>
                <small class="text-white-50">Net Amount</small>
            </div>
        </div>
    </div>
</div>

<!-- Filters -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="card-title mb-0">
            <i class="bi bi-funnel"></i> Filter Transaksi
        </h5>
    </div>
    <div class="card-body">
        <form method="GET" action="{{ route('transactions.index') }}" id="filterForm">
            <div class="row">
                <div class="col-md-2">
                    <label class="form-label">Tanggal Dari</label>
                    <input type="date" name="date_from" class="form-control" value="{{ request('date_from') }}">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Tanggal Sampai</label>
                    <input type="date" name="date_to" class="form-control" value="{{ request('date_to') }}">
                </div>
                <div class="col-md-2">
                    <label class="form-label">Apartemen</label>
                    <select name="location" class="form-select">
                        <option value="">Semua Apartemen</option>
                        @foreach($apartments as $apartment)
                            <option value="{{ $apartment }}" {{ request('location') == $apartment ? 'selected' : '' }}>
                                {{ $apartment }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Customer</label>
                    <select name="customer_name" class="form-select">
                        <option value="">Semua Customer</option>
                        @foreach($customerServices as $cs)
                            <option value="{{ $cs }}" {{ request('customer_name') == $cs ? 'selected' : '' }}>
                                {{ $cs }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Payment Method</label>
                    <select name="payment_method" class="form-select">
                        <option value="">Semua Payment</option>
                        @foreach($paymentMethods as $method)
                            <option value="{{ $method }}" {{ request('payment_method') == $method ? 'selected' : '' }}>
                                {{ $method }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label">Search</label>
                    <input type="text" name="search" class="form-control" placeholder="Unit, Apartemen, Marketing..." value="{{ request('search') }}">
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-search"></i> Filter
                    </button>
                    <a href="{{ route('transactions.index') }}" class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-clockwise"></i> Reset
                    </a>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Transactions Table -->
<div class="card">
    <div class="card-header">
        <h5 class="card-title mb-0">
            <i class="bi bi-list-ul"></i> Daftar Transaksi
        </h5>
    </div>
    <div class="card-body">
        @if($transactions->count() > 0)
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>
                                <a href="{{ request()->fullUrlWithQuery(['sort_by' => 'date_only', 'sort_order' => request('sort_order') == 'asc' ? 'desc' : 'asc']) }}" class="text-decoration-none text-white">
                                    Tanggal
                                    @if(request('sort_by') == 'date_only')
                                        <i class="bi bi-arrow-{{ request('sort_order') == 'asc' ? 'up' : 'down' }}"></i>
                                    @endif
                                </a>
                            </th>
                            <th>Unit</th>
                            <th>Apartemen</th>
                            <th>Checkout</th>
                            <th>Durasi</th>
                            <th>Marketing</th>
                            <th>
                                <a href="{{ request()->fullUrlWithQuery(['sort_by' => 'amount', 'sort_order' => request('sort_order') == 'asc' ? 'desc' : 'asc']) }}" class="text-decoration-none text-white">
                                    Amount
                                    @if(request('sort_by') == 'amount')
                                        <i class="bi bi-arrow-{{ request('sort_order') == 'asc' ? 'up' : 'down' }}"></i>
                                    @endif
                                </a>
                            </th>
                            <th>Komisi</th>
                            <th>Payment</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($transactions as $transaction)
                            <tr>
                                <td>{{ $transaction->date_only->format('d/m/Y') }}</td>
                                <td><strong>{{ $transaction->unit }}</strong></td>
                                <td>{{ $transaction->location }}</td>
                                <td>{{ $transaction->checkout_time }}</td>
                                <td>{{ $transaction->duration }}</td>
                                <td>{{ $transaction->customer_name }}</td>
                                <td>Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                                <td>Rp {{ number_format($transaction->commission, 0, ',', '.') }}</td>
                                <td>
                                    <span class="badge {{ $transaction->payment_method == 'Cash' ? 'bg-success' : 'bg-primary' }}">
                                        {{ $transaction->payment_method }}
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="{{ route('transactions.show', $transaction) }}" class="btn btn-outline-info" title="View">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                        <a href="{{ route('transactions.edit', $transaction) }}" class="btn btn-outline-warning" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </a>
                                        <button type="button" class="btn btn-outline-danger" onclick="deleteTransaction({{ $transaction->id }})" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div>
                    Menampilkan {{ $transactions->firstItem() }} - {{ $transactions->lastItem() }} dari {{ $transactions->total() }} transaksi
                </div>
                <div>
                    {{ $transactions->links() }}
                </div>
            </div>
        @else
            <div class="text-center py-5">
                <i class="bi bi-inbox h1 text-muted"></i>
                <p class="text-muted">Tidak ada transaksi yang ditemukan.</p>
                <a href="{{ route('transactions.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Tambah Transaksi Pertama
                </a>
            </div>
        @endif
    </div>
</div>

<!-- Delete Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Konfirmasi Hapus</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                <form id="deleteForm" method="POST" style="display: inline;">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">Hapus</button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function deleteTransaction(id) {
    const form = document.getElementById('deleteForm');
    form.action = `/transactions/${id}`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

function exportTransactions() {
    const form = document.getElementById('filterForm');
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);
    window.location.href = `{{ route('transactions.export') }}?${params.toString()}`;
}
</script>
@endpush
