@extends('layouts.app')

@section('title', 'Grup WhatsApp')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Manajemen Grup WhatsApp</h2>
            <div>
                <button class="btn btn-outline-success" onclick="syncGroups()">
                    <i class="bi bi-arrow-clockwise"></i> Sinkronisasi Grup
                </button>
                <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addGroupModal">
                    <i class="bi bi-plus-circle"></i> Tambah Grup
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Filters -->
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-body">
                <form method="GET" action="{{ route('whatsapp-groups.index') }}">
                    <div class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label">Cari Grup</label>
                            <input type="text" class="form-control" name="search" value="{{ request('search') }}" placeholder="Nama grup atau ID...">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="">Semua Status</option>
                                <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Aktif</option>
                                <option value="inactive" {{ request('status') === 'inactive' ? 'selected' : '' }}>Tidak Aktif</option>
                                <option value="monitoring" {{ request('status') === 'monitoring' ? 'selected' : '' }}>Monitoring</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Apartemen</label>
                            <select class="form-select" name="apartment_id">
                                <option value="">Semua Apartemen</option>
                                @foreach($apartments as $apartment)
                                    <option value="{{ $apartment->id }}" {{ request('apartment_id') == $apartment->id ? 'selected' : '' }}>
                                        {{ $apartment->name }}
                                    </option>
                                @endforeach
                            </select>
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
                                <a href="{{ route('whatsapp-groups.index') }}" class="btn btn-outline-secondary">
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

<!-- Groups List -->
<div class="row">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-whatsapp"></i> Daftar Grup WhatsApp
                    <span class="badge bg-primary ms-2">{{ $groups->total() }} grup</span>
                </h5>
            </div>
            <div class="card-body">
                @if($groups->count() > 0)
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Grup</th>
                                    <th>Apartemen</th>
                                    <th>Status</th>
                                    <th>Monitoring</th>
                                    <th>Aktivitas Terakhir</th>
                                    <th>Peserta</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($groups as $group)
                                    <tr>
                                        <td>
                                            <div>
                                                <strong>{{ $group->group_name }}</strong>
                                                @if($group->group_subject)
                                                    <br><small class="text-muted">{{ $group->group_subject }}</small>
                                                @endif
                                                <br><small class="text-muted font-monospace">{{ $group->group_id }}</small>
                                            </div>
                                        </td>
                                        <td>
                                            @if($group->apartment)
                                                <span class="badge bg-info">{{ $group->apartment->name }}</span>
                                            @else
                                                <span class="text-muted">Belum ditetapkan</span>
                                            @endif
                                        </td>
                                        <td>
                                            <span class="badge bg-{{ $group->status_color }}">
                                                {{ $group->status_text }}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="form-check form-switch">
                                                <input class="form-check-input" type="checkbox" 
                                                       {{ $group->is_monitoring ? 'checked' : '' }}
                                                       onchange="toggleMonitoring({{ $group->id }}, this)">
                                            </div>
                                        </td>
                                        <td>
                                            <small>{{ $group->last_activity_formatted }}</small>
                                        </td>
                                        <td>
                                            <small>
                                                {{ $group->participant_count }} peserta
                                                @if($group->admin_count > 0)
                                                    <br>{{ $group->admin_count }} admin
                                                @endif
                                            </small>
                                        </td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <a href="{{ route('whatsapp-groups.show', $group) }}" class="btn btn-outline-info">
                                                    <i class="bi bi-eye"></i>
                                                </a>
                                                <button class="btn btn-outline-primary" onclick="editGroup({{ $group->id }})">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                @if(!$group->transactions()->exists())
                                                    <button class="btn btn-outline-danger" onclick="deleteGroup({{ $group->id }})">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                @endif
                                            </div>
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div class="d-flex justify-content-center">
                        {{ $groups->links() }}
                    </div>
                @else
                    <div class="text-center py-5">
                        <i class="bi bi-whatsapp h1 text-muted"></i>
                        <h5 class="text-muted">Belum ada grup WhatsApp</h5>
                        <p class="text-muted">Tambahkan grup WhatsApp untuk mulai monitoring transaksi</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addGroupModal">
                            <i class="bi bi-plus-circle"></i> Tambah Grup Pertama
                        </button>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>

<!-- Available Groups from WhatsApp -->
@if(count($availableGroups) > 0)
<div class="row mt-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-cloud-download"></i> Grup Tersedia dari WhatsApp
                </h5>
            </div>
            <div class="card-body">
                <p class="text-muted">Grup-grup berikut terdeteksi dari WhatsApp API tetapi belum ditambahkan ke sistem:</p>
                <div class="row">
                    @foreach($availableGroups as $availableGroup)
                        @if(!$groups->pluck('group_id')->contains($availableGroup['id']))
                            <div class="col-md-6 mb-3">
                                <div class="card border">
                                    <div class="card-body">
                                        <h6 class="card-title">{{ $availableGroup['name'] }}</h6>
                                        @if(isset($availableGroup['subject']))
                                            <p class="card-text small text-muted">{{ $availableGroup['subject'] }}</p>
                                        @endif
                                        <p class="card-text">
                                            <small class="text-muted">
                                                {{ $availableGroup['participant_count'] ?? 0 }} peserta • 
                                                {{ $availableGroup['admin_count'] ?? 0 }} admin
                                            </small>
                                        </p>
                                        <button class="btn btn-sm btn-outline-success" 
                                                onclick="addAvailableGroup('{{ $availableGroup['id'] }}', '{{ addslashes($availableGroup['name']) }}')">
                                            <i class="bi bi-plus-circle"></i> Tambah ke Sistem
                                        </button>
                                    </div>
                                </div>
                            </div>
                        @endif
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Add Group Modal -->
<div class="modal fade" id="addGroupModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Tambah Grup WhatsApp</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form action="{{ route('whatsapp-groups.store') }}" method="POST">
                @csrf
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">ID Grup WhatsApp *</label>
                        <input type="text" class="form-control" name="group_id" required 
                               placeholder="120363317169602122@g.us">
                        <div class="form-text">Format: nomor@g.us</div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Nama Grup *</label>
                        <input type="text" class="form-control" name="group_name" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Apartemen</label>
                        <select class="form-select" name="apartment_id">
                            <option value="">Pilih Apartemen</option>
                            @foreach($apartments as $apartment)
                                <option value="{{ $apartment->id }}">{{ $apartment->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="is_monitoring" value="1" id="isMonitoring">
                            <label class="form-check-label" for="isMonitoring">
                                Aktifkan monitoring transaksi
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                    <button type="submit" class="btn btn-primary">Tambah Grup</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function toggleMonitoring(groupId, checkbox) {
    fetch(`/whatsapp-groups/${groupId}/toggle-monitoring`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('success', data.message);
        } else {
            checkbox.checked = !checkbox.checked; // Revert
            showNotification('error', 'Gagal mengubah status monitoring');
        }
    })
    .catch(error => {
        checkbox.checked = !checkbox.checked; // Revert
        showNotification('error', 'Terjadi kesalahan');
    });
}

function syncGroups() {
    if (confirm('Sinkronisasi grup dari WhatsApp? Ini akan mengambil data terbaru dari API.')) {
        window.location.href = '{{ route("whatsapp-groups.sync") }}';
    }
}

function addAvailableGroup(groupId, groupName) {
    // Fill modal with available group data
    document.querySelector('input[name="group_id"]').value = groupId;
    document.querySelector('input[name="group_name"]').value = groupName;
    
    // Show modal
    new bootstrap.Modal(document.getElementById('addGroupModal')).show();
}

function editGroup(groupId) {
    // Implement edit functionality
    alert('Edit functionality will be implemented');
}

function deleteGroup(groupId) {
    if (confirm('Hapus grup dari sistem? Data transaksi tidak akan terhapus.')) {
        // Create form and submit
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/whatsapp-groups/${groupId}`;
        
        const methodInput = document.createElement('input');
        methodInput.type = 'hidden';
        methodInput.name = '_method';
        methodInput.value = 'DELETE';
        
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = '_token';
        tokenInput.value = document.querySelector('meta[name="csrf-token"]').content;
        
        form.appendChild(methodInput);
        form.appendChild(tokenInput);
        document.body.appendChild(form);
        form.submit();
    }
}

function showNotification(type, message) {
    // Simple notification - you can enhance this
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insert at top of content
    const content = document.querySelector('.container-fluid');
    content.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = content.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}
</script>
@endpush
