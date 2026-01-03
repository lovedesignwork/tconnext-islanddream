const fs = require('fs');
const path = require('path');

// Area patterns for Phuket
const phuketAreas = [
  { pattern: /\bPatong\b|\bPa Tong\b|\bป่าตอง\b/i, area: 'Patong' },
  { pattern: /\bKata\b|\bกะตะ\b/i, area: 'Kata' },
  { pattern: /\bKaron\b|\bกะรน\b/i, area: 'Karon' },
  { pattern: /\bRawai\b|\bราไวย์\b/i, area: 'Rawai' },
  { pattern: /\bKamala\b|\bกมลา\b/i, area: 'Kamala' },
  { pattern: /\bChalong\b|\bฉลอง\b/i, area: 'Chalong' },
  { pattern: /\bNai Harn\b|\bNaiharn\b|\bในหาน\b/i, area: 'Nai Harn' },
  { pattern: /\bSurin\b|\bสุรินทร์\b/i, area: 'Surin' },
  { pattern: /\bBang Tao\b|\bBangtao\b|\bบางเทา\b/i, area: 'Bang Tao' },
  { pattern: /\bChoeng Thale\b|\bCherngtalay\b|\bCherng Talay\b|\bเชิงทะเล\b/i, area: 'Choeng Thale' },
  { pattern: /\bMai Khao\b|\bMaikhao\b|\bไม้ขาว\b/i, area: 'Mai Khao' },
  { pattern: /\bNai Yang\b|\bNaiyang\b|\bในยาง\b/i, area: 'Nai Yang' },
  { pattern: /\bPhuket Town\b|\bTalat Yai\b|\bTalat Nuea\b|\bMueang Phuket\b|\bเมืองภูเก็ต\b|\bตลาดใหญ่\b|\bตลาดเหนือ\b/i, area: 'Phuket Town' },
  { pattern: /\bKathu\b|\bกะทู้\b/i, area: 'Kathu' },
  { pattern: /\bWichit\b|\bวิชิต\b/i, area: 'Wichit' },
  { pattern: /\bRassada\b|\bRatsada\b|\bรัษฎา\b/i, area: 'Ratsada' },
  { pattern: /\bThep Krasatti\b|\bThep Krasattri\b|\bเทพกระษัตรี\b/i, area: 'Thep Krasattri' },
  { pattern: /\bSi Sunthon\b|\bSrisunthon\b|\bศรีสุนทร\b/i, area: 'Si Sunthon' },
  { pattern: /\bSakhu\b|\bสาคู\b/i, area: 'Sakhu' },
  { pattern: /\bPa Klok\b|\bป่าคลอก\b/i, area: 'Pa Klok' },
  { pattern: /\bThalang\b|\bถลาง\b/i, area: 'Thalang' },
  { pattern: /\bLayan\b|\bลายัน\b/i, area: 'Layan' },
  { pattern: /\bPanwa\b|\bแหลมพันวา\b/i, area: 'Cape Panwa' },
  { pattern: /\bTri Trang\b|\bตรีตรัง\b/i, area: 'Tri Trang' },
  { pattern: /\bYa Nui\b|\bYanui\b|\bหาดยะนุ้ย\b/i, area: 'Ya Nui' },
  { pattern: /\bAo Yon\b|\bอ่าวยน\b/i, area: 'Ao Yon' },
  { pattern: /\bNai Thon\b|\bในทอน\b/i, area: 'Nai Thon' },
  { pattern: /\bLaguna\b/i, area: 'Laguna' },
];

// Area patterns for Phang Nga
const phangNgaAreas = [
  { pattern: /\bKhao Lak\b|\bKhaolak\b|\bเขาหลัก\b/i, area: 'Khao Lak' },
  { pattern: /\bKoh Yao Noi\b|\bKo Yao Noi\b|\bเกาะยาวน้อย\b/i, area: 'Koh Yao Noi' },
  { pattern: /\bKoh Yao Yai\b|\bKo Yao Yai\b|\bเกาะยาวใหญ่\b/i, area: 'Koh Yao Yai' },
  { pattern: /\bTakua Pa\b|\bTakuapa\b|\bตะกั่วป่า\b/i, area: 'Takua Pa' },
  { pattern: /\bBang Sak\b|\bBangsak\b|\bบางสัก\b/i, area: 'Bang Sak' },
  { pattern: /\bNatai\b|\bนาใต้\b/i, area: 'Natai' },
  { pattern: /\bKhuk Khak\b|\bKukkak\b|\bคึกคัก\b/i, area: 'Khuk Khak' },
  { pattern: /\bLam Kaen\b|\bLamkaen\b|\bลำแก่น\b/i, area: 'Lam Kaen' },
  { pattern: /\bThai Mueang\b|\bThaimuang\b|\bท้ายเหมือง\b/i, area: 'Thai Mueang' },
  { pattern: /\bTakua Thung\b|\bตะกั่วทุ่ง\b/i, area: 'Takua Thung' },
  { pattern: /\bKok Kloi\b|\bโคกกลอย\b/i, area: 'Kok Kloi' },
  { pattern: /\bMueang Phang Nga\b|\bเมืองพังงา\b/i, area: 'Mueang Phang Nga' },
  { pattern: /\bPhang Nga\b|\bพังงา\b/i, area: 'Phang Nga Town' },
];

function extractArea(name, address, isPhangNga = false) {
  const combined = `${name} ${address}`;
  const areas = isPhangNga ? phangNgaAreas : phuketAreas;
  
  for (const { pattern, area } of areas) {
    if (pattern.test(combined)) {
      return area;
    }
  }
  
  // Default areas
  if (isPhangNga) {
    // Check if it's Koh Yao based on name
    if (/Koh Yao|Ko Yao|เกาะยาว/i.test(combined)) {
      return 'Koh Yao';
    }
    return 'Phang Nga';
  }
  
  return 'Phuket';
}

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\').trim();
}

function parseCSV(content) {
  const lines = content.split('\n');
  const hotels = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with potential quoted fields
    const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g);
    if (!matches || matches.length < 5) continue;
    
    // Clean up the matches
    const fields = matches.map(m => {
      let val = m.replace(/^,/, '');
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      return val.trim();
    });
    
    const hotelId = fields[0];
    const hotelName = fields[3] || '';
    const hotelAddress = fields[4] || '';
    
    if (hotelName) {
      hotels.push({
        id: hotelId,
        name: hotelName,
        address: hotelAddress
      });
    }
  }
  
  return hotels;
}

function generateSQL() {
  // Read CSV files
  const phuketCSV = fs.readFileSync(path.join(__dirname, '..', 'Phuket_Hotel.csv'), 'utf-8');
  const phangNgaCSV = fs.readFileSync(path.join(__dirname, '..', 'Phang_Nga_Hotel.csv'), 'utf-8');
  
  const phuketHotels = parseCSV(phuketCSV);
  const phangNgaHotels = parseCSV(phangNgaCSV);
  
  console.log(`Parsed ${phuketHotels.length} Phuket hotels`);
  console.log(`Parsed ${phangNgaHotels.length} Phang Nga hotels`);
  
  let sql = `-- Migration: Import hotels from MySQL database
-- Source: Phuket_Hotel.csv and Phang_Nga_Hotel.csv
-- Generated: ${new Date().toISOString()}
-- Total Phuket Hotels: ${phuketHotels.length}
-- Total Phang Nga Hotels: ${phangNgaHotels.length}

-- Clear existing reference_hotels and insert fresh data
TRUNCATE TABLE reference_hotels;

-- =====================================================
-- PHUKET HOTELS (${phuketHotels.length} hotels)
-- =====================================================

INSERT INTO reference_hotels (name, area, province) VALUES
`;

  // Add Phuket hotels
  const phuketValues = phuketHotels.map(hotel => {
    const area = extractArea(hotel.name, hotel.address, false);
    const name = escapeSQL(hotel.name);
    return `('${name}', '${area}', 'Phuket')`;
  });
  
  sql += phuketValues.join(',\n') + ';\n\n';
  
  sql += `-- =====================================================
-- PHANG NGA HOTELS (${phangNgaHotels.length} hotels)
-- =====================================================

INSERT INTO reference_hotels (name, area, province) VALUES
`;

  // Add Phang Nga hotels
  const phangNgaValues = phangNgaHotels.map(hotel => {
    const area = extractArea(hotel.name, hotel.address, true);
    const name = escapeSQL(hotel.name);
    return `('${name}', '${area}', 'Phang Nga')`;
  });
  
  sql += phangNgaValues.join(',\n') + ';\n\n';
  
  sql += `-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reference_hotels_name_trgm ON reference_hotels USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reference_hotels_area ON reference_hotels(area);
CREATE INDEX IF NOT EXISTS idx_reference_hotels_province ON reference_hotels(province);

-- Summary
-- Total hotels imported: ${phuketHotels.length + phangNgaHotels.length}
`;

  // Write SQL file
  const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_import_hotels_from_mysql.sql');
  fs.writeFileSync(outputPath, sql);
  
  console.log(`\nGenerated SQL migration: ${outputPath}`);
  console.log(`Total hotels: ${phuketHotels.length + phangNgaHotels.length}`);
  
  // Print area distribution
  const areaCount = {};
  phuketHotels.forEach(h => {
    const area = extractArea(h.name, h.address, false);
    areaCount[area] = (areaCount[area] || 0) + 1;
  });
  phangNgaHotels.forEach(h => {
    const area = extractArea(h.name, h.address, true);
    areaCount[area] = (areaCount[area] || 0) + 1;
  });
  
  console.log('\nArea distribution:');
  Object.entries(areaCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([area, count]) => {
      console.log(`  ${area}: ${count}`);
    });
}

generateSQL();












