@extends('layouts.app')

@section('title', 'Detail Transaksi')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Detail Transaksi #{{ $transaction->id }}</h2>
            <div>
                <a href="{{ route('transactions.edit', $transaction) }}" class="btn btn-warning">
                    <i class="bi bi-pencil"></i> Edit
                </a>
                <button type="button" class="btn btn-danger" onclick="deleteTransaction({{ $transaction->id }})">
                    <i class="bi bi-trash"></i> Hapus
                </button>
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
                    <i class="bi bi-receipt"></i> Informasi Transaksi
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr>
                                <td width="40%"><strong>ID Transaksi:</strong></td>
                                <td>{{ $transaction->id }}</td>
                            </tr>
                            <tr>
                                <td><strong>Message ID:</strong></td>
                                <td><code>{{ $transaction->message_id }}</code></td>
                            </tr>
                            <tr>
                                <td><strong>Tanggal:</strong></td>
                                <td>{{ $transaction->date_only->format('d F Y') }}</td>
                            </tr>
                            <tr>
                                <td><strong>Waktu Input:</strong></td>
                                <td>{{ $transaction->created_at->format('d/m/Y H:i:s') }}</td>
                            </tr>
                            <tr>
                                <td><strong>Apartemen:</strong></td>
                                <td><span class="badge bg-primary">{{ $transaction->location }}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Unit:</strong></td>
                                <td><strong>{{ $transaction->unit }}</strong></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr>
                                <td width="40%"><strong>Checkout Time:</strong></td>
                                <td>{{ $transaction->checkout_time }}</td>
                            </tr>
                            <tr>
                                <td><strong>Durasi:</strong></td>
                                <td>{{ $transaction->duration }}</td>
                            </tr>
                            <tr>
                                <td><strong>Payment Method:</strong></td>
                                <td>
                                    <span class="badge {{ $transaction->payment_method == 'Cash' ? 'bg-success' : 'bg-info' }}">
                                        {{ $transaction->payment_method }}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Customer Service:</strong></td>
                                <td><span class="badge bg-secondary">{{ $transaction->cs_name }}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Skip Financial:</strong></td>
                                <td>
                                    @if($transaction->skip_financial)
                                        <span class="badge bg-warning">Yes</span>
                                    @else
                                        <span class="badge bg-success">No</span>
                                    @endif
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Last Update:</strong></td>
                                <td>{{ $transaction->updated_at->format('d/m/Y H:i:s') }}</td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-calculator"></i> Rincian Keuangan
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h3 class="text-primary">Rp {{ number_format($transaction->amount, 0, ',', '.') }}</h3>
                                <p class="mb-0 text-muted">Total Amount</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h3 class="text-warning">Rp {{ number_format($transaction->commission, 0, ',', '.') }}</h3>
                                <p class="mb-0 text-muted">Komisi CS</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-light">
                            <div class="card-body text-center">
                                <h3 class="text-success">Rp {{ number_format($transaction->net_amount, 0, ',', '.') }}</h3>
                                <p class="mb-0 text-muted">Net Amount</p>
                            </div>
                        </div>
                    </div>
                </div>

                <hr>

                <div class="row">
                    <div class="col-12">
                        <h6>Perhitungan:</h6>
                        <table class="table table-sm">
                            <tr>
                                <td>Total Amount</td>
                                <td class="text-end">Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                            </tr>
                            <tr>
                                <td>Komisi CS ({{ $transaction->cs_name }})</td>
                                <td class="text-end">- Rp {{ number_format($transaction->commission, 0, ',', '.') }}</td>
                            </tr>
                            <tr class="table-success">
                                <td><strong>Net Amount</strong></td>
                                <td class="text-end"><strong>Rp {{ number_format($transaction->net_amount, 0, ',', '.') }}</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-gear"></i> Aksi
                </h5>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    <a href="{{ route('transactions.edit', $transaction) }}" class="btn btn-warning">
                        <i class="bi bi-pencil"></i> Edit Transaksi
                    </a>
                    <button type="button" class="btn btn-danger" onclick="deleteTransaction({{ $transaction->id }})">
                        <i class="bi bi-trash"></i> Hapus Transaksi
                    </button>
                    <hr>
                    <a href="{{ route('transactions.index') }}" class="btn btn-outline-secondary">
                        <i class="bi bi-list"></i> Semua Transaksi
                    </a>
                    <a href="{{ route('transactions.create') }}" class="btn btn-outline-primary">
                        <i class="bi bi-plus-circle"></i> Transaksi Baru
                    </a>
                </div>
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Metadata
                </h5>
            </div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <td><strong>Created:</strong></td>
                        <td>{{ $transaction->created_at->diffForHumans() }}</td>
                    </tr>
                    <tr>
                        <td><strong>Updated:</strong></td>
                        <td>{{ $transaction->updated_at->diffForHumans() }}</td>
                    </tr>
                    <tr>
                        <td><strong>Source:</strong></td>
                        <td>
                            @if(str_starts_with($transaction->message_id, 'manual_'))
                                <span class="badge bg-info">Manual Input</span>
                            @else
                                <span class="badge bg-success">WhatsApp Bot</span>
                            @endif
                        </td>
                    </tr>
                </table>

                @if(!$transaction->skip_financial)
                    <div class="alert alert-info alert-sm mt-3">
                        <i class="bi bi-info-circle"></i>
                        Transaksi ini <strong>dihitung</strong> dalam laporan keuangan.
                    </div>
                @else
                    <div class="alert alert-warning alert-sm mt-3">
                        <i class="bi bi-exclamation-triangle"></i>
                        Transaksi ini <strong>tidak dihitung</strong> dalam laporan keuangan.
                    </div>
                @endif
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i> Quick Stats
                </h5>
            </div>
            <div class="card-body">
                @php
                    $todayTransactions = \App\Models\Transaction::byDate($transaction->date_only)->get();
                    $csTransactions = \App\Models\Transaction::byCs($transaction->cs_name)->byDate($transaction->date_only)->get();
                    $apartmentTransactions = \App\Models\Transaction::byLocation($transaction->location)->byDate($transaction->date_only)->get();
                @endphp

                <small class="text-muted">Pada tanggal {{ $transaction->date_only->format('d/m/Y') }}:</small>
                <ul class="list-unstyled mt-2">
                    <li><strong>Total transaksi:</strong> {{ $todayTransactions->count() }}</li>
                    <li><strong>Transaksi {{ $transaction->cs_name }}:</strong> {{ $csTransactions->count() }}</li>
                    <li><strong>Transaksi {{ $transaction->location }}:</strong> {{ $apartmentTransactions->count() }}</li>
                </ul>

                <hr>

                <small class="text-muted">Revenue pada hari ini:</small>
                <ul class="list-unstyled mt-2">
                    <li><strong>Total:</strong> Rp {{ number_format($todayTransactions->sum('amount'), 0, ',', '.') }}</li>
                    <li><strong>{{ $transaction->cs_name }}:</strong> Rp {{ number_format($csTransactions->sum('amount'), 0, ',', '.') }}</li>
                    <li><strong>{{ $transaction->location }}:</strong> Rp {{ number_format($apartmentTransactions->sum('amount'), 0, ',', '.') }}</li>
                </ul>
            </div>
        </div>
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
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Peringatan!</strong> Anda akan menghapus transaksi berikut:
                </div>
                
                <table class="table table-sm">
                    <tr>
                        <td><strong>ID:</strong></td>
                        <td>{{ $transaction->id }}</td>
                    </tr>
                    <tr>
                        <td><strong>Unit:</strong></td>
                        <td>{{ $transaction->unit }}</td>
                    </tr>
                    <tr>
                        <td><strong>Amount:</strong></td>
                        <td>Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                    </tr>
                    <tr>
                        <td><strong>CS:</strong></td>
                        <td>{{ $transaction->cs_name }}</td>
                    </tr>
                </table>

                <p class="text-danger"><strong>Tindakan ini tidak dapat dibatalkan!</strong></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                <form id="deleteForm" method="POST" style="display: inline;">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">
                        <i class="bi bi-trash"></i> Ya, Hapus Transaksi
                    </button>
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
</script>
@endpush
