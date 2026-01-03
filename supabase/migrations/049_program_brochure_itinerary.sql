-- Add brochure_images, itinerary_html, and itinerary_title fields to programs table
-- brochure_images: JSONB array of image URLs (up to 10 images)
-- itinerary_html: Rich text/HTML content for itinerary
-- itinerary_title: Custom title for the itinerary accordion

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS brochure_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS itinerary_html TEXT,
ADD COLUMN IF NOT EXISTS itinerary_title TEXT DEFAULT 'Itinerary';

-- Add comment for documentation
COMMENT ON COLUMN programs.brochure_images IS 'Array of brochure image URLs (up to 10), displayed in lightbox on booking page';
COMMENT ON COLUMN programs.itinerary_html IS 'HTML/rich text content for itinerary accordion on booking page';
COMMENT ON COLUMN programs.itinerary_title IS 'Custom title for the itinerary accordion (defaults to Itinerary)';

