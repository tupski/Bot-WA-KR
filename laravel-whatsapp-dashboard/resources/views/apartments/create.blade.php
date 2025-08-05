@extends('layouts.app')

@section('title', 'Tambah Apartemen')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Tambah Apartemen Baru</h2>
            <a href="{{ route('apartments.index') }}" class="btn btn-outline-secondary">
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
                    <i class="bi bi-building-add"></i> Form Apartemen Baru
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('apartments.store') }}" method="POST">
                    @csrf
                    
                    <div class="row">
                        <div class="col-md-8 mb-3">
                            <label for="name" class="form-label">Nama Apartemen <span class="text-danger">*</span></label>
                            <input type="text" name="name" id="name" class="form-control @error('name') is-invalid @enderror" 
                                   value="{{ old('name') }}" placeholder="Contoh: SKY HOUSE BSD" required>
                            @error('name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-4 mb-3">
                            <label for="code" class="form-label">Kode <span class="text-danger">*</span></label>
                            <input type="text" name="code" id="code" class="form-control @error('code') is-invalid @enderror" 
                                   value="{{ old('code') }}" placeholder="Contoh: SKY" required>
                            @error('code')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                            <small class="text-muted">Kode singkat untuk identifikasi</small>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="whatsapp_group_id" class="form-label">WhatsApp Group ID</label>
                            <input type="text" name="whatsapp_group_id" id="whatsapp_group_id" class="form-control @error('whatsapp_group_id') is-invalid @enderror" 
                                   value="{{ old('whatsapp_group_id') }}" placeholder="120363317169602122@g.us">
                            @error('whatsapp_group_id')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                            <small class="text-muted">ID grup WhatsApp untuk apartemen ini</small>
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="whatsapp_group_name" class="form-label">Nama Grup WhatsApp</label>
                            <input type="text" name="whatsapp_group_name" id="whatsapp_group_name" class="form-control @error('whatsapp_group_name') is-invalid @enderror" 
                                   value="{{ old('whatsapp_group_name') }}" placeholder="Contoh: SKY HOUSE BSD - Booking">
                            @error('whatsapp_group_name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="is_active" class="form-label">Status</label>
                            <select name="is_active" id="is_active" class="form-select @error('is_active') is-invalid @enderror">
                                <option value="1" {{ old('is_active', 1) == 1 ? 'selected' : '' }}>Active</option>
                                <option value="0" {{ old('is_active') == 0 ? 'selected' : '' }}>Inactive</option>
                            </select>
                            @error('is_active')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <label for="description" class="form-label">Deskripsi</label>
                            <textarea name="description" id="description" class="form-control @error('description') is-invalid @enderror" 
                                      rows="3" placeholder="Deskripsi apartemen, lokasi, fasilitas, dll...">{{ old('description') }}</textarea>
                            @error('description')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Simpan Apartemen
                            </button>
                            <a href="{{ route('apartments.index') }}" class="btn btn-outline-secondary">
                                <i class="bi bi-x-circle"></i> Batal
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-info-circle"></i> Panduan
                </h5>
            </div>
            <div class="card-body">
                <h6>Nama Apartemen:</h6>
                <ul class="list-unstyled small">
                    <li>• Nama lengkap apartemen</li>
                    <li>• Akan digunakan dalam sistem bot</li>
                    <li>• Harus unik dan tidak boleh sama</li>
                </ul>

                <hr>

                <h6>Kode Apartemen:</h6>
                <ul class="list-unstyled small">
                    <li>• Kode singkat untuk identifikasi</li>
                    <li>• Maksimal 20 karakter</li>
                    <li>• Sebaiknya huruf kapital</li>
                    <li>• Contoh: SKY, TREE, EMERALD</li>
                </ul>

                <hr>

                <h6>WhatsApp Group:</h6>
                <ul class="list-unstyled small">
                    <li>• ID grup WhatsApp untuk apartemen</li>
                    <li>• Format: xxxxx@g.us</li>
                    <li>• Digunakan untuk integrasi bot</li>
                    <li>• Opsional, bisa diisi nanti</li>
                </ul>

                <hr>

                <h6>Status:</h6>
                <ul class="list-unstyled small">
                    <li><span class="badge bg-success">Active</span> Apartemen dapat menerima booking</li>
                    <li><span class="badge bg-secondary">Inactive</span> Apartemen tidak dapat menerima booking</li>
                </ul>
            </div>
        </div>

        <div class="card mt-4">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-lightbulb"></i> Tips
                </h5>
            </div>
            <div class="card-body">
                <ul class="small text-muted">
                    <li>Pastikan nama apartemen sesuai dengan yang digunakan di bot</li>
                    <li>Kode apartemen sebaiknya singkat dan mudah diingat</li>
                    <li>WhatsApp Group ID bisa didapat dari bot atau admin grup</li>
                    <li>Gunakan status Inactive untuk apartemen yang sedang maintenance</li>
                </ul>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
// Auto generate code from name
document.getElementById('name').addEventListener('blur', function() {
    const name = this.value;
    const codeField = document.getElementById('code');
    
    if (name && !codeField.value) {
        // Extract first letters of each word
        const words = name.split(' ');
        let code = '';
        
        words.forEach(word => {
            if (word.length > 0) {
                code += word.charAt(0).toUpperCase();
            }
        });
        
        // Limit to 10 characters
        codeField.value = code.substring(0, 10);
    }
});

// Auto format code to uppercase
document.getElementById('code').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});
</script>
@endpush
