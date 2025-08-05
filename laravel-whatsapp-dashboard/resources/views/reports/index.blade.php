@extends('layouts.app')

@section('title', 'Laporan & Analytics')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Laporan & Analytics</h2>
            <div>
                <a href="{{ route('reports.daily') }}" class="btn btn-outline-primary">
                    <i class="bi bi-calendar-day"></i> Laporan Harian
                </a>
                <a href="{{ route('reports.monthly') }}" class="btn btn-outline-success">
                    <i class="bi bi-calendar-month"></i> Laporan Bulanan
                </a>
                <a href="{{ route('reports.custom') }}" class="btn btn-outline-info">
                    <i class="bi bi-calendar-range"></i> Custom Period
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Current Month Overview -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i> Overview Bulan Ini ({{ Carbon\Carbon::now()->format('F Y') }})
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card">
                            <div class="card-body text-center">
                                <h4 class="text-white">{{ $currentMonthStats['total_bookings'] }}</h4>
                                <small class="text-white-50">Total Booking</small>
                                @if($lastMonthStats['total_bookings'] > 0)
                                    @php
                                        $change = $currentMonthStats['total_bookings'] - $lastMonthStats['total_bookings'];
                                        $percentage = round(($change / $lastMonthStats['total_bookings']) * 100, 1);
                                    @endphp
                                    <div class="mt-1">
                                        <small class="text-white-50">
                                            @if($change >= 0)
                                                <i class="bi bi-arrow-up"></i> +{{ $percentage }}%
                                            @else
                                                <i class="bi bi-arrow-down"></i> {{ $percentage }}%
                                            @endif
                                        </small>
                                    </div>
                                @endif
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card-success">
                            <div class="card-body text-center">
                                <h5 class="text-white">Rp {{ number_format($currentMonthStats['total_revenue'], 0, ',', '.') }}</h5>
                                <small class="text-white-50">Total Revenue</small>
                                @if($lastMonthStats['total_revenue'] > 0)
                                    @php
                                        $change = $currentMonthStats['total_revenue'] - $lastMonthStats['total_revenue'];
                                        $percentage = round(($change / $lastMonthStats['total_revenue']) * 100, 1);
                                    @endphp
                                    <div class="mt-1">
                                        <small class="text-white-50">
                                            @if($change >= 0)
                                                <i class="bi bi-arrow-up"></i> +{{ $percentage }}%
                                            @else
                                                <i class="bi bi-arrow-down"></i> {{ $percentage }}%
                                            @endif
                                        </small>
                                    </div>
                                @endif
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card-warning">
                            <div class="card-body text-center">
                                <h5 class="text-white">Rp {{ number_format($currentMonthStats['total_commission'], 0, ',', '.') }}</h5>
                                <small class="text-white-50">Total Komisi</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card-info">
                            <div class="card-body text-center">
                                <h5 class="text-white">Rp {{ number_format($currentMonthStats['avg_booking_value'], 0, ',', '.') }}</h5>
                                <small class="text-white-50">Rata-rata Booking</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card">
                            <div class="card-body text-center">
                                <h4 class="text-white">{{ $currentMonthStats['unique_cs'] }}</h4>
                                <small class="text-white-50">CS Aktif</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-2 col-md-4 mb-3">
                        <div class="card stat-card">
                            <div class="card-body text-center">
                                <h4 class="text-white">{{ $currentMonthStats['unique_apartments'] }}</h4>
                                <small class="text-white-50">Apartemen Aktif</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Charts Row -->
<div class="row mb-4">
    <!-- Daily Trend Chart -->
    <div class="col-xl-8 col-lg-7 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i> Trend Harian Bulan Ini
                </h5>
            </div>
            <div class="card-body">
                <canvas id="dailyTrendChart" height="100"></canvas>
            </div>
        </div>
    </div>

    <!-- Payment Method Breakdown -->
    <div class="col-xl-4 col-lg-5 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-pie-chart"></i> Payment Method Breakdown
                </h5>
            </div>
            <div class="card-body">
                <canvas id="paymentChart" height="150"></canvas>
                <div class="mt-3">
                    @foreach($paymentBreakdown as $payment)
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge {{ $payment->payment_method == 'Cash' ? 'bg-success' : 'bg-primary' }}">
                                {{ $payment->payment_method }}
                            </span>
                            <div class="text-end">
                                <strong>{{ $payment->total_bookings }} booking</strong><br>
                                <small class="text-muted">Rp {{ number_format($payment->total_revenue, 0, ',', '.') }}</small>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Performance Tables -->
<div class="row">
    <!-- Top CS Performance -->
    <div class="col-xl-6 col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-trophy"></i> Top CS Performance Bulan Ini
                </h5>
            </div>
            <div class="card-body">
                @if($topCs->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>CS Name</th>
                                    <th>Booking</th>
                                    <th>Revenue</th>
                                    <th>Komisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($topCs as $index => $cs)
                                    <tr>
                                        <td>
                                            @if($index == 0)
                                                <i class="bi bi-trophy-fill text-warning"></i>
                                            @elseif($index == 1)
                                                <i class="bi bi-award-fill text-secondary"></i>
                                            @elseif($index == 2)
                                                <i class="bi bi-award-fill text-warning"></i>
                                            @else
                                                {{ $index + 1 }}
                                            @endif
                                        </td>
                                        <td><strong>{{ $cs->cs_name }}</strong></td>
                                        <td>{{ $cs->total_bookings }}</td>
                                        <td>Rp {{ number_format($cs->total_revenue, 0, ',', '.') }}</td>
                                        <td>Rp {{ number_format($cs->total_commission, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Belum ada data CS bulan ini</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Top Apartment Performance -->
    <div class="col-xl-6 col-lg-6 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-building"></i> Top Apartment Performance Bulan Ini
                </h5>
            </div>
            <div class="card-body">
                @if($topApartments->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Apartemen</th>
                                    <th>Booking</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($topApartments as $index => $apartment)
                                    <tr>
                                        <td>
                                            @if($index == 0)
                                                <i class="bi bi-trophy-fill text-warning"></i>
                                            @elseif($index == 1)
                                                <i class="bi bi-award-fill text-secondary"></i>
                                            @elseif($index == 2)
                                                <i class="bi bi-award-fill text-warning"></i>
                                            @else
                                                {{ $index + 1 }}
                                            @endif
                                        </td>
                                        <td><strong>{{ $apartment->location }}</strong></td>
                                        <td>{{ $apartment->total_bookings }}</td>
                                        <td>Rp {{ number_format($apartment->total_revenue, 0, ',', '.') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <p class="text-muted text-center">Belum ada data apartemen bulan ini</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-lightning"></i> Quick Actions
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <a href="{{ route('reports.daily', ['date' => now()->format('Y-m-d')]) }}" class="btn btn-outline-primary w-100">
                            <i class="bi bi-calendar-day"></i><br>
                            Laporan Hari Ini
                        </a>
                    </div>
                    <div class="col-md-3 mb-3">
                        <a href="{{ route('reports.monthly', ['month' => now()->format('Y-m')]) }}" class="btn btn-outline-success w-100">
                            <i class="bi bi-calendar-month"></i><br>
                            Laporan Bulan Ini
                        </a>
                    </div>
                    <div class="col-md-3 mb-3">
                        <a href="{{ route('reports.export', ['type' => 'monthly', 'period' => now()->format('Y-m')]) }}" class="btn btn-outline-warning w-100">
                            <i class="bi bi-download"></i><br>
                            Export Excel
                        </a>
                    </div>
                    <div class="col-md-3 mb-3">
                        <a href="{{ route('reports.custom') }}" class="btn btn-outline-info w-100">
                            <i class="bi bi-calendar-range"></i><br>
                            Custom Report
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Daily Trend Chart
const dailyCtx = document.getElementById('dailyTrendChart').getContext('2d');
const dailyData = @json($dailyTrend);

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
        }
    }
});

// Payment Method Chart
const paymentCtx = document.getElementById('paymentChart').getContext('2d');
const paymentData = @json($paymentBreakdown);

new Chart(paymentCtx, {
    type: 'doughnut',
    data: {
        labels: paymentData.map(item => item.payment_method),
        datasets: [{
            data: paymentData.map(item => item.total_revenue),
            backgroundColor: ['#28a745', '#007bff'],
            borderWidth: 2
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.label + ': Rp ' + context.parsed.toLocaleString('id-ID');
                    }
                }
            }
        }
    }
});
</script>
@endpush
