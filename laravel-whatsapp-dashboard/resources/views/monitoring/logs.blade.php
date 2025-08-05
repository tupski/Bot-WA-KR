@extends('layouts.app')

@section('title', 'System Logs')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>System Logs</h2>
            <div>
                <button class="btn btn-outline-success" onclick="refreshLogs()">
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                </button>
                <button class="btn btn-outline-danger" onclick="clearLogs()">
                    <i class="bi bi-trash"></i> Clear Logs
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Log Filters -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" action="{{ route('monitoring.logs') }}">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label">Log Level</label>
                            <select class="form-select" name="level">
                                <option value="">All Levels</option>
                                <option value="emergency" {{ request('level') === 'emergency' ? 'selected' : '' }}>Emergency</option>
                                <option value="alert" {{ request('level') === 'alert' ? 'selected' : '' }}>Alert</option>
                                <option value="critical" {{ request('level') === 'critical' ? 'selected' : '' }}>Critical</option>
                                <option value="error" {{ request('level') === 'error' ? 'selected' : '' }}>Error</option>
                                <option value="warning" {{ request('level') === 'warning' ? 'selected' : '' }}>Warning</option>
                                <option value="notice" {{ request('level') === 'notice' ? 'selected' : '' }}>Notice</option>
                                <option value="info" {{ request('level') === 'info' ? 'selected' : '' }}>Info</option>
                                <option value="debug" {{ request('level') === 'debug' ? 'selected' : '' }}>Debug</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Search</label>
                            <input type="text" class="form-control" name="search" value="{{ request('search') }}" placeholder="Search in logs...">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-control" name="date" value="{{ request('date') }}">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">&nbsp;</label>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-outline-primary">
                                    <i class="bi bi-search"></i> Filter
                                </button>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">&nbsp;</label>
                            <div class="d-grid">
                                <a href="{{ route('monitoring.logs') }}" class="btn btn-outline-secondary">
                                    <i class="bi bi-x-circle"></i> Reset
                                </a>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Log Content -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-file-text"></i> Log Entries
                    @if(isset($logs))
                        <span class="badge bg-primary ms-2">{{ count($logs) }} entries</span>
                    @endif
                </h5>
            </div>
            <div class="card-body">
                @if(isset($logs) && count($logs) > 0)
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th width="150">Timestamp</th>
                                    <th width="80">Level</th>
                                    <th width="120">Channel</th>
                                    <th>Message</th>
                                    <th width="100">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($logs as $index => $log)
                                    <tr class="log-entry log-{{ $log['level'] ?? 'info' }}">
                                        <td>
                                            <small class="text-muted">{{ $log['timestamp'] ?? 'N/A' }}</small>
                                        </td>
                                        <td>
                                            <span class="badge bg-{{ $log['level_color'] ?? 'secondary' }}">
                                                {{ strtoupper($log['level'] ?? 'INFO') }}
                                            </span>
                                        </td>
                                        <td>
                                            <small>{{ $log['channel'] ?? 'laravel' }}</small>
                                        </td>
                                        <td>
                                            <div class="log-message">
                                                {{ Str::limit($log['message'] ?? 'No message', 100) }}
                                                @if(isset($log['context']) && !empty($log['context']))
                                                    <button class="btn btn-sm btn-outline-info ms-2" 
                                                            onclick="toggleContext({{ $index }})">
                                                        <i class="bi bi-info-circle"></i> Context
                                                    </button>
                                                @endif
                                            </div>
                                            @if(isset($log['context']) && !empty($log['context']))
                                                <div id="context-{{ $index }}" class="log-context mt-2" style="display: none;">
                                                    <pre class="bg-light p-2 rounded"><code>{{ json_encode($log['context'], JSON_PRETTY_PRINT) }}</code></pre>
                                                </div>
                                            @endif
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary" 
                                                    onclick="viewLogDetail({{ $index }})">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="text-center py-5">
                        <i class="bi bi-file-text h1 text-muted"></i>
                        <h5 class="text-muted">No logs found</h5>
                        <p class="text-muted">
                            @if(request()->hasAny(['level', 'search', 'date']))
                                Try adjusting your filters or 
                                <a href="{{ route('monitoring.logs') }}">view all logs</a>
                            @else
                                No log entries available at the moment
                            @endif
                        </p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Log Detail Modal -->
<div class="modal fade" id="logDetailModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Log Detail</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="logDetailContent">
                    <!-- Content will be loaded here -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('styles')
<style>
.log-entry.log-error {
    background-color: rgba(220, 53, 69, 0.1);
}

.log-entry.log-warning {
    background-color: rgba(255, 193, 7, 0.1);
}

.log-entry.log-info {
    background-color: rgba(13, 202, 240, 0.1);
}

.log-entry.log-debug {
    background-color: rgba(108, 117, 125, 0.1);
}

.log-context {
    font-size: 0.85em;
}

.log-context pre {
    max-height: 200px;
    overflow-y: auto;
}

.log-message {
    word-break: break-word;
}
</style>
@endpush

@push('scripts')
<script>
function toggleContext(index) {
    const context = document.getElementById(`context-${index}`);
    if (context.style.display === 'none') {
        context.style.display = 'block';
    } else {
        context.style.display = 'none';
    }
}

function viewLogDetail(index) {
    // Get log data and show in modal
    const logRow = document.querySelector(`.log-entry:nth-child(${index + 1})`);
    const message = logRow.querySelector('.log-message').textContent;
    const level = logRow.querySelector('.badge').textContent;
    const timestamp = logRow.querySelector('small').textContent;
    
    const content = `
        <div class="row">
            <div class="col-md-3"><strong>Timestamp:</strong></div>
            <div class="col-md-9">${timestamp}</div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3"><strong>Level:</strong></div>
            <div class="col-md-9"><span class="badge bg-secondary">${level}</span></div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3"><strong>Message:</strong></div>
            <div class="col-md-9">${message}</div>
        </div>
    `;
    
    document.getElementById('logDetailContent').innerHTML = content;
    new bootstrap.Modal(document.getElementById('logDetailModal')).show();
}

function refreshLogs() {
    window.location.reload();
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
        fetch('{{ route("monitoring.logs.clear") }}', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Failed to clear logs');
            }
        })
        .catch(error => {
            alert('Error clearing logs');
        });
    }
}

// Auto-refresh every 30 seconds
setInterval(function() {
    if (!document.hidden) {
        refreshLogs();
    }
}, 30000);
</script>
@endpush
