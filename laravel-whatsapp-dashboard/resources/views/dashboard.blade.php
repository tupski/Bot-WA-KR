@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="row">
    <!-- Bot Status Card -->
    <div class="col-12 mb-4">
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title mb-1">Status Bot WhatsApp</h5>
                        <p class="card-text text-muted">
                            <i class="bi bi-circle-fill {{ $botStatus['is_online'] ? 'status-online' : 'status-offline' }}"></i>
                            {{ $botStatus['status_text'] }}
                            @if($botStatus['last_activity'])
                                - Terakhir aktif: {{ $botStatus['last_activity']->diffForHumans() }}
                            @endif
                        </p>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">Pesan hari ini: {{ $botStatus['total_messages_today'] }}</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Statistics Cards -->
<div class="row mb-4">
    <div class="col-xl-3 col-md-6 mb-4">
        <div class="card stat-card">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <div class="text-white-50 small">Booking Hari Ini</div>
                        <div class="h4 text-white">{{ $todayStats['total_bookings'] }}</div>
                        @if($yesterdayStats['total_bookings'] > 0)
                            @php
                                $bookingChange = $todayStats['total_bookings'] - $yesterdayStats['total_bookings'];
                                $bookingPercentage = round(($bookingChange / $yesterdayStats['total_bookings']) * 100, 1);
                            @endphp
                            <small class="text-white-50">
                                @if($bookingChange >= 0)
                                    <i class="bi bi-arrow-up"></i> +{{ $bookingPercentage }}%
                                @else
                                    <i class="bi bi-arrow-down"></i> {{ $bookingPercentage }}%
                                @endif
                                dari kemarin
                            </small>
                        @endif
                    </div>
                    <div class="align-self-center">
                        <i class="bi bi-calendar-check h2 text-white-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6 mb-4">
        <div class="card stat-card-success">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <div class="text-white-50 small">Revenue Hari Ini</div>
                        <div class="h4 text-white">Rp {{ number_format($todayStats['total_revenue'], 0, ',', '.') }}</div>
                        @if($yesterdayStats['total_revenue'] > 0)
                            @php
                                $revenueChange = $todayStats['total_revenue'] - $yesterdayStats['total_revenue'];
                                $revenuePercentage = round(($revenueChange / $yesterdayStats['total_revenue']) * 100, 1);
                            @endphp
                            <small class="text-white-50">
                                @if($revenueChange >= 0)
                                    <i class="bi bi-arrow-up"></i> +{{ $revenuePercentage }}%
                                @else
                                    <i class="bi bi-arrow-down"></i> {{ $revenuePercentage }}%
                                @endif
                                dari kemarin
                            </small>
                        @endif
                    </div>
                    <div class="align-self-center">
                        <i class="bi bi-currency-dollar h2 text-white-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6 mb-4">
        <div class="card stat-card-warning">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <div class="text-white-50 small">Komisi Hari Ini</div>
                        <div class="h4 text-white">Rp {{ number_format($todayStats['total_commission'], 0, ',', '.') }}</div>
                        @if($yesterdayStats['total_commission'] > 0)
                            @php
                                $commissionChange = $todayStats['total_commission'] - $yesterdayStats['total_commission'];
                                $commissionPercentage = round(($commissionChange / $yesterdayStats['total_commission']) * 100, 1);
                            @endphp
                            <small class="text-white-50">
                                @if($commissionChange >= 0)
                                    <i class="bi bi-arrow-up"></i> +{{ $commissionPercentage }}%
                                @else
                                    <i class="bi bi-arrow-down"></i> {{ $commissionPercentage }}%
                                @endif
                                dari kemarin
                            </small>
                        @endif
                    </div>
                    <div class="align-self-center">
                        <i class="bi bi-percent h2 text-white-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6 mb-4">
        <div class="card stat-card-info">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <div class="text-white-50 small">Rata-rata Booking</div>
                        <div class="h4 text-white">Rp {{ number_format($todayStats['avg_booking_value'], 0, ',', '.') }}</div>
                        <small class="text-white-50">Per transaksi</small>
                    </div>
                    <div class="align-self-center">
                        <i class="bi bi-graph-up-arrow h2 text-white-50"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Charts and Tables Row -->
<div class="row">
    <!-- Revenue Chart -->
    <div class="col-xl-8 col-lg-7 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i>
                    Trend Revenue 7 Hari Terakhir
                </h5>
            </div>
            <div class="card-body">
                <canvas id="revenueChart" height="100"></canvas>
            </div>
        </div>
    </div>

    <!-- Top CS Performance -->
    <div class="col-xl-4 col-lg-5 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-trophy"></i>
                    Top CS Hari Ini
                </h5>
            </div>
            <div class="card-body">
                @if($topCs->count() > 0)
                    @foreach($topCs as $cs)
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 class="mb-0">{{ $cs->cs_name }}</h6>
                                <small class="text-muted">{{ $cs->total_bookings }} booking</small>
                            </div>
                            <div class="text-end">
                                <strong>Rp {{ number_format($cs->total_commission, 0, ',', '.') }}</strong>
                            </div>
                        </div>
                        @if(!$loop->last)
                            <hr class="my-2">
                        @endif
                    @endforeach
                @else
                    <p class="text-muted text-center">Belum ada data CS hari ini</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Recent Transactions and Apartment Stats -->
<div class="row">
    <!-- Recent Transactions -->
    <div class="col-xl-8 col-lg-7 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-clock-history"></i>
                    Transaksi Terbaru Hari Ini
                </h5>
            </div>
            <div class="card-body">
                @if($recentTransactions->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>Unit</th>
                                    <th>Apartemen</th>
                                    <th>CS</th>
                                    <th>Amount</th>
                                    <th>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($recentTransactions as $transaction)
                                    <tr>
                                        <td>{{ $transaction->created_at->format('H:i') }}</td>
                                        <td>{{ $transaction->unit }}</td>
                                        <td>{{ $transaction->location }}</td>
                                        <td>{{ $transaction->cs_name }}</td>
                                        <td>Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
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
                    <p class="text-muted text-center">Belum ada transaksi hari ini</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Apartment Performance -->
    <div class="col-xl-4 col-lg-5 mb-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-building"></i>
                    Performa Apartemen
                </h5>
            </div>
            <div class="card-body">
                @if($apartmentStats->count() > 0)
                    @foreach($apartmentStats as $apartment)
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h6 class="mb-0">{{ $apartment->location }}</h6>
                                <small class="text-muted">{{ $apartment->booking_count }} booking</small>
                            </div>
                            <div class="progress" style="height: 8px;">
                                @php
                                    $maxRevenue = $apartmentStats->max('total_revenue');
                                    $percentage = $maxRevenue > 0 ? ($apartment->total_revenue / $maxRevenue) * 100 : 0;
                                @endphp
                                <div class="progress-bar" style="width: {{ $percentage }}%"></div>
                            </div>
                            <small class="text-muted">Rp {{ number_format($apartment->total_revenue, 0, ',', '.') }}</small>
                        </div>
                    @endforeach
                @else
                    <p class="text-muted text-center">Belum ada data apartemen hari ini</p>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Monthly Summary -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-calendar-month"></i>
                    Ringkasan Bulan Ini
                </h5>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-md-2">
                        <h4 class="text-primary">{{ $monthlyStats['total_bookings'] }}</h4>
                        <small class="text-muted">Total Booking</small>
                    </div>
                    <div class="col-md-3">
                        <h4 class="text-success">Rp {{ number_format($monthlyStats['total_revenue'], 0, ',', '.') }}</h4>
                        <small class="text-muted">Total Revenue</small>
                    </div>
                    <div class="col-md-3">
                        <h4 class="text-warning">Rp {{ number_format($monthlyStats['total_commission'], 0, ',', '.') }}</h4>
                        <small class="text-muted">Total Komisi</small>
                    </div>
                    <div class="col-md-2">
                        <h4 class="text-info">{{ $monthlyStats['unique_cs'] }}</h4>
                        <small class="text-muted">CS Aktif</small>
                    </div>
                    <div class="col-md-2">
                        <h4 class="text-secondary">{{ $monthlyStats['active_apartments'] }}</h4>
                        <small class="text-muted">Apartemen Aktif</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Real-time notifications
const pusher = new Pusher('{{ config("broadcasting.connections.pusher.key") }}', {
    cluster: '{{ config("broadcasting.connections.pusher.options.cluster") }}',
    encrypted: true
});

const channel = pusher.subscribe('transactions');
channel.bind('new-transaction', function(data) {
    showNotification(data);
    updateDashboardStats();
});

function showNotification(transaction) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';

    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-check-circle-fill me-2"></i>
            <div>
                <strong>Booking Baru!</strong><br>
                <small>${transaction.unit} - ${transaction.location}</small><br>
                <small>CS: ${transaction.cs_name} | ${transaction.formatted_amount}</small>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function updateDashboardStats() {
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}
</script>
@endpush

@push('scripts')
<script>
// Revenue Chart
const ctx = document.getElementById('revenueChart').getContext('2d');
const chartData = @json($chartData);

new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartData.map(item => item.date_formatted),
        datasets: [{
            label: 'Revenue',
            data: chartData.map(item => item.revenue),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }, {
            label: 'Booking Count',
            data: chartData.map(item => item.bookings),
            borderColor: '#38ef7d',
            backgroundColor: 'rgba(56, 239, 125, 0.1)',
            borderWidth: 2,
            fill: false,
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
            legend: {
                display: true,
                position: 'top'
            },
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

// Auto refresh every 5 minutes
setTimeout(function() {
    location.reload();
}, 300000);
</script>
@endpush
