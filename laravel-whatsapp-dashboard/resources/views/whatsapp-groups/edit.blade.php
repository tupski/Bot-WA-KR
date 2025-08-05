@extends('layouts.app')

@section('title', 'Edit Grup WhatsApp')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title">
                        <i class="fas fa-edit text-warning"></i>
                        Edit Grup WhatsApp
                    </h3>
                    <div>
                        <a href="{{ route('whatsapp-groups.show', $group->id) }}" class="btn btn-info btn-sm">
                            <i class="fas fa-eye"></i> Lihat Detail
                        </a>
                        <a href="{{ route('whatsapp-groups.index') }}" class="btn btn-secondary btn-sm">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </a>
                    </div>
                </div>

                <form action="{{ route('whatsapp-groups.update', $group->id) }}" method="POST">
                    @csrf
                    @method('PUT')
                    
                    <div class="card-body">
                        <div class="row">
                            <!-- Basic Information -->
                            <div class="col-md-8">
                                <div class="card">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">
                                            <i class="fas fa-info-circle text-primary"></i>
                                            Informasi Dasar
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="form-group">
                                            <label for="group_name">Nama Grup <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control @error('group_name') is-invalid @enderror" 
                                                   id="group_name" name="group_name" 
                                                   value="{{ old('group_name', $group->group_name) }}" required>
                                            @error('group_name')
                                                <div class="invalid-feedback">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="form-group">
                                            <label for="group_subject">Subject Grup</label>
                                            <input type="text" class="form-control @error('group_subject') is-invalid @enderror" 
                                                   id="group_subject" name="group_subject" 
                                                   value="{{ old('group_subject', $group->group_subject) }}">
                                            @error('group_subject')
                                                <div class="invalid-feedback">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="form-group">
                                            <label for="group_description">Deskripsi Grup</label>
                                            <textarea class="form-control @error('group_description') is-invalid @enderror" 
                                                      id="group_description" name="group_description" rows="3">{{ old('group_description', $group->group_description) }}</textarea>
                                            @error('group_description')
                                                <div class="invalid-feedback">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="form-group">
                                            <label for="apartment_id">Apartemen</label>
                                            <select class="form-control @error('apartment_id') is-invalid @enderror" 
                                                    id="apartment_id" name="apartment_id">
                                                <option value="">Pilih Apartemen</option>
                                                @foreach($apartments as $apartment)
                                                    <option value="{{ $apartment->id }}" 
                                                            {{ old('apartment_id', $group->apartment_id) == $apartment->id ? 'selected' : '' }}>
                                                        {{ $apartment->name }}
                                                    </option>
                                                @endforeach
                                            </select>
                                            @error('apartment_id')
                                                <div class="invalid-feedback">{{ $message }}</div>
                                            @enderror
                                        </div>

                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="participant_count">Jumlah Anggota</label>
                                                    <input type="number" class="form-control @error('participant_count') is-invalid @enderror" 
                                                           id="participant_count" name="participant_count" min="0"
                                                           value="{{ old('participant_count', $group->participant_count) }}">
                                                    @error('participant_count')
                                                        <div class="invalid-feedback">{{ $message }}</div>
                                                    @enderror
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label for="admin_count">Jumlah Admin</label>
                                                    <input type="number" class="form-control @error('admin_count') is-invalid @enderror" 
                                                           id="admin_count" name="admin_count" min="1"
                                                           value="{{ old('admin_count', $group->admin_count ?: 1) }}">
                                                    @error('admin_count')
                                                        <div class="invalid-feedback">{{ $message }}</div>
                                                    @enderror
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Settings -->
                            <div class="col-md-4">
                                <div class="card">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">
                                            <i class="fas fa-cogs text-secondary"></i>
                                            Pengaturan
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="form-group">
                                            <div class="custom-control custom-switch">
                                                <input type="checkbox" class="custom-control-input" 
                                                       id="is_active" name="is_active" value="1"
                                                       {{ old('is_active', $group->is_active) ? 'checked' : '' }}>
                                                <label class="custom-control-label" for="is_active">
                                                    <strong>Grup Aktif</strong>
                                                </label>
                                            </div>
                                            <small class="text-muted">Grup yang aktif akan diproses oleh bot</small>
                                        </div>

                                        <div class="form-group">
                                            <div class="custom-control custom-switch">
                                                <input type="checkbox" class="custom-control-input" 
                                                       id="is_monitoring" name="is_monitoring" value="1"
                                                       {{ old('is_monitoring', $group->is_monitoring) ? 'checked' : '' }}>
                                                <label class="custom-control-label" for="is_monitoring">
                                                    <strong>Monitoring Aktif</strong>
                                                </label>
                                            </div>
                                            <small class="text-muted">Bot akan memantau aktivitas grup ini</small>
                                        </div>

                                        <hr>

                                        <div class="form-group">
                                            <label><strong>Group ID:</strong></label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" value="{{ $group->group_id }}" readonly>
                                                <div class="input-group-append">
                                                    <button type="button" class="btn btn-outline-secondary" 
                                                            onclick="copyToClipboard('{{ $group->group_id }}')">
                                                        <i class="fas fa-copy"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <small class="text-muted">Group ID tidak dapat diubah</small>
                                        </div>

                                        <hr>

                                        <div class="form-group mb-0">
                                            <label><strong>Terakhir Diperbarui:</strong></label><br>
                                            <small class="text-muted">{{ $group->updated_at->format('d/m/Y H:i:s') }}</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="row">
                            <div class="col-md-6">
                                <button type="submit" class="btn btn-success">
                                    <i class="fas fa-save"></i> Simpan Perubahan
                                </button>
                                <a href="{{ route('whatsapp-groups.show', $group->id) }}" class="btn btn-secondary">
                                    <i class="fas fa-times"></i> Batal
                                </a>
                            </div>
                            <div class="col-md-6 text-right">
                                <button type="button" class="btn btn-danger" onclick="confirmDelete()">
                                    <i class="fas fa-trash"></i> Hapus Grup
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Delete Form (Hidden) -->
<form id="delete-form" action="{{ route('whatsapp-groups.destroy', $group->id) }}" method="POST" style="display: none;">
    @csrf
    @method('DELETE')
</form>

<script>
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        toastr.success('Group ID berhasil disalin ke clipboard!');
    }, function(err) {
        console.error('Could not copy text: ', err);
        toastr.error('Gagal menyalin Group ID');
    });
}

function confirmDelete() {
    if (confirm('Apakah Anda yakin ingin menghapus grup ini? Tindakan ini tidak dapat dibatalkan.')) {
        document.getElementById('delete-form').submit();
    }
}
</script>
@endsection
