@extends('layouts.app')

@section('title', 'Custom Report')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Custom Report - {{ $start->format('d/m/Y') }} s/d {{ $end->format('d/m/Y') }}</h2>
            <div>
                <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Date Range Selector -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-calendar-range"></i> Pilih Periode
                </h5>
            </div>
            <div class="card-body">
                <form method="GET" action="{{ route('reports.custom') }}" class="row align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Tanggal Mulai</label>
                        <input type="date" name="start_date" class="form-control" value="{{ $start->format('Y-m-d') }}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Tanggal Selesai</label>
                        <input type="date" name="end_date" class="form-control" value="{{ $end->format('Y-m-d') }}">
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-search"></i> Generate Report
                        </button>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="btn-group">
                            <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                Quick Select
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="{{ route('reports.custom', ['start_date' => now()->format('Y-m-d'), 'end_date' => now()->format('Y-m-d')]) }}">Hari Ini</a></li>
                                <li><a class="dropdown-item" href="{{ route('reports.custom', ['start_date' => now()->subDays(6)->format('Y-m-d'), 'end_date' => now()->format('Y-m-d')]) }}">7 Hari Terakhir</a></li>
                                <li><a class="dropdown-item" href="{{ route('reports.custom', ['start_date' => now()->startOfMonth()->format('Y-m-d'), 'end_date' => now()->format('Y-m-d')]) }}">Bulan Ini</a></li>
                                <li><a class="dropdown-item" href="{{ route('reports.custom', ['start_date' => now()->subMonth()->startOfMonth()->format('Y-m-d'), 'end_date' => now()->subMonth()->endOfMonth()->format('Y-m-d')]) }}">Bulan Lalu</a></li>
                            </ul>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Summary Cards -->
<div class="row mb-4">
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $customStats['total_bookings'] }}</h4>
                <small class="text-white-50">Total Booking</small>
                <div class="mt-1">
                    <small class="text-white-50">{{ $customStats['days_count'] }} hari</small>
                </div>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-success">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($customStats['total_revenue'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Revenue</small>
                <div class="mt-1">
                    <small class="text-white-50">Rp {{ number_format($customStats['total_revenue'] / $customStats['days_count'], 0, ',', '.') }}/hari</small>
                </div>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-warning">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($customStats['total_commission'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Komisi</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($customStats['avg_booking_value'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Rata-rata Booking</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $customStats['unique_cs'] }}</h4>
                <small class="text-white-50">CS Aktif</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $customStats['unique_apartments'] }}</h4>
                <small class="text-white-50">Apartemen Aktif</small>
            </div>
        </div>
    </div>
</div>

<!-- Payment Method Breakdown -->
<div class="row mb-4">
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-credit-card"></i> Payment Method Breakdown
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-6 text-center">
                        <h4 class="text-success">Rp {{ number_format($customStats['total_cash'], 0, ',', '.') }}</h4>
                        <p class="text-muted">Cash</p>
                        <small class="text-muted">{{ $customStats['total_cash'] > 0 ? round(($customStats['total_cash'] / $customStats['total_revenue']) * 100, 1) : 0 }}%</small>
                    </div>
                    <div class="col-6 text-center">
                        <h4 class="text-primary">Rp {{ number_format($customStats['total_transfer'], 0, ',', '.') }}</h4>
                        <p class="text-muted">Transfer</p>
                        <small class="text-muted">{{ $customStats['total_transfer'] > 0 ? round(($customStats['total_transfer'] / $customStats['total_revenue']) * 100, 1) : 0 }}%</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-calculator"></i> Financial Summary
                </h5>
            </div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <td>Gross Revenue:</td>
                        <td class="text-end"><strong>Rp {{ number_format($customStats['total_revenue'], 0, ',', '.') }}</strong></td>
                    </tr>
                    <tr>
                        <td>Total Commission:</td>
                        <td class="text-end">- Rp {{ number_format($customStats['total_commission'], 0, ',', '.') }}</td>
                    </tr>
                    <tr class="table-success">
                        <td><strong>Net Revenue:</strong></td>
                        <td class="text-end"><strong>Rp {{ number_format($customStats['total_net'], 0, ',', '.') }}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- Daily Trend Chart -->
@if($dailyBreakdown->count() > 0)
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i> Trend Periode {{ $start->format('d/m/Y') }} - {{ $end->format('d/m/Y') }}
                </h5>
            </div>
            <div class="card-body">
                <canvas id="customTrendChart" height="100"></canvas>
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
                                    <th>Revenue</th>
                                    <th>Komisi</th>
                                    <th>Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($csPerformance as $cs)
                                    <tr>
                                        <td><strong>{{ $cs->customer_name }}</strong></td>
                                        <td>{{ $cs->total_bookings }}</td>
                                        <td>Rp {{ number_format($cs->total_revenue, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($cs->total_commission, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($cs->avg_amount, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Tidak ada data CS untuk periode ini</p>
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
                                    <th>Komisi</th>
                                    <th>Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($apartmentPerformance as $apartment)
                                    <tr>
                                        <td><strong>{{ $apartment->location }}</strong></td>
                                        <td>{{ $apartment->total_bookings }}</td>
                                        <td>Rp {{ number_format($apartment->total_revenue, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($apartment->total_commission, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($apartment->avg_amount, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Tidak ada data apartemen untuk periode ini</p>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
@if($dailyBreakdown->count() > 0)
<script>
// Custom Trend Chart
const customCtx = document.getElementById('customTrendChart').getContext('2d');
const customData = @json($dailyBreakdown);

new Chart(customCtx, {
    type: 'line',
    data: {
        labels: customData.map(item => new Date(item.date).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit'})),
        datasets: [{
            label: 'Revenue',
            data: customData.map(item => item.total_gross),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }, {
            label: 'Bookings',
            data: customData.map(item => item.total_bookings),
            borderColor: '#38ef7d',
            backgroundColor: 'rgba(56, 239, 125, 0.1)',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y1'
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
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        if (context.datasetIndex === 0) {
                            return 'Revenue: Rp ' + context.parsed.y.toLocaleString('id-ID');
                        } else {
                            return 'Booking: ' + context.parsed.y + ' transaksi';
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
