@extends('layouts.app')

@section('title', 'System Monitoring')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>System Monitoring</h2>
            <div>
                <a href="{{ route('monitoring.logs') }}" class="btn btn-outline-primary">
                    <i class="bi bi-list-ul"></i> Activity Logs
                </a>
                <button class="btn btn-outline-success" onclick="refreshStatus()">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>
        </div>
    </div>
</div>

<!-- System Health Overview -->
<div class="row mb-4">
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-success">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $systemHealth['uptime'] }}</h4>
                <small class="text-white-50">System Uptime</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-info">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $systemHealth['memory_usage'] }}</h4>
                <small class="text-white-50">Memory Usage</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card-warning">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $systemHealth['disk_usage'] }}</h4>
                <small class="text-white-50">Disk Usage</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $systemHealth['active_users'] }}</h4>
                <small class="text-white-50">Active Users (24h)</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ $systemHealth['today_transactions'] }}</h4>
                <small class="text-white-50">Today's Transactions</small>
            </div>
        </div>
    </div>
    <div class="col-xl-2 col-md-4 mb-3">
        <div class="card stat-card">
            <div class="card-body text-center">
                <h4 class="text-white">{{ number_format($systemHealth['total_transactions']) }}</h4>
                <small class="text-white-50">Total Transactions</small>
            </div>
        </div>
    </div>
</div>

<!-- Performance Metrics -->
<div class="row mb-4">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-speedometer2"></i> Performance Metrics
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <div class="text-center">
                            <h4 class="text-primary">{{ $performanceMetrics['avg_response_time'] }}</h4>
                            <small class="text-muted">Avg Response Time</small>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="text-center">
                            <h4 class="text-success">{{ $performanceMetrics['requests_per_minute'] }}</h4>
                            <small class="text-muted">Requests/Min</small>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="text-center">
                            <h4 class="text-warning">{{ $performanceMetrics['error_rate'] }}</h4>
                            <small class="text-muted">Error Rate</small>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="text-center">
                            <h4 class="text-info">{{ $performanceMetrics['cpu_usage'] }}</h4>
                            <small class="text-muted">CPU Usage</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-shield-check"></i> System Status
                </h5>
            </div>
            <div class="card-body" id="systemStatus">
                <div class="d-flex justify-content-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Recent Errors -->
@if($errorLogs->count() > 0)
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-exclamation-triangle"></i> Recent Errors
                </h5>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Level</th>
                                <th>Message</th>
                                <th>Context</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($errorLogs as $error)
                                <tr>
                                    <td>{{ $error['timestamp']->format('d/m/Y H:i:s') }}</td>
                                    <td>
                                        <span class="badge bg-{{ $error['level'] === 'ERROR' ? 'danger' : 'warning' }}">
                                            {{ $error['level'] }}
                                        </span>
                                    </td>
                                    <td>{{ $error['message'] }}</td>
                                    <td>{{ $error['context'] }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Recent Activities -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-clock-history"></i> Recent Activities
                </h5>
            </div>
            <div class="card-body">
                @if($recentActivities->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Description</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($recentActivities as $activity)
                                    <tr>
                                        <td>{{ $activity->created_at->format('d/m/Y H:i:s') }}</td>
                                        <td>
                                            @if($activity->user)
                                                {{ $activity->user->name }}
                                            @else
                                                <span class="text-muted">System</span>
                                            @endif
                                        </td>
                                        <td>
                                            <span class="badge bg-{{ $activity->action === 'created' ? 'success' : ($activity->action === 'updated' ? 'warning' : ($activity->action === 'deleted' ? 'danger' : 'info')) }}">
                                                {{ ucfirst($activity->action) }}
                                            </span>
                                        </td>
                                        <td>{{ $activity->description }}</td>
                                        <td>{{ $activity->ip_address ?? '-' }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="text-center mt-3">
                        <a href="{{ route('monitoring.logs') }}" class="btn btn-outline-primary">
                            <i class="bi bi-list-ul"></i> View All Logs
                        </a>
                    </div>
                @else
                    <div class="text-center py-4">
                        <i class="bi bi-clock-history h1 text-muted"></i>
                        <p class="text-muted">No recent activities</p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Load system status
function loadSystemStatus() {
    fetch('/monitoring/system-status')
        .then(response => response.json())
        .then(data => {
            const statusContainer = document.getElementById('systemStatus');
            let html = '';
            
            Object.keys(data).forEach(service => {
                const status = data[service];
                const badgeClass = status.status === 'healthy' ? 'bg-success' : 
                                 status.status === 'warning' ? 'bg-warning' : 'bg-danger';
                
                html += `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>${service.charAt(0).toUpperCase() + service.slice(1)}</span>
                        <span class="badge ${badgeClass}">${status.status}</span>
                    </div>
                `;
            });
            
            statusContainer.innerHTML = html;
        })
        .catch(error => {
            document.getElementById('systemStatus').innerHTML = 
                '<div class="alert alert-danger">Failed to load system status</div>';
        });
}

function refreshStatus() {
    loadSystemStatus();
    // Show refresh feedback
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 1000);
}

// Load status on page load
document.addEventListener('DOMContentLoaded', loadSystemStatus);

// Auto refresh every 30 seconds
setInterval(loadSystemStatus, 30000);
</script>
@endpush
