@extends('layouts.app')

@section('title', 'WhatsApp Bot Management')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title">
                        <i class="fab fa-whatsapp text-success"></i>
                        WhatsApp Bot Management
                    </h3>
                    <div class="card-tools">
                        <span id="status-badge" class="badge badge-secondary">Loading...</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <!-- Bot Status -->
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">Bot Status</h4>
                                </div>
                                <div class="card-body">
                                    <div class="info-box">
                                        <span class="info-box-icon" id="status-icon">
                                            <i class="fas fa-robot"></i>
                                        </span>
                                        <div class="info-box-content">
                                            <span class="info-box-text">Status</span>
                                            <span class="info-box-number" id="status-text">Checking...</span>
                                            <div class="progress">
                                                <div class="progress-bar" id="status-progress"></div>
                                            </div>
                                            <span class="progress-description" id="status-description">
                                                Checking bot status...
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Bot Controls -->
                                    <div class="btn-group btn-group-sm w-100 mt-3" role="group">
                                        <button type="button" class="btn btn-success" id="start-btn">
                                            <i class="fas fa-play"></i> Start
                                        </button>
                                        <button type="button" class="btn btn-warning" id="restart-btn">
                                            <i class="fas fa-redo"></i> Restart
                                        </button>
                                        <button type="button" class="btn btn-danger" id="stop-btn">
                                            <i class="fas fa-stop"></i> Stop
                                        </button>
                                        <button type="button" class="btn btn-secondary" id="logout-btn">
                                            <i class="fas fa-sign-out-alt"></i> Logout
                                        </button>
                                    </div>

                                    <!-- Process Info -->
                                    <div class="mt-3">
                                        <small class="text-muted">
                                            <strong>Process ID:</strong> <span id="process-id">-</span><br>
                                            <strong>Session:</strong> <span id="session-status">-</span><br>
                                            <strong>Last Updated:</strong> <span id="last-updated">-</span>
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- QR Code -->
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">WhatsApp Connection</h4>
                                </div>
                                <div class="card-body text-center">
                                    <div id="qr-container">
                                        <div id="qr-loading" class="text-center">
                                            <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
                                            <p class="mt-2 text-muted">Loading QR Code...</p>
                                        </div>
                                        
                                        <div id="qr-code" style="display: none;">
                                            <h5 class="text-center mb-3">Scan QR Code with WhatsApp</h5>
                                            <div class="qr-code-display">
                                                <pre id="qr-ascii" class="text-center" style="font-size: 8px; line-height: 8px;"></pre>
                                            </div>
                                            <p class="text-muted mt-2">
                                                <small>
                                                    <i class="fas fa-mobile-alt"></i>
                                                    Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                                                </small>
                                            </p>
                                        </div>

                                        <div id="qr-connected" style="display: none;" class="text-center">
                                            <i class="fas fa-check-circle fa-3x text-success"></i>
                                            <h5 class="text-success mt-2">WhatsApp Connected!</h5>
                                            <p class="text-muted">Bot is ready to receive messages</p>
                                        </div>

                                        <div id="qr-error" style="display: none;" class="text-center">
                                            <i class="fas fa-exclamation-triangle fa-3x text-warning"></i>
                                            <h5 class="text-warning mt-2">Connection Issue</h5>
                                            <p class="text-muted">Please start the bot to generate QR code</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bot Logs -->
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">Bot Activity Log</h4>
                                    <div class="card-tools">
                                        <button type="button" class="btn btn-sm btn-outline-secondary" id="refresh-logs">
                                            <i class="fas fa-sync"></i> Refresh
                                        </button>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div id="bot-logs" style="height: 300px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 5px;">
                                        <div class="text-center text-muted">
                                            <i class="fas fa-file-alt fa-2x"></i>
                                            <p class="mt-2">Bot logs will appear here...</p>
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

<!-- Loading Modal -->
<div class="modal fade" id="loadingModal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-body text-center">
                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                <p class="mt-2 mb-0" id="loading-text">Processing...</p>
            </div>
        </div>
    </div>
</div>
@endsection

@section('scripts')
<script>
$(document).ready(function() {
    let statusInterval;
    let qrInterval;

    // Initialize
    updateStatus();
    updateQRCode();

    // Start auto-refresh
    statusInterval = setInterval(updateStatus, 5000); // Every 5 seconds
    qrInterval = setInterval(updateQRCode, 10000); // Every 10 seconds

    // Bot control buttons
    $('#start-btn').click(function() {
        controlBot('start', 'Starting bot...');
    });

    $('#restart-btn').click(function() {
        controlBot('restart', 'Restarting bot...');
    });

    $('#stop-btn').click(function() {
        controlBot('stop', 'Stopping bot...');
    });

    $('#logout-btn').click(function() {
        if (confirm('Are you sure you want to logout? This will clear the WhatsApp session.')) {
            controlBot('logout', 'Logging out...');
        }
    });

    // Refresh logs
    $('#refresh-logs').click(function() {
        // TODO: Implement log refresh
        showToast('info', 'Log refresh feature coming soon!');
    });

    function updateStatus() {
        $.get('/bot-status/status')
            .done(function(data) {
                updateStatusDisplay(data);
            })
            .fail(function() {
                updateStatusDisplay({
                    status: 'error',
                    is_running: false,
                    has_session: false,
                    pid: null
                });
            });
    }

    function updateQRCode() {
        $.get('/bot-status/qr-code')
            .done(function(data) {
                updateQRDisplay(data.qr_code);
            })
            .fail(function() {
                updateQRDisplay(null);
            });
    }

    function updateStatusDisplay(status) {
        const statusBadge = $('#status-badge');
        const statusIcon = $('#status-icon');
        const statusText = $('#status-text');
        const statusProgress = $('#status-progress');
        const statusDescription = $('#status-description');
        const processId = $('#process-id');
        const sessionStatus = $('#session-status');
        const lastUpdated = $('#last-updated');

        // Update status badge and icon
        statusBadge.removeClass('badge-secondary badge-success badge-warning badge-danger');
        statusIcon.removeClass('text-secondary text-success text-warning text-danger');
        statusProgress.removeClass('bg-secondary bg-success bg-warning bg-danger');

        switch (status.status) {
            case 'connected':
                statusBadge.addClass('badge-success').text('Connected');
                statusIcon.addClass('text-success');
                statusText.text('Connected');
                statusProgress.addClass('bg-success').css('width', '100%');
                statusDescription.text('Bot is connected and ready');
                break;
            case 'connecting':
                statusBadge.addClass('badge-warning').text('Connecting');
                statusIcon.addClass('text-warning');
                statusText.text('Connecting');
                statusProgress.addClass('bg-warning').css('width', '60%');
                statusDescription.text('Bot is running, waiting for WhatsApp connection');
                break;
            case 'disconnected':
                statusBadge.addClass('badge-secondary').text('Disconnected');
                statusIcon.addClass('text-secondary');
                statusText.text('Disconnected');
                statusProgress.addClass('bg-secondary').css('width', '0%');
                statusDescription.text('Bot is not running');
                break;
            default:
                statusBadge.addClass('badge-danger').text('Error');
                statusIcon.addClass('text-danger');
                statusText.text('Error');
                statusProgress.addClass('bg-danger').css('width', '0%');
                statusDescription.text('Unable to get bot status');
        }

        // Update process info
        processId.text(status.pid || '-');
        sessionStatus.text(status.has_session ? 'Active' : 'None');
        lastUpdated.text(new Date().toLocaleTimeString());

        // Update button states
        updateButtonStates(status);
    }

    function updateQRDisplay(qrCode) {
        const qrLoading = $('#qr-loading');
        const qrCodeDiv = $('#qr-code');
        const qrConnected = $('#qr-connected');
        const qrError = $('#qr-error');
        const qrAscii = $('#qr-ascii');

        // Hide all
        qrLoading.hide();
        qrCodeDiv.hide();
        qrConnected.hide();
        qrError.hide();

        if (qrCode) {
            qrAscii.text(qrCode);
            qrCodeDiv.show();
        } else {
            // Check current status to determine what to show
            const currentStatus = $('#status-badge').text().toLowerCase();
            
            if (currentStatus === 'connected') {
                qrConnected.show();
            } else if (currentStatus === 'connecting') {
                qrLoading.show();
            } else {
                qrError.show();
            }
        }
    }

    function updateButtonStates(status) {
        const startBtn = $('#start-btn');
        const restartBtn = $('#restart-btn');
        const stopBtn = $('#stop-btn');
        const logoutBtn = $('#logout-btn');

        if (status.is_running) {
            startBtn.prop('disabled', true);
            restartBtn.prop('disabled', false);
            stopBtn.prop('disabled', false);
            logoutBtn.prop('disabled', false);
        } else {
            startBtn.prop('disabled', false);
            restartBtn.prop('disabled', true);
            stopBtn.prop('disabled', true);
            logoutBtn.prop('disabled', true);
        }
    }

    function controlBot(action, loadingText) {
        showLoading(loadingText);

        $.post(`/bot-status/${action}`)
            .done(function(response) {
                hideLoading();
                
                if (response.success) {
                    showToast('success', response.message);
                    updateStatus();
                    updateQRCode();
                } else {
                    showToast('error', response.message);
                }
            })
            .fail(function(xhr) {
                hideLoading();
                const message = xhr.responseJSON?.message || 'An error occurred';
                showToast('error', message);
            });
    }

    function showLoading(text) {
        $('#loading-text').text(text);
        $('#loadingModal').modal('show');
    }

    function hideLoading() {
        $('#loadingModal').modal('hide');
    }

    function showToast(type, message) {
        // Simple toast implementation
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const toast = $(`
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
                ${message}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `);
        
        $('body').append(toast);
        
        setTimeout(() => {
            toast.alert('close');
        }, 5000);
    }

    // Cleanup intervals when page unloads
    $(window).on('beforeunload', function() {
        if (statusInterval) clearInterval(statusInterval);
        if (qrInterval) clearInterval(qrInterval);
    });
});
</script>
@endsection
