/**
 * Script untuk modernisasi semua Alert.alert menjadi ModernAlert
 * Jalankan dengan: node modernize-alerts.js
 */

const fs = require('fs');
const path = require('path');

// Daftar file yang perlu dimodernisasi
const filesToModernize = [
  'mobile/KakaRamaRoom/src/components/CleaningManagement.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminApartmentDetailScreen.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminAutoCheckoutScreen.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminCheckinScreen.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminFieldTeamManagementScreen.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminTeamsScreen.js',
  'mobile/KakaRamaRoom/src/screens/admin/AdminUnitsScreen.js',
  'mobile/KakaRamaRoom/src/screens/field/FieldCheckinScreen.js',
  'mobile/KakaRamaRoom/src/screens/field/FieldDashboardScreen.js',
  'mobile/KakaRamaRoom/src/screens/field/FieldExtendScreen.js',
  'mobile/KakaRamaRoom/src/screens/field/FieldUnitsOverviewScreen.js',
  'mobile/KakaRamaRoom/src/screens/field/FieldUnitsScreen.js',
  'mobile/KakaRamaRoom/src/screens/shared/ActivityLogScreen.js',
  'mobile/KakaRamaRoom/src/screens/shared/CheckinDetailScreen.js',
  'mobile/KakaRamaRoom/src/screens/shared/ProfileManagementScreen.js',
  'mobile/KakaRamaRoom/src/services/ImagePickerService.js'
];

// Mapping Alert.alert patterns ke ModernAlert
const alertPatterns = [
  {
    // Alert.alert('Title', 'Message');
    pattern: /Alert\.alert\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\);/g,
    replacement: `showAlert({
      type: 'info',
      title: '$1',
      message: '$2'
    });`
  },
  {
    // Alert.alert('Error', 'Message');
    pattern: /Alert\.alert\(\s*['"`]Error['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\);/g,
    replacement: `showAlert({
      type: 'error',
      title: 'Error',
      message: '$1'
    });`
  },
  {
    // Alert.alert('Berhasil', 'Message');
    pattern: /Alert\.alert\(\s*['"`]Berhasil['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\);/g,
    replacement: `showAlert({
      type: 'success',
      title: 'Berhasil',
      message: '$1'
    });`
  },
  {
    // Alert.alert('Sukses', 'Message');
    pattern: /Alert\.alert\(\s*['"`]Sukses['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\);/g,
    replacement: `showAlert({
      type: 'success',
      title: 'Berhasil',
      message: '$1'
    });`
  }
];

function modernizeFile(filePath) {
  try {
    console.log(`Modernizing: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file already uses ModernAlert
    if (content.includes('useModernAlert')) {
      console.log(`File already modernized: ${filePath}`);
      return;
    }

    // Add import for useModernAlert
    if (content.includes('import React') && !content.includes('useModernAlert')) {
      // Find the last import statement
      const importLines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].trim().startsWith('import ') && !importLines[i].includes('//')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        importLines.splice(lastImportIndex + 1, 0, "import { useModernAlert } from '../components/ModernAlert';");
        content = importLines.join('\n');
        modified = true;
      }
    }

    // Remove Alert from imports
    content = content.replace(/,\s*Alert\s*,/g, ',');
    content = content.replace(/Alert\s*,/g, '');
    content = content.replace(/,\s*Alert/g, '');

    // Add useModernAlert hook
    const componentMatch = content.match(/const\s+(\w+)\s*=\s*\(\s*{[^}]*}\s*\)\s*=>\s*{/);
    if (componentMatch) {
      const hookDeclaration = `  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();
  `;
      content = content.replace(componentMatch[0], componentMatch[0] + '\n' + hookDeclaration);
      modified = true;
    }

    // Apply alert patterns
    alertPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    // Add AlertComponent before closing component
    if (modified && !content.includes('<AlertComponent />')) {
      // Find the return statement and add AlertComponent
      const returnMatch = content.match(/return\s*\(/);
      if (returnMatch) {
        // Find the closing of the return statement
        const lines = content.split('\n');
        let returnStartIndex = -1;
        let returnEndIndex = -1;
        let parenCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('return (') && returnStartIndex === -1) {
            returnStartIndex = i;
            parenCount = 1;
          } else if (returnStartIndex !== -1) {
            parenCount += (lines[i].match(/\(/g) || []).length;
            parenCount -= (lines[i].match(/\)/g) || []).length;
            
            if (parenCount === 0) {
              returnEndIndex = i;
              break;
            }
          }
        }
        
        if (returnStartIndex !== -1 && returnEndIndex !== -1) {
          // Insert AlertComponent before the closing parenthesis
          lines.splice(returnEndIndex, 0, '      {/* Modern Alert Component */}');
          lines.splice(returnEndIndex + 1, 0, '      <AlertComponent />');
          content = lines.join('\n');
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Modernized: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error modernizing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Starting Alert modernization...\n');
  
  filesToModernize.forEach(filePath => {
    modernizeFile(filePath);
  });
  
  console.log('\n✨ Alert modernization completed!');
  console.log('\n📝 Manual steps required:');
  console.log('1. Review all changes for correctness');
  console.log('2. Handle complex Alert.alert patterns manually');
  console.log('3. Test all modernized components');
  console.log('4. Fix any import/syntax issues');
}

if (require.main === module) {
  main();
}

module.exports = { modernizeFile, alertPatterns };
