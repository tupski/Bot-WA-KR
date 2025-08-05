@extends('layouts.app')

@section('title', 'Manajemen Apartemen')

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Manajemen Apartemen</h2>
            <a href="{{ route('apartments.create') }}" class="btn btn-primary">
                <i class="bi bi-plus-circle"></i> Tambah Apartemen
            </a>
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
                    <i class="bi bi-graph-up"></i> Performance Bulan Ini
                </h5>
            </div>
            <div class="card-body">
                <div class="row">
                    @foreach($performanceStats->take(6) as $index => $apt)
                        <div class="col-xl-2 col-md-4 mb-3">
                            <div class="card {{ $index == 0 ? 'stat-card' : 'stat-card-info' }}">
                                <div class="card-body text-center">
                                    @if($index == 0)
                                        <i class="bi bi-trophy-fill text-warning h5"></i>
                                    @endif
                                    <h6 class="text-white">{{ $apt->location }}</h6>
                                    <small class="text-white-50">{{ $apt->total_bookings }} booking</small><br>
                                    <small class="text-white-50">Rp {{ number_format($apt->total_revenue, 0, ',', '.') }}</small>
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
    <div class="card-body">
        <form method="GET" action="{{ route('apartments.index') }}" class="row align-items-end">
            <div class="col-md-4">
                <label class="form-label">Search</label>
                <input type="text" name="search" class="form-control" placeholder="Nama atau kode apartemen..." value="{{ request('search') }}">
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
                <a href="{{ route('apartments.index') }}" class="btn btn-outline-secondary">Reset</a>
            </div>
        </form>
    </div>
</div>

<!-- Apartments Grid -->
<div class="row">
    @forelse($apartments as $apartment)
        @php
            $performance = $performanceStats->where('location', $apartment->name)->first();
        @endphp
        <div class="col-xl-4 col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="card-title mb-0">{{ $apartment->name }}</h6>
                    <span class="badge {{ $apartment->is_active ? 'bg-success' : 'bg-secondary' }}">
                        {{ $apartment->status }}
                    </span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-6">
                            <small class="text-muted">Kode:</small><br>
                            <strong>{{ $apartment->code }}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">WhatsApp Group:</small><br>
                            @if($apartment->whatsapp_group_name)
                                <small>{{ $apartment->whatsapp_group_name }}</small>
                            @else
                                <small class="text-muted">Belum diset</small>
                            @endif
                        </div>
                    </div>

                    @if($performance)
                        <hr>
                        <div class="row text-center">
                            <div class="col-6">
                                <h5 class="text-primary">{{ $performance->total_bookings }}</h5>
                                <small class="text-muted">Booking Bulan Ini</small>
                            </div>
                            <div class="col-6">
                                <h6 class="text-success">Rp {{ number_format($performance->total_revenue, 0, ',', '.') }}</h6>
                                <small class="text-muted">Revenue Bulan Ini</small>
                            </div>
                        </div>
                    @endif

                    @if($apartment->description)
                        <hr>
                        <p class="card-text small text-muted">{{ Str::limit($apartment->description, 100) }}</p>
                    @endif
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100">
                        <a href="{{ route('apartments.show', $apartment) }}" class="btn btn-outline-info btn-sm">
                            <i class="bi bi-eye"></i> View
                        </a>
                        <a href="{{ route('apartments.edit', $apartment) }}" class="btn btn-outline-warning btn-sm">
                            <i class="bi bi-pencil"></i> Edit
                        </a>
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteApartment({{ $apartment->id }})">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    @empty
        <div class="col-12">
            <div class="text-center py-5">
                <i class="bi bi-building h1 text-muted"></i>
                <p class="text-muted">Tidak ada apartemen yang ditemukan.</p>
                <a href="{{ route('apartments.create') }}" class="btn btn-primary">
                    <i class="bi bi-plus-circle"></i> Tambah Apartemen Pertama
                </a>
            </div>
        </div>
    @endforelse
</div>

<!-- Pagination -->
@if($apartments->hasPages())
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-center">
            {{ $apartments->links() }}
        </div>
    </div>
</div>
@endif

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
                    <strong>Perhatian!</strong> Apartemen yang memiliki transaksi tidak dapat dihapus.
                </div>
                Apakah Anda yakin ingin menghapus apartemen ini?
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
function deleteApartment(id) {
    const form = document.getElementById('deleteForm');
    form.action = `/apartments/${id}`;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}
</script>
@endpush
