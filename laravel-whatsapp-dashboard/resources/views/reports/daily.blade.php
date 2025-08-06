@extends('layouts.app')

@section('title', 'Laporan Harian')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <h2>Laporan Harian - {{ $selectedDate->format('d F Y') }}</h2>
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    Business Day: {{ $selectedDate->copy()->subDay()->format('d/m/Y') }} 12:00 - {{ $selectedDate->format('d/m/Y') }} 11:59 WIB
                    <br>
                    <em>Mengikuti logika bot WhatsApp untuk konsistensi data</em>
                </small>
            </div>
            <div>
                <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Date Selector -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" action="{{ route('reports.daily') }}" class="row align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Pilih Tanggal</label>
                        <input type="date" name="date" class="form-control" value="{{ $selectedDate->format('Y-m-d') }}">
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-search"></i> Lihat Laporan
                        </button>
                    </div>
                    <div class="col-md-7 text-end">
                        <a href="{{ route('reports.daily', ['date' => $selectedDate->subDay()->format('Y-m-d')]) }}" class="btn btn-outline-secondary">
                            <i class="bi bi-chevron-left"></i> Kemarin
                        </a>
                        <a href="{{ route('reports.daily', ['date' => now()->format('Y-m-d')]) }}" class="btn btn-outline-primary">
                            Hari Ini
                        </a>
                        <a href="{{ route('reports.daily', ['date' => $selectedDate->addDays(2)->format('Y-m-d')]) }}" class="btn btn-outline-secondary">
                            Besok <i class="bi bi-chevron-right"></i>
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

@if($dailySummary)
<!-- Daily Summary Cards -->
<div class="row mb-4">
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $dailySummary->total_bookings }}</h4>
                <small class="text-white-50">Total Booking</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-success">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($dailySummary->total_gross, 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Revenue</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-warning">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($dailySummary->total_commission, 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Komisi</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($dailySummary->total_cash, 0, ',', '.') }}</h5>
                <small class="text-white-50">Cash</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($dailySummary->total_transfer, 0, ',', '.') }}</h5>
                <small class="text-white-50">Transfer</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($dailySummary->total_gross - $dailySummary->total_commission, 0, ',', '.') }}</h5>
                <small class="text-white-50">Net Revenue</small>
            </div>
        </div>
    </div>
</div>
@endif

<div class="row">
    <!-- CS Performance -->
    <div class="col-xl-6 col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-people"></i> Performance CS
                </h5>
            </div>
            <div class="card-body">
                @if($csPerformance->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>CS Name</th>
                                    <th>Booking</th>
                                    <th>Cash</th>
                                    <th>Transfer</th>
                                    <th>Komisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($csPerformance as $cs)
                                    <tr>
                                        <td><strong>{{ $cs->cs_name }}</strong></td>
                                        <td>{{ $cs->total_bookings }}</td>
                                        <td>Rp {{ number_format($cs->total_cash, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($cs->total_transfer, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($cs->total_commission, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Tidak ada data CS untuk tanggal ini</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Apartment Performance -->
    <div class="col-xl-6 col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-building"></i> Performance Apartemen
                </h5>
            </div>
            <div class="card-body">
                @if($apartmentPerformance->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Apartemen</th>
                                    <th>Booking</th>
                                    <th>Revenue</th>
                                    <th>Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($apartmentPerformance as $apartment)
                                    <tr>
                                        <td><strong>{{ $apartment->location }}</strong></td>
                                        <td>{{ $apartment->booking_count }}</td>
                                        <td>Rp {{ number_format($apartment->total_revenue, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($apartment->avg_amount, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Tidak ada data apartemen untuk tanggal ini</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Hourly Breakdown Chart -->
@if($hourlyBreakdown->count() > 0)
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-clock"></i> Breakdown Per Jam
                </h5>
            </div>
            <div class="card-body">
                <canvas id="hourlyChart" height="100"></canvas>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Transactions List -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-list"></i> Daftar Transaksi ({{ $transactions->count() }} transaksi)
                </h5>
            </div>
            <div class="card-body">
                @if($transactions->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>Unit</th>
                                    <th>Apartemen</th>
                                    <th>Checkout</th>
                                    <th>Durasi</th>
                                    <th>CS</th>
                                    <th>Amount</th>
                                    <th>Komisi</th>
                                    <th>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($transactions as $transaction)
                                    <tr>
                                        <td>{{ $transaction->created_at->format('H:i') }}</td>
                                        <td><strong>{{ $transaction->unit }}</strong></td>
                                        <td>{{ $transaction->location }}</td>
                                        <td>{{ $transaction->checkout_time }}</td>
                                        <td>{{ $transaction->duration }}</td>
                                        <td>{{ $transaction->cs_name }}</td>
                                        <td>Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($transaction->commission, 0, ',', '.') }}</td>
                                        <td>
                                            <span class="badge {{ $transaction->payment_method == 'Cash' ? 'bg-success' : 'bg-primary' }}">
                                                {{ $transaction->payment_method }}
                                            </span>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="text-center py-5">
                        <i class="bi bi-inbox h1 text-muted"></i>
                        <p class="text-muted">Tidak ada transaksi pada tanggal {{ $selectedDate->format('d F Y') }}</p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
@if($hourlyBreakdown->count() > 0)
<script>
// Hourly Breakdown Chart
const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
const hourlyData = @json($hourlyBreakdown);

// Create 24-hour array
const hours = Array.from({length: 24}, (_, i) => i);
const bookingData = hours.map(hour => {
    const found = hourlyData.find(item => item.hour == hour);
    return found ? found.booking_count : 0;
});
const revenueData = hours.map(hour => {
    const found = hourlyData.find(item => item.hour == hour);
    return found ? found.total_revenue : 0;
});

new Chart(hourlyCtx, {
    type: 'bar',
    data: {
        labels: hours.map(h => h.toString().padStart(2, '0') + ':00'),
        datasets: [{
            label: 'Booking Count',
            data: bookingData,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: '#667eea',
            borderWidth: 1,
            yAxisID: 'y1'
        }, {
            label: 'Revenue',
            data: revenueData,
            type: 'line',
            borderColor: '#38ef7d',
            backgroundColor: 'rgba(56, 239, 125, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: {
                    callback: function(value) {
                        return 'Rp ' + value.toLocaleString('id-ID');
                    }
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                ticks: {
                    stepSize: 1
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        if (context.datasetIndex === 0) {
                            return 'Booking: ' + context.parsed.y + ' transaksi';
                        } else {
                            return 'Revenue: Rp ' + context.parsed.y.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    }
});
</script>
@endif
@endpush
