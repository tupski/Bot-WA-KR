@extends('layouts.app')

@section('title', 'Detail Apartemen - ' . $apartment->name)

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h2>{{ $apartment->name }}</h2>
                <p class="text-muted mb-0">{{ $apartment->location }}</p>
            </div>
            <div>
                <a href="{{ route('apartments.edit', $apartment) }}" class="btn btn-outline-primary">
                    <i class="bi bi-pencil"></i> Edit
                </a>
                <a href="{{ route('apartments.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Apartment Info -->
<div class="row mb-4">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-building"></i> Informasi Apartemen
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr>
                                <td width="120"><strong>Nama:</strong></td>
                                <td>{{ $apartment->name }}</td>
                            </tr>
                            <tr>
                                <td><strong>Kode:</strong></td>
                                <td><span class="badge bg-primary">{{ $apartment->code }}</span></td>
                            </tr>
                            <tr>
                                <td><strong>Lokasi:</strong></td>
                                <td>{{ $apartment->location }}</td>
                            </tr>
                            <tr>
                                <td><strong>Status:</strong></td>
                                <td>
                                    <span class="badge bg-{{ $apartment->is_active ? 'success' : 'danger' }}">
                                        {{ $apartment->is_active ? 'Aktif' : 'Tidak Aktif' }}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <table class="table table-borderless">
                            <tr>
                                <td width="120"><strong>Dibuat:</strong></td>
                                <td>{{ $apartment->created_at->format('d M Y H:i') }}</td>
                            </tr>
                            <tr>
                                <td><strong>Diperbarui:</strong></td>
                                <td>{{ $apartment->updated_at->format('d M Y H:i') }}</td>
                            </tr>
                            @if($apartment->description)
                            <tr>
                                <td><strong>Deskripsi:</strong></td>
                                <td>{{ $apartment->description }}</td>
                            </tr>
                            @endif
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
                    <i class="bi bi-graph-up"></i> Statistik
                </h5>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-6">
                        <h4 class="text-primary">{{ $stats['total_transactions'] }}</h4>
                        <small class="text-muted">Total Transaksi</small>
                    </div>
                    <div class="col-6">
                        <h4 class="text-success">{{ number_format($stats['total_revenue']) }}</h4>
                        <small class="text-muted">Total Revenue</small>
                    </div>
                </div>
                <hr>
                <div class="row text-center">
                    <div class="col-6">
                        <h5 class="text-info">{{ $stats['this_month_transactions'] }}</h5>
                        <small class="text-muted">Bulan Ini</small>
                    </div>
                    <div class="col-6">
                        <h5 class="text-warning">{{ number_format($stats['avg_transaction']) }}</h5>
                        <small class="text-muted">Rata-rata</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- WhatsApp Groups -->
        @if($whatsappGroups->count() > 0)
        <div class="card mt-3">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-whatsapp"></i> Grup WhatsApp
                </h5>
            </div>
            <div class="card-body">
                @foreach($whatsappGroups as $group)
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>{{ $group->group_name }}</strong>
                            <br><small class="text-muted">{{ $group->participant_count }} peserta</small>
                        </div>
                        <span class="badge bg-{{ $group->status_color }}">
                            {{ $group->status_text }}
                        </span>
                    </div>
                    @if(!$loop->last)<hr>@endif
                @endforeach
            </div>
        </div>
        @endif
    </div>
</div>

<!-- Recent Transactions -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-clock-history"></i> Transaksi Terbaru
                    </h5>
                    <a href="{{ route('transactions.index', ['apartment_id' => $apartment->id]) }}" class="btn btn-sm btn-outline-primary">
                        Lihat Semua
                    </a>
                </div>
            </div>
            <div class="card-body">
                @if($recentTransactions->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Unit</th>
                                    <th>Customer</th>
                                    <th>Checkout</th>
                                    <th>Durasi</th>
                                    <th>Payment</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($recentTransactions as $transaction)
                                    <tr>
                                        <td>
                                            <small>{{ $transaction->created_at->format('d/m/Y') }}</small>
                                        </td>
                                        <td>
                                            <strong>{{ $transaction->unit }}</strong>
                                        </td>
                                        <td>
                                            {{ $transaction->customer_name }}
                                            @if($transaction->customer_phone)
                                                <br><small class="text-muted">{{ $transaction->customer_phone }}</small>
                                            @endif
                                        </td>
                                        <td>{{ $transaction->checkout_time }}</td>
                                        <td>{{ $transaction->duration }} jam</td>
                                        <td>
                                            <span class="badge bg-info">{{ $transaction->payment_method }}</span>
                                        </td>
                                        <td>
                                            <strong>Rp {{ number_format($transaction->amount) }}</strong>
                                        </td>
                                        <td>
                                            <span class="badge bg-success">Completed</span>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="text-center py-4">
                        <i class="bi bi-inbox h1 text-muted"></i>
                        <h5 class="text-muted">Belum ada transaksi</h5>
                        <p class="text-muted">Transaksi untuk apartemen ini akan muncul di sini</p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Performance Chart -->
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-bar-chart"></i> Performa 30 Hari Terakhir
                </h5>
            </div>
            <div class="card-body">
                <canvas id="performanceChart" height="100"></canvas>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
// Performance Chart
const ctx = document.getElementById('performanceChart').getContext('2d');
const performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: @json($chartData['labels']),
        datasets: [{
            label: 'Transaksi',
            data: @json($chartData['transactions']),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            tension: 0.1
        }, {
            label: 'Revenue (Ribuan)',
            data: @json($chartData['revenue']),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            tension: 0.1,
            yAxisID: 'y1'
        }]
    },
    options: {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Jumlah Transaksi'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Revenue (Ribuan)'
                },
                grid: {
                    drawOnChartArea: false,
                },
            }
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Performa Apartemen {{ $apartment->name }}'
            }
        }
    }
});
</script>
@endpush
