@extends('layouts.app')

@section('title', 'Detail Grup WhatsApp')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title">
                        <i class="fas fa-users text-success"></i>
                        Detail Grup WhatsApp
                    </h3>
                    <div>
                        <a href="{{ route('whatsapp-groups.edit', $group->id) }}" class="btn btn-warning btn-sm">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <a href="{{ route('whatsapp-groups.index') }}" class="btn btn-secondary btn-sm">
                            <i class="fas fa-arrow-left"></i> Kembali
                        </a>
                    </div>
                </div>

                <div class="card-body">
                    <div class="row">
                        <!-- Group Information -->
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-info-circle text-primary"></i>
                                        Informasi Grup
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Nama Grup:</strong></div>
                                        <div class="col-sm-8">{{ $group->group_name }}</div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Subject:</strong></div>
                                        <div class="col-sm-8">{{ $group->group_subject ?: '-' }}</div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Deskripsi:</strong></div>
                                        <div class="col-sm-8">{{ $group->group_description ?: '-' }}</div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Group ID:</strong></div>
                                        <div class="col-sm-8">
                                            <code>{{ $group->group_id }}</code>
                                            <button class="btn btn-sm btn-outline-secondary ml-2" onclick="copyToClipboard('{{ $group->group_id }}')">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-sm-4"><strong>Apartemen:</strong></div>
                                        <div class="col-sm-8">
                                            @if($group->apartment)
                                                <span class="badge badge-info">{{ $group->apartment->name }}</span>
                                            @else
                                                <span class="text-muted">Belum ditentukan</span>
                                            @endif
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Statistics -->
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-chart-bar text-info"></i>
                                        Statistik
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-success">
                                            <i class="fas fa-users"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Total Anggota</span>
                                            <span class="info-box-number">{{ $group->participant_count ?: 0 }}</span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-warning">
                                            <i class="fas fa-user-shield"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Admin</span>
                                            <span class="info-box-number">{{ $group->admin_count ?: 1 }}</span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-{{ $group->is_active ? 'success' : 'danger' }}">
                                            <i class="fas fa-{{ $group->is_active ? 'check-circle' : 'times-circle' }}"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Status</span>
                                            <span class="info-box-number">
                                                {{ $group->is_active ? 'Aktif' : 'Tidak Aktif' }}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-{{ $group->is_monitoring ? 'primary' : 'secondary' }}">
                                            <i class="fas fa-{{ $group->is_monitoring ? 'eye' : 'eye-slash' }}"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Monitoring</span>
                                            <span class="info-box-number">
                                                {{ $group->is_monitoring ? 'Ya' : 'Tidak' }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Transaction Statistics -->
                            @if(isset($stats))
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-chart-line text-success"></i>
                                        Statistik Transaksi
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-info">
                                            <i class="fas fa-receipt"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Total Transaksi</span>
                                            <span class="info-box-number">{{ number_format($stats['total_transactions']) }}</span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-success">
                                            <i class="fas fa-money-bill-wave"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Total Pendapatan</span>
                                            <span class="info-box-number">Rp {{ number_format($stats['total_amount']) }}</span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-warning">
                                            <i class="fas fa-percentage"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Total Komisi</span>
                                            <span class="info-box-number">Rp {{ number_format($stats['total_commission']) }}</span>
                                        </div>
                                    </div>

                                    <div class="info-box bg-light">
                                        <span class="info-box-icon bg-primary">
                                            <i class="fas fa-calculator"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Rata-rata</span>
                                            <span class="info-box-number">Rp {{ number_format($stats['avg_amount']) }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            @endif
                        </div>
                    </div>

                    <!-- Activity Information -->
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">
                                        <i class="fas fa-clock text-secondary"></i>
                                        Informasi Aktivitas
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-3">
                                            <strong>Aktivitas Terakhir:</strong><br>
                                            <span class="text-muted">
                                                {{ $group->last_activity_at ? $group->last_activity_at->format('d/m/Y H:i') : 'Belum ada aktivitas' }}
                                            </span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Dibuat oleh Bot:</strong><br>
                                            <span class="text-muted">
                                                {{ $group->created_by_bot_at ? $group->created_by_bot_at->format('d/m/Y H:i') : '-' }}
                                            </span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Dibuat:</strong><br>
                                            <span class="text-muted">{{ $group->created_at->format('d/m/Y H:i') }}</span>
                                        </div>
                                        <div class="col-md-3">
                                            <strong>Diperbarui:</strong><br>
                                            <span class="text-muted">{{ $group->updated_at->format('d/m/Y H:i') }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Show success message
        toastr.success('Group ID berhasil disalin ke clipboard!');
    }, function(err) {
        console.error('Could not copy text: ', err);
        toastr.error('Gagal menyalin Group ID');
    });
}
</script>
@endsection
