<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppGroup;
use App\Models\Apartment;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WhatsAppGroupController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view-whatsapp-groups')->only(['index', 'show']);
        $this->middleware('permission:manage-whatsapp-groups')->except(['index', 'show']);
    }

    public function index(Request $request)
    {
        $query = WhatsAppGroup::with('apartment');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('group_name', 'like', "%{$search}%")
                  ->orWhere('group_subject', 'like', "%{$search}%")
                  ->orWhere('group_id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            } elseif ($request->status === 'monitoring') {
                $query->where('is_monitoring', true);
            }
        }

        if ($request->filled('apartment_id')) {
            $query->where('apartment_id', $request->apartment_id);
        }

        $groups = $query->orderBy('last_activity_at', 'desc')->paginate(15)->withQueryString();
        $apartments = Apartment::active()->get();

        // Get available groups from WhatsApp API
        $availableGroups = $this->getAvailableGroups();

        return view('whatsapp-groups.index', compact('groups', 'apartments', 'availableGroups'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'group_id' => 'required|string|unique:whats_app_groups,group_id',
            'group_name' => 'required|string|max:255',
            'apartment_id' => 'nullable|exists:apartments,id',
            'is_monitoring' => 'boolean',
        ]);

        // Get group info from WhatsApp API
        $groupInfo = $this->getGroupInfo($validated['group_id']);

        $group = WhatsAppGroup::create([
            'group_id' => $validated['group_id'],
            'group_name' => $groupInfo['name'] ?? $validated['group_name'],
            'group_subject' => $groupInfo['subject'] ?? null,
            'group_description' => $groupInfo['description'] ?? null,
            'apartment_id' => $validated['apartment_id'],
            'is_active' => true,
            'is_monitoring' => $validated['is_monitoring'] ?? false,
            'participant_count' => $groupInfo['participant_count'] ?? 0,
            'admin_count' => $groupInfo['admin_count'] ?? 0,
            'created_by_bot_at' => now(),
        ]);

        ActivityLog::log('created', $group, null, $validated, 'WhatsApp group added to monitoring');

        return redirect()->route('whatsapp-groups.index')->with('success', 'Grup WhatsApp berhasil ditambahkan ke sistem.');
    }

    public function show(WhatsAppGroup $whatsappGroup)
    {
        $whatsappGroup->load('apartment', 'transactions');

        // Get recent transactions from this group
        $recentTransactions = $whatsappGroup->transactions()
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        // Get group statistics
        $stats = [
            'total_transactions' => $whatsappGroup->transactions()->count(),
            'total_amount' => $whatsappGroup->transactions()->sum('amount'),
            'total_commission' => $whatsappGroup->transactions()->sum('commission'),
            'avg_amount' => $whatsappGroup->transactions()->avg('amount') ?? 0,
        ];

        return view('whatsapp-groups.show', compact('whatsappGroup', 'recentTransactions', 'stats'));
    }

    public function update(Request $request, WhatsAppGroup $whatsappGroup)
    {
        $validated = $request->validate([
            'group_name' => 'required|string|max:255',
            'apartment_id' => 'nullable|exists:apartments,id',
            'is_active' => 'boolean',
            'is_monitoring' => 'boolean',
        ]);

        $oldValues = $whatsappGroup->toArray();
        $whatsappGroup->update($validated);

        ActivityLog::log('updated', $whatsappGroup, $oldValues, $validated, 'WhatsApp group updated');

        return redirect()->route('whatsapp-groups.index')->with('success', 'Grup WhatsApp berhasil diperbarui.');
    }

    public function destroy(WhatsAppGroup $whatsappGroup)
    {
        $hasTransactions = $whatsappGroup->transactions()->exists();

        if ($hasTransactions) {
            return redirect()->route('whatsapp-groups.index')
                ->with('error', 'Tidak dapat menghapus grup yang memiliki transaksi.');
        }

        $oldValues = $whatsappGroup->toArray();
        $whatsappGroup->delete();

        ActivityLog::log('deleted', $whatsappGroup, $oldValues, null, 'WhatsApp group removed from monitoring');

        return redirect()->route('whatsapp-groups.index')->with('success', 'Grup WhatsApp berhasil dihapus dari sistem.');
    }

    /**
     * Sync groups from WhatsApp API
     */
    public function sync()
    {
        $availableGroups = $this->getAvailableGroups();
        $syncedCount = 0;

        foreach ($availableGroups as $groupData) {
            $group = WhatsAppGroup::updateOrCreate(
                ['group_id' => $groupData['id']],
                [
                    'group_name' => $groupData['name'],
                    'group_subject' => $groupData['subject'] ?? null,
                    'group_description' => $groupData['description'] ?? null,
                    'participant_count' => $groupData['participant_count'] ?? 0,
                    'admin_count' => $groupData['admin_count'] ?? 0,
                    'last_activity_at' => now(),
                ]
            );

            if ($group->wasRecentlyCreated) {
                $syncedCount++;
            }
        }

        return redirect()->route('whatsapp-groups.index')
            ->with('success', "Berhasil sinkronisasi {$syncedCount} grup baru dari WhatsApp.");
    }

    /**
     * Toggle monitoring status
     */
    public function toggleMonitoring(WhatsAppGroup $whatsappGroup)
    {
        $whatsappGroup->update([
            'is_monitoring' => !$whatsappGroup->is_monitoring
        ]);

        $status = $whatsappGroup->is_monitoring ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json([
            'success' => true,
            'message' => "Monitoring grup {$status}",
            'is_monitoring' => $whatsappGroup->is_monitoring
        ]);
    }

    /**
     * Get available groups from WhatsApp API
     */
    private function getAvailableGroups()
    {
        return Cache::remember('whatsapp_available_groups', 300, function () {
            // In production, this would call actual WhatsApp API
            // For now, return sample data
            return [
                [
                    'id' => '120363317169602122@g.us',
                    'name' => 'SKY HOUSE BSD - Booking',
                    'subject' => 'Grup booking apartemen SKY HOUSE BSD',
                    'description' => 'Grup untuk koordinasi booking apartemen',
                    'participant_count' => 25,
                    'admin_count' => 3,
                ],
                [
                    'id' => '120363317169602123@g.us',
                    'name' => 'TREE PARK - Booking',
                    'subject' => 'Grup booking apartemen TREE PARK',
                    'description' => 'Grup untuk koordinasi booking apartemen',
                    'participant_count' => 18,
                    'admin_count' => 2,
                ],
                [
                    'id' => '120363317169602124@g.us',
                    'name' => 'EMERALD TOWER - Booking',
                    'subject' => 'Grup booking apartemen EMERALD TOWER',
                    'description' => 'Grup untuk koordinasi booking apartemen',
                    'participant_count' => 32,
                    'admin_count' => 4,
                ],
            ];
        });
    }

    /**
     * Get group info from WhatsApp API
     */
    private function getGroupInfo($groupId)
    {
        // In production, this would call actual WhatsApp API
        // For now, return sample data
        return [
            'name' => 'Sample Group',
            'subject' => 'Sample Subject',
            'description' => 'Sample Description',
            'participant_count' => 10,
            'admin_count' => 2,
        ];
    }
}
