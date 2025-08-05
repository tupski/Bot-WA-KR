@extends('layouts.app')

@section('title', 'Edit Customer Service')

@section('content')
<div class="row">
    <div class="col-12">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>Edit Customer Service: {{ $customerService->name }}</h2>
            <div>
                <a href="{{ route('customer-services.show', $customerService) }}" class="btn btn-outline-info">
                    <i class="bi bi-eye"></i> View
                </a>
                <a href="{{ route('customer-services.index') }}" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Kembali
                </a>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">
                    <i class="bi bi-pencil"></i> Form Edit Customer Service
                </h5>
            </div>
            <div class="card-body">
                <form action="{{ route('customer-services.update', $customerService) }}" method="POST">
                    @csrf
                    @method('PUT')
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="name" class="form-label">CS Name (Username) <span class="text-danger">*</span></label>
                            <input type="text" name="name" id="name" class="form-control @error('name') is-invalid @enderror" 
                                   value="{{ old('name') ?? $customerService->name }}" required>
                            @error('name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="full_name" class="form-label">Nama Lengkap</label>
                            <input type="text" name="full_name" id="full_name" class="form-control @error('full_name') is-invalid @enderror" 
                                   value="{{ old('full_name') ?? $customerService->full_name }}">
                            @error('full_name')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="phone" class="form-label">No. Telepon</label>
                            <input type="text" name="phone" id="phone" class="form-control @error('phone') is-invalid @enderror" 
                                   value="{{ old('phone') ?? $customerService->phone }}">
                            @error('phone')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="email" class="form-label">Email</label>
                            <input type="email" name="email" id="email" class="form-control @error('email') is-invalid @enderror" 
                                   value="{{ old('email') ?? $customerService->email }}">
                            @error('email')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="commission_rate" class="form-label">Commission Rate (%) <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input type="number" name="commission_rate" id="commission_rate" class="form-control @error('commission_rate') is-invalid @enderror" 
                                       value="{{ old('commission_rate') ?? $customerService->commission_rate }}" min="0" max="100" step="0.1" required>
                                <span class="input-group-text">%</span>
                            </div>
                            @error('commission_rate')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="target_monthly" class="form-label">Target Bulanan <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="number" name="target_monthly" id="target_monthly" class="form-control @error('target_monthly') is-invalid @enderror" 
                                       value="{{ old('target_monthly') ?? $customerService->target_monthly }}" min="0" step="100000" required>
                            </div>
                            @error('target_monthly')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="join_date" class="form-label">Tanggal Bergabung</label>
                            <input type="date" name="join_date" id="join_date" class="form-control @error('join_date') is-invalid @enderror" 
                                   value="{{ old('join_date') ?? ($customerService->join_date ? $customerService->join_date->format('Y-m-d') : '') }}">
                            @error('join_date')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>

                        <div class="col-md-6 mb-3">
                            <label for="is_active" class="form-label">Status</label>
                            <select name="is_active" id="is_active" class="form-select @error('is_active') is-invalid @enderror">
                                <option value="1" {{ (old('is_active') ?? $customerService->is_active) == 1 ? 'selected' : '' }}>Active</option>
                                <option value="0" {{ (old('is_active') ?? $customerService->is_active) == 0 ? 'selected' : '' }}>Inactive</option>
                            </select>
                            @error('is_active')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-3">
                            <label for="notes" class="form-label">Catatan</label>
                            <textarea name="notes" id="notes" class="form-control @error('notes') is-invalid @enderror" 
                                      rows="3">{{ old('notes') ?? $customerService->notes }}</textarea>
                            @error('notes')
                                <div class="invalid-feedback">{{ $message }}</div>
                            @enderror
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Update Customer Service
                            </button>
                            <a href="{{ route('customer-services.show', $customerService) }}" class="btn btn-outline-info">
                                <i class="bi bi-eye"></i> View
                            </a>
                            <a href="{{ route('customer-services.index') }}" class="btn btn-outline-secondary">
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
                    <i class="bi bi-info-circle"></i> Info CS
                </h5>
            </div>
            <div class="card-body">
                <table class="table table-sm">
                    <tr>
                        <td><strong>ID:</strong></td>
                        <td>{{ $customerService->id }}</td>
                    </tr>
                    <tr>
                        <td><strong>Dibuat:</strong></td>
                        <td>{{ $customerService->created_at->format('d/m/Y H:i') }}</td>
                    </tr>
                    <tr>
                        <td><strong>Diupdate:</strong></td>
                        <td>{{ $customerService->updated_at->format('d/m/Y H:i') }}</td>
                    </tr>
                </table>

                <hr>

                <h6>Current Values:</h6>
                <ul class="list-unstyled small">
                    <li><strong>Commission Rate:</strong> {{ $customerService->commission_rate }}%</li>
                    <li><strong>Target Monthly:</strong> Rp {{ number_format($customerService->target_monthly, 0, ',', '.') }}</li>
                    <li><strong>Status:</strong> {{ $customerService->status }}</li>
                </ul>

                <hr>

                <div class="alert alert-info alert-sm">
                    <i class="bi bi-info-circle"></i>
                    <strong>Perhatian:</strong> Perubahan CS Name akan mempengaruhi tracking transaksi.
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
