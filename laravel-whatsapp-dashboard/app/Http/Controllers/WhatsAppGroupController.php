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
        $this->authorize('view-whatsapp-groups');

        $group = $whatsappGroup->load('apartment', 'transactions');

        // Get recent transactions from this group
        $recentTransactions = $group->transactions()
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        // Get group statistics
        $stats = [
            'total_transactions' => $group->transactions()->count(),
            'total_amount' => $group->transactions()->sum('amount'),
            'total_commission' => $group->transactions()->sum('commission'),
            'avg_amount' => $group->transactions()->avg('amount') ?? 0,
        ];

        return view('whatsapp-groups.show', compact('group', 'recentTransactions', 'stats'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(WhatsAppGroup $whatsappGroup)
    {
        $this->authorize('manage-whatsapp-groups');

        $group = $whatsappGroup;
        $apartments = Apartment::active()->get();

        return view('whatsapp-groups.edit', compact('group', 'apartments'));
    }

    public function update(Request $request, WhatsAppGroup $whatsappGroup)
    {
        $this->authorize('manage-whatsapp-groups');

        $validated = $request->validate([
            'group_name' => 'required|string|max:255',
            'group_subject' => 'nullable|string|max:255',
            'group_description' => 'nullable|string|max:1000',
            'apartment_id' => 'nullable|exists:apartments,id',
            'participant_count' => 'nullable|integer|min:0',
            'admin_count' => 'nullable|integer|min:1',
            'is_active' => 'boolean',
            'is_monitoring' => 'boolean',
        ]);

        // Handle checkbox values
        $validated['is_active'] = $request->has('is_active');
        $validated['is_monitoring'] = $request->has('is_monitoring');

        $oldValues = $whatsappGroup->toArray();
        $whatsappGroup->update($validated);

        ActivityLog::log('updated', $whatsappGroup, $oldValues, $validated, 'WhatsApp group updated');

        return redirect()
            ->route('whatsapp-groups.show', $whatsappGroup)
            ->with('success', 'Grup WhatsApp berhasil diperbarui!');
    }

    public function destroy(WhatsAppGroup $whatsappGroup)
    {
        $this->authorize('manage-whatsapp-groups');

        $hasTransactions = $whatsappGroup->transactions()->exists();

        if ($hasTransactions) {
            return redirect()->route('whatsapp-groups.index')
                ->with('error', 'Tidak dapat menghapus grup yang memiliki transaksi.');
        }

        $groupName = $whatsappGroup->group_name;
        $oldValues = $whatsappGroup->toArray();
        $whatsappGroup->delete();

        ActivityLog::log('deleted', $whatsappGroup, $oldValues, null, 'WhatsApp group removed from monitoring');

        return redirect()->route('whatsapp-groups.index')
            ->with('success', "Grup WhatsApp '{$groupName}' berhasil dihapus!");
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
     * Get available groups from WhatsApp Bot
     */
    private function getAvailableGroups()
    {
        return Cache::remember('whatsapp_available_groups', 60, function () {
            try {
                // Try to get groups from bot status file first
                $statusFile = storage_path('app/bot-status.json');
                if (file_exists($statusFile)) {
                    $statusData = json_decode(file_get_contents($statusFile), true);
                    if ($statusData && $statusData['status'] === 'CONNECTED') {
                        // Bot is connected, try to get groups from bot API
                        $groups = $this->getGroupsFromBot();
                        if (!empty($groups)) {
                            return $groups;
                        }
                    }
                }

                // Fallback: get groups from database
                return $this->getGroupsFromDatabase();

            } catch (\Exception $e) {
                \Log::error('Error getting available groups: ' . $e->getMessage());
                return $this->getGroupsFromDatabase();
            }
        });
    }

    /**
     * Get groups from WhatsApp Bot via HTTP API
     */
    private function getGroupsFromBot()
    {
        try {
            // For now, we'll use the groups that are already in the database
            // In the future, we can implement a direct API call to the bot
            return $this->getGroupsFromDatabase();
        } catch (\Exception $e) {
            \Log::error('Error getting groups from bot: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get groups from database
     */
    private function getGroupsFromDatabase()
    {
        try {
            $groups = WhatsAppGroup::select('group_id', 'group_name', 'group_subject', 'group_description', 'participant_count', 'admin_count')
                ->where('is_active', true)
                ->get()
                ->map(function ($group) {
                    return [
                        'id' => $group->group_id,
                        'name' => $group->group_name,
                        'subject' => $group->group_subject ?: $group->group_name,
                        'description' => $group->group_description ?: 'Grup WhatsApp',
                        'participant_count' => $group->participant_count ?: 0,
                        'admin_count' => $group->admin_count ?: 1,
                    ];
                })
                ->toArray();

            return $groups;
        } catch (\Exception $e) {
            \Log::error('Error getting groups from database: ' . $e->getMessage());
            return [];
        }
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
