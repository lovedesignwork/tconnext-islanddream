# PowerShell script to combine all SQL migrations into a single file
# This makes it easy to run all migrations at once in Supabase SQL Editor

$migrationsDir = "supabase\migrations"
$outputFile = "combined-migrations.sql"

Write-Host "Combining all SQL migrations..." -ForegroundColor Green

# Get all SQL files sorted by name
$sqlFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

# Create output file with header
$header = @"
-- ============================================
-- COMBINED MIGRATIONS FOR TCONNEXT
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- Total Migrations: $($sqlFiles.Count)
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute all migrations
--
-- ============================================

"@

Set-Content -Path $outputFile -Value $header -Encoding UTF8

# Append each migration file
$count = 0
foreach ($file in $sqlFiles) {
    $count++
    Write-Host "  [$count/$($sqlFiles.Count)] Adding $($file.Name)..." -ForegroundColor Cyan
    
    $separator = @"

-- ============================================
-- MIGRATION: $($file.Name)
-- ============================================

"@
    
    Add-Content -Path $outputFile -Value $separator -Encoding UTF8
    
    # Read and append the SQL file content
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    Add-Content -Path $outputFile -Value $content -Encoding UTF8
    
    # Add spacing between migrations
    Add-Content -Path $outputFile -Value "`n`n" -Encoding UTF8
}

Write-Host ""
Write-Host "✓ Successfully combined $count migrations!" -ForegroundColor Green
Write-Host "✓ Output file: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor" -ForegroundColor White
Write-Host "2. Go to SQL Editor in the sidebar" -ForegroundColor White
Write-Host "3. Click 'New Query'" -ForegroundColor White
Write-Host "4. Copy the contents of '$outputFile' and paste it" -ForegroundColor White
Write-Host "5. Click 'Run' to execute all migrations" -ForegroundColor White
Write-Host ""

