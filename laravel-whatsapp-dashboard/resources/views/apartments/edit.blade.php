@extends('layouts.app')

@section('title', 'Edit Apartemen - ' . $apartment->name)

@section('content')
<div class="row mb-4">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
            <h2>Edit Apartemen</h2>
            <a href="{{ route('apartments.show', $apartment) }}" class="btn btn-outline-secondary">
                <i class="bi bi-arrow-left"></i> Kembali
            </a>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-pencil"></i> Form Edit Apartemen
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('apartments.update', $apartment) }}" method="POST">
                    @csrf
                    @method('PUT')
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="name" class="form-label">Nama Apartemen *</label>
                                <input type="text" class="form-control @error('name') is-invalid @enderror" 
                                       id="name" name="name" value="{{ old('name', $apartment->name) }}" required>
                                @error('name')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="code" class="form-label">Kode Apartemen *</label>
                                <input type="text" class="form-control @error('code') is-invalid @enderror" 
                                       id="code" name="code" value="{{ old('code', $apartment->code) }}" required>
                                @error('code')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                                <div class="form-text">Kode unik untuk identifikasi apartemen</div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="location" class="form-label">Lokasi</label>
                        <input type="text" class="form-control @error('location') is-invalid @enderror" 
                               id="location" name="location" value="{{ old('location', $apartment->location) }}">
                        @error('location')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-3">
                        <label for="description" class="form-label">Deskripsi</label>
                        <textarea class="form-control @error('description') is-invalid @enderror" 
                                  id="description" name="description" rows="3">{{ old('description', $apartment->description) }}</textarea>
                        @error('description')
                            <div class="invalid-feedback">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="whatsapp_group_id" class="form-label">WhatsApp Group ID</label>
                                <input type="text" class="form-control @error('whatsapp_group_id') is-invalid @enderror" 
                                       id="whatsapp_group_id" name="whatsapp_group_id" 
                                       value="{{ old('whatsapp_group_id', $apartment->whatsapp_group_id) }}"
                                       placeholder="120363317169602122@g.us">
                                @error('whatsapp_group_id')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                                <div class="form-text">Format: nomor@g.us</div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="whatsapp_group_name" class="form-label">Nama Grup WhatsApp</label>
                                <input type="text" class="form-control @error('whatsapp_group_name') is-invalid @enderror" 
                                       id="whatsapp_group_name" name="whatsapp_group_name" 
                                       value="{{ old('whatsapp_group_name', $apartment->whatsapp_group_name) }}">
                                @error('whatsapp_group_name')
                                    <div class="invalid-feedback">{{ $message }}</div>
                                @enderror
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="is_active" name="is_active" value="1" 
                                   {{ old('is_active', $apartment->is_active) ? 'checked' : '' }}>
                            <label class="form-check-label" for="is_active">
                                Apartemen Aktif
                            </label>
                        </div>
                        <div class="form-text">Apartemen yang tidak aktif tidak akan muncul dalam pilihan</div>
                    </div>

                    <div class="d-flex justify-content-between">
                        <div>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check-circle"></i> Update Apartemen
                            </button>
                            <a href="{{ route('apartments.show', $apartment) }}" class="btn btn-outline-secondary">
                                <i class="bi bi-x-circle"></i> Batal
                            </a>
                        </div>
                        
                        @if(!$apartment->transactions()->exists())
                            <button type="button" class="btn btn-outline-danger" onclick="deleteApartment()">
                                <i class="bi bi-trash"></i> Hapus Apartemen
                            </button>
                        @endif
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <!-- Current Info -->
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Informasi Saat Ini
                </h5>
            </div>
            <div class="card-body">
                <table class="table table-sm table-borderless">
                    <tr>
                        <td><strong>Dibuat:</strong></td>
                        <td>{{ $apartment->created_at->format('d M Y H:i') }}</td>
                    </tr>
                    <tr>
                        <td><strong>Diperbarui:</strong></td>
                        <td>{{ $apartment->updated_at->format('d M Y H:i') }}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Transaksi:</strong></td>
                        <td>{{ $apartment->transactions()->count() }}</td>
                    </tr>
                    <tr>
                        <td><strong>Status:</strong></td>
                        <td>
                            <span class="badge bg-{{ $apartment->is_active ? 'success' : 'danger' }}">
                                {{ $apartment->is_active ? 'Aktif' : 'Tidak Aktif' }}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- WhatsApp Groups -->
        @php
            $whatsappGroups = \App\Models\WhatsAppGroup::where('apartment_id', $apartment->id)->get();
        @endphp
        
        @if($whatsappGroups->count() > 0)
        <div class="card mt-3">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-whatsapp"></i> Grup WhatsApp Terkait
                </h5>
            </div>
            <div class="card-body">
                @foreach($whatsappGroups as $group)
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>{{ $group->group_name }}</strong>
                            <br><small class="text-muted">{{ $group->participant_count }} peserta</small>
                        </div>
                        <span class="badge bg-{{ $group->status_color }}">
                            {{ $group->status_text }}
                        </span>
                    </div>
                    @if(!$loop->last)<hr>@endif
                @endforeach
                
                <div class="mt-3">
                    <a href="{{ route('whatsapp-groups.index', ['apartment_id' => $apartment->id]) }}" 
                       class="btn btn-sm btn-outline-primary w-100">
                        <i class="bi bi-gear"></i> Kelola Grup
                    </a>
                </div>
            </div>
        </div>
        @endif

        <!-- Help -->
        <div class="card mt-3">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-question-circle"></i> Bantuan
                </h5>
            </div>
            <div class="card-body">
                <ul class="list-unstyled small">
                    <li><strong>Nama:</strong> Nama lengkap apartemen</li>
                    <li><strong>Kode:</strong> Kode singkat untuk identifikasi</li>
                    <li><strong>WhatsApp Group ID:</strong> ID grup untuk monitoring transaksi</li>
                    <li><strong>Status Aktif:</strong> Apartemen yang dapat menerima transaksi</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Konfirmasi Hapus</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p>Apakah Anda yakin ingin menghapus apartemen <strong>{{ $apartment->name }}</strong>?</p>
                <p class="text-danger"><small>Tindakan ini tidak dapat dibatalkan.</small></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                <form action="{{ route('apartments.destroy', $apartment) }}" method="POST" class="d-inline">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="btn btn-danger">Ya, Hapus</button>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function deleteApartment() {
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

// Auto-generate code from name
document.getElementById('name').addEventListener('input', function() {
    const name = this.value;
    const codeField = document.getElementById('code');
    
    // Only auto-generate if code field is empty
    if (!codeField.value) {
        // Extract first letters of each word and convert to uppercase
        const code = name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 10); // Limit to 10 characters
        
        codeField.value = code;
    }
});

// Validate WhatsApp Group ID format
document.getElementById('whatsapp_group_id').addEventListener('blur', function() {
    const value = this.value.trim();
    if (value && !value.match(/^\d+@g\.us$/)) {
        this.classList.add('is-invalid');
        // Add or update error message
        let feedback = this.parentNode.querySelector('.invalid-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            this.parentNode.appendChild(feedback);
        }
        feedback.textContent = 'Format harus: nomor@g.us (contoh: 120363317169602122@g.us)';
    } else {
        this.classList.remove('is-invalid');
        const feedback = this.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }
});
</script>
@endpush
