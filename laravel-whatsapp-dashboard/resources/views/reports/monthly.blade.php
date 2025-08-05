@extends('layouts.app')

@section('title', 'Laporan Bulanan')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Laporan Bulanan - {{ $selectedMonth->format('F Y') }}</h2>
            <div>
                <a href="{{ route('reports.export', ['type' => 'monthly', 'period' => $selectedMonth->format('Y-m')]) }}" class="btn btn-success">
                    <i class="bi bi-download"></i> Export Excel
                </a>
                <a href="{{ route('reports.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Month Selector -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" action="{{ route('reports.monthly') }}" class="row align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Pilih Bulan</label>
                        <input type="month" name="month" class="form-control" value="{{ $selectedMonth->format('Y-m') }}">
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-search"></i> Lihat Laporan
                        </button>
                    </div>
                    <div class="col-md-7 text-end">
                        <a href="{{ route('reports.monthly', ['month' => $selectedMonth->copy()->subMonth()->format('Y-m')]) }}" class="btn btn-outline-secondary">
                            <i class="bi bi-chevron-left"></i> Bulan Lalu
                        </a>
                        <a href="{{ route('reports.monthly', ['month' => now()->format('Y-m')]) }}" class="btn btn-outline-primary">
                            Bulan Ini
                        </a>
                        <a href="{{ route('reports.monthly', ['month' => $selectedMonth->copy()->addMonth()->format('Y-m')]) }}" class="btn btn-outline-secondary">
                            Bulan Depan <i class="bi bi-chevron-right"></i>
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Monthly Summary Cards -->
<div class="row mb-4">
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $monthlyStats['total_bookings'] }}</h4>
                <small class="text-white-50">Total Booking</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-success">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($monthlyStats['total_revenue'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Revenue</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-warning">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($monthlyStats['total_commission'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Total Komisi</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h5 class="text-white">Rp {{ number_format($monthlyStats['avg_booking_value'], 0, ',', '.') }}</h5>
                <small class="text-white-50">Rata-rata Booking</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $monthlyStats['unique_cs'] }}</h4>
                <small class="text-white-50">CS Aktif</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $monthlyStats['unique_apartments'] }}</h4>
                <small class="text-white-50">Apartemen Aktif</small>
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
                    <i class="bi bi-graph-up"></i> Trend Harian {{ $selectedMonth->format('F Y') }}
                </h5>
            </div>
            <div class="card-body">
                <canvas id="dailyTrendChart" height="100"></canvas>
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
                    <p class="text-muted text-center">Tidak ada data CS untuk bulan ini</p>
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
                    <p class="text-muted text-center">Tidak ada data apartemen untuk bulan ini</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Daily Breakdown Table -->
@if($dailyBreakdown->count() > 0)
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-calendar-day"></i> Breakdown Harian
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Tanggal</th>
                                <th>Booking</th>
                                <th>Cash</th>
                                <th>Transfer</th>
                                <th>Total Revenue</th>
                                <th>Komisi</th>
                                <th>Net Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($dailyBreakdown as $day)
                                <tr>
                                    <td>
                                        <a href="{{ route('reports.daily', ['date' => $day->date->format('Y-m-d')]) }}" class="text-decoration-none">
                                            {{ $day->date->format('d/m/Y') }}
                                        </a>
                                    </td>
                                    <td>{{ $day->total_bookings }}</td>
                                    <td>Rp {{ number_format($day->total_cash, 0, ',', '.') }}</td>
                                    <td>Rp {{ number_format($day->total_transfer, 0, ',', '.') }}</td>
                                    <td>Rp {{ number_format($day->total_gross, 0, ',', '.') }}</td>
                                    <td>Rp {{ number_format($day->total_commission, 0, ',', '.') }}</td>
                                    <td>Rp {{ number_format($day->total_gross - $day->total_commission, 0, ',', '.') }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                        <tfoot class="table-dark">
                            <tr>
                                <th>TOTAL</th>
                                <th>{{ $dailyBreakdown->sum('total_bookings') }}</th>
                                <th>Rp {{ number_format($dailyBreakdown->sum('total_cash'), 0, ',', '.') }}</th>
                                <th>Rp {{ number_format($dailyBreakdown->sum('total_transfer'), 0, ',', '.') }}</th>
                                <th>Rp {{ number_format($dailyBreakdown->sum('total_gross'), 0, ',', '.') }}</th>
                                <th>Rp {{ number_format($dailyBreakdown->sum('total_commission'), 0, ',', '.') }}</th>
                                <th>Rp {{ number_format($dailyBreakdown->sum('total_gross') - $dailyBreakdown->sum('total_commission'), 0, ',', '.') }}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endif
@endsection

@push('scripts')
@if($dailyBreakdown->count() > 0)
<script>
// Daily Trend Chart
const dailyCtx = document.getElementById('dailyTrendChart').getContext('2d');
const dailyData = @json($dailyBreakdown);

new Chart(dailyCtx, {
    type: 'line',
    data: {
        labels: dailyData.map(item => new Date(item.date).getDate()),
        datasets: [{
            label: 'Revenue',
            data: dailyData.map(item => item.total_gross),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }, {
            label: 'Bookings',
            data: dailyData.map(item => item.total_bookings),
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
