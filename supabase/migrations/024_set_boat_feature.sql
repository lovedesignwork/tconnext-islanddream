-- Set Boat Feature Migration
-- Creates guides, restaurants tables and related booking fields

-- Guides table
CREATE TABLE IF NOT EXISTS guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    languages TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    capacity INT DEFAULT 50,
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boat assignment locks table (similar to driver_pickup_locks)
CREATE TABLE IF NOT EXISTS boat_assignment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    guide_id UUID REFERENCES guides(id) ON DELETE SET NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, boat_id, activity_date)
);

-- Add guide_id and restaurant_id to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guide_id UUID REFERENCES guides(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guides_company_id ON guides(company_id);
CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_company_id ON restaurants(company_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_boat_assignment_locks_company_date ON boat_assignment_locks(company_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guide_id ON bookings(guide_id);
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_id ON bookings(restaurant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boat_assignment_locks_updated_at BEFORE UPDATE ON boat_assignment_locks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Boats, guides, and restaurants should be created during customer setup
-- Template commands for reference:
-- 
-- INSERT INTO boats (company_id, name, capacity, captain_name, status, notes)
-- VALUES ('<company_id>', 'Boat Name', 35, 'Captain Name', 'active', 'Notes');
--
-- INSERT INTO guides (company_id, name, nickname, phone, whatsapp, languages, status, notes)
-- VALUES ('<company_id>', 'Guide Name', 'Nickname', '+66...', '+66...', ARRAY['English', 'Thai'], 'active', 'Notes');
--
-- INSERT INTO restaurants (company_id, name, location, capacity, phone, status, notes)
-- VALUES ('<company_id>', 'Restaurant Name', 'Location', 50, '+66...', 'active', 'Notes');

