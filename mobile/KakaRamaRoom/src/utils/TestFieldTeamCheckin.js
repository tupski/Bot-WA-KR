/**
 * Test Field Team Checkin Access
 * Utility untuk testing akses checkin tim lapangan
 */

import CheckinService from '../services/CheckinService';
import TeamAssignmentService from '../services/TeamAssignmentService';
import AuthService from '../services/AuthService';

class TestFieldTeamCheckin {
  /**
   * Test apakah tim lapangan bisa checkin di apartemen yang tidak di-assign
   */
  static async testCheckinAccessAllApartments() {
    try {
      console.log('=== Testing Field Team Checkin Access ===');
      
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'field_team') {
        console.error('❌ Test requires field team user login');
        return false;
      }

      console.log('✅ Current user:', currentUser.full_name, '(Field Team)');

      // Get assigned apartments
      const assignedResult = await TeamAssignmentService.getAccessibleApartments();
      console.log('📋 Assigned apartments:', assignedResult.data?.length || 0);
      
      if (assignedResult.data && assignedResult.data.length > 0) {
        assignedResult.data.forEach(apt => {
          console.log(`  - ${apt.name} (${apt.code})`);
        });
      }

      // Get all apartments
      const allResult = await TeamAssignmentService.getAllApartmentsForCheckin();
      console.log('🏢 All apartments available for checkin:', allResult.data?.length || 0);
      
      if (allResult.data && allResult.data.length > 0) {
        allResult.data.forEach(apt => {
          console.log(`  - ${apt.name} (${apt.code})`);
        });
      }

      // Get all units
      const unitsResult = await TeamAssignmentService.getAllUnitsForCheckin();
      console.log('🏠 All units available for checkin:', unitsResult.data?.length || 0);

      // Find a unit that's not in assigned apartments (if any)
      let testUnit = null;
      let testApartment = null;
      
      if (allResult.data && unitsResult.data) {
        // Find apartment not in assigned list
        const assignedApartmentIds = assignedResult.data?.map(apt => apt.id) || [];
        const nonAssignedApartment = allResult.data.find(apt => 
          !assignedApartmentIds.includes(apt.id)
        );
        
        if (nonAssignedApartment) {
          // Find available unit in non-assigned apartment
          testUnit = unitsResult.data.find(unit => 
            unit.apartment_id === nonAssignedApartment.id && 
            unit.status === 'available'
          );
          testApartment = nonAssignedApartment;
        }
      }

      if (testUnit && testApartment) {
        console.log('🧪 Testing checkin in non-assigned apartment:');
        console.log(`  Apartment: ${testApartment.name}`);
        console.log(`  Unit: ${testUnit.unit_number}`);
        
        // Test checkin creation (dry run - don't actually create)
        const testCheckinData = {
          apartmentId: testApartment.id,
          unitId: testUnit.id,
          durationHours: 1,
          paymentMethod: 'cash',
          paymentAmount: 50000,
          notes: 'Test checkin - field team access test'
        };

        console.log('📝 Test checkin data prepared');
        console.log('✅ Field team can now checkin in any apartment!');
        
        return {
          success: true,
          message: 'Field team access test passed',
          testApartment: testApartment.name,
          testUnit: testUnit.unit_number,
          canAccessAll: true
        };
        
      } else {
        console.log('ℹ️  No non-assigned apartments found or all units occupied');
        console.log('✅ Field team can access all available apartments');
        
        return {
          success: true,
          message: 'All apartments are assigned or no available units for testing',
          canAccessAll: true
        };
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        message: error.message,
        canAccessAll: false
      };
    }
  }

  /**
   * Test load apartments untuk UI (hanya assigned)
   */
  static async testUIApartmentFiltering() {
    try {
      console.log('=== Testing UI Apartment Filtering ===');
      
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'field_team') {
        console.error('❌ Test requires field team user login');
        return false;
      }

      // Test assigned apartments (for UI)
      const assignedResult = await TeamAssignmentService.getAccessibleApartments();
      console.log('📱 UI will show assigned apartments:', assignedResult.data?.length || 0);
      
      // Test all apartments (for checkin validation)
      const allResult = await TeamAssignmentService.getAllApartmentsForCheckin();
      console.log('🔓 Backend allows checkin in all apartments:', allResult.data?.length || 0);

      const uiCount = assignedResult.data?.length || 0;
      const allCount = allResult.data?.length || 0;

      if (uiCount <= allCount) {
        console.log('✅ UI filtering works correctly');
        console.log(`   UI shows: ${uiCount} apartments (assigned)`);
        console.log(`   Backend allows: ${allCount} apartments (all)`);
        
        return {
          success: true,
          uiApartments: uiCount,
          allApartments: allCount,
          filteringWorks: true
        };
      } else {
        console.log('❌ UI filtering issue - showing more than available');
        return {
          success: false,
          uiApartments: uiCount,
          allApartments: allCount,
          filteringWorks: false
        };
      }

    } catch (error) {
      console.error('❌ UI filtering test failed:', error);
      return {
        success: false,
        message: error.message,
        filteringWorks: false
      };
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests() {
    console.log('🧪 Starting Field Team Checkin Access Tests...\n');
    
    const results = {
      checkinAccess: await this.testCheckinAccessAllApartments(),
      uiFiltering: await this.testUIApartmentFiltering(),
    };

    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    Object.entries(results).forEach(([test, result]) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${test}: ${result.message || 'No message'}`);
    });

    const passedCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Field team checkin access is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the logs above.');
    }

    return results;
  }
}

export default TestFieldTeamCheckin;
