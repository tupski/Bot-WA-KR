@extends('layouts.app')

@section('title', 'Manajemen Customer Service')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Manajemen Customer Service</h2>
            <div>
                <a href="{{ route('customer-services.ranking') }}" class="btn btn-outline-warning">
                    <i class="bi bi-trophy"></i> Ranking CS
                </a>
                <a href="{{ route('customer-services.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Tambah CS
                </a>
            </div>
        </div>
    </div>
</div>

<!-- Performance Overview -->
@if($performanceStats->count() > 0)
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-graph-up"></i> Performance Bulan Ini ({{ Carbon\Carbon::now()->format('F Y') }})
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    @foreach($performanceStats->take(6) as $index => $cs)
                        <div class="col-xl-2 col-md-4 mb-3">
                            <div class="card {{ $index == 0 ? 'stat-card' : ($index == 1 ? 'stat-card-success' : 'stat-card-info') }}">
                                <div class="card-body text-center">
                                    @if($index < 3)
                                        <div class="mb-1">
                                            @if($index == 0)
                                                <i class="bi bi-trophy-fill text-warning h4"></i>
                                            @elseif($index == 1)
                                                <i class="bi bi-award-fill text-light h5"></i>
                                            @else
                                                <i class="bi bi-award-fill text-light h6"></i>
                                            @endif
                                        </div>
                                    @endif
                                    <h6 class="text-white">{{ $cs->cs_name }}</h6>
                                    <small class="text-white-50">{{ $cs->total_bookings }} booking</small><br>
                                    <small class="text-white-50">Rp {{ number_format($cs->total_commission, 0, ',', '.') }}</small>
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<!-- Filters -->
<div class="card mb-4">
    <div class="card-header">
        <h5 class="card-title mb-0">
            <i class="bi bi-funnel"></i> Filter Customer Service
        </h5>
    </div>
    <div class="card-body">
        <form method="GET" action="{{ route('customer-services.index') }}" class="row align-items-end">
            <div class="col-md-4">
                <label class="form-label">Search</label>
                <input type="text" name="search" class="form-control" placeholder="Nama, email, atau phone..." value="{{ request('search') }}">
            </div>
            <div class="col-md-3">
                <label class="form-label">Status</label>
                <select name="status" class="form-select">
                    <option value="">Semua Status</option>
                    <option value="active" {{ request('status') == 'active' ? 'selected' : '' }}>Active</option>
                    <option value="inactive" {{ request('status') == 'inactive' ? 'selected' : '' }}>Inactive</option>
                </select>
            </div>
            <div class="col-md-3">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-search"></i> Filter
                </button>
                <a href="{{ route('customer-services.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-clockwise"></i> Reset
                </a>
            </div>
        </form>
    </div>
</div>

<!-- CS List -->
<div class="card">
    <div class="card-header">
        <h5 class="card-title mb-0">
            <i class="bi bi-people"></i> Daftar Customer Service
        </h5>
    </div>
    <div class="card-body">
        @if($customerServices->count() > 0)
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>
                                <a href="{{ request()->fullUrlWithQuery(['sort_by' => 'name', 'sort_order' => request('sort_order') == 'asc' ? 'desc' : 'asc']) }}" class="text-decoration-none text-white">
                                    CS Name
                                    @if(request('sort_by') == 'name')
                                        <i class="bi bi-arrow-{{ request('sort_order') == 'asc' ? 'up' : 'down' }}"></i>
                                    @endif
                                </a>
                            </th>
                            <th>Full Name</th>
                            <th>Contact</th>
                            <th>Commission Rate</th>
                            <th>Target Monthly</th>
                            <th>Join Date</th>
                            <th>Status</th>
                            <th>Performance</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($customerServices as $cs)
                            @php
                                $performance = $performanceStats->where('cs_name', $cs->name)->first();
                            @endphp
                            <tr>
                                <td>
                                    <strong>{{ $cs->name }}</strong>
                                    @if($performance && $performance->total_bookings > 0)
                                        <br><small class="text-muted">{{ $performance->total_bookings }} booking bulan ini</small>
                                    @endif
                                </td>
                                <td>{{ $cs->full_name ?? '-' }}</td>
                                <td>
                                    @if($cs->phone)
                                        <small>{{ $cs->phone }}</small><br>
                                    @endif
                                    @if($cs->email)
                                        <small>{{ $cs->email }}</small>
                                    @endif
                                    @if(!$cs->phone && !$cs->email)
                                        -
                                    @endif
                                </td>
                                <td>{{ $cs->commission_rate }}%</td>
                                <td>Rp {{ number_format($cs->target_monthly, 0, ',', '.') }}</td>
                                <td>{{ $cs->join_date ? $cs->join_date->format('d/m/Y') : '-' }}</td>
                                <td>
                                    <span class="badge {{ $cs->is_active ? 'bg-success' : 'bg-secondary' }}">
                                        {{ $cs->status }}
                                    </span>
                                </td>
                                <td>
                                    @if($performance)
                                        <small class="text-success">Rp {{ number_format($performance->total_commission, 0, ',', '.') }}</small><br>
                                        <small class="text-muted">{{ round(($performance->total_commission / $cs->target_monthly) * 100, 1) }}% target</small>
                                    @else
                                        <small class="text-muted">Belum ada data</small>
                                    @endif
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="{{ route('customer-services.show', $cs) }}" class="btn btn-outline-info" title="View">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                        <a href="{{ route('customer-services.edit', $cs) }}" class="btn btn-outline-warning" title="Edit">
                                            <i class="bi bi-pencil"></i>
                                        </a>
                                        <button type="button" class="btn btn-outline-danger" onclick="deleteCs({{ $cs->id }})" title="Delete">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div>
                    Menampilkan {{ $customerServices->firstItem() }} - {{ $customerServices->lastItem() }} dari {{ $customerServices->total() }} CS
                </div>
                <div>
                    {{ $customerServices->links() }}
                </div>
            </div>
        @else
            <div class="text-center py-5">
                <i class="bi bi-people h1 text-muted"></i>
                <p class="text-muted">Tidak ada Customer Service yang ditemukan.</p>
                <a href="{{ route('customer-services.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Tambah CS Pertama
                </a>
            </div>
        @endif
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
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Perhatian!</strong> CS yang memiliki transaksi tidak dapat dihapus. Nonaktifkan saja CS tersebut.
                </div>
                Apakah Anda yakin ingin menghapus Customer Service ini? Tindakan ini tidak dapat dibatalkan.
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                <form id="deleteForm" method="POST" style="display: inline;">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">Hapus</button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function deleteCs(id) {
    const form = document.getElementById('deleteForm');
    form.action = `/customer-services/${id}`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}
</script>
@endpush
