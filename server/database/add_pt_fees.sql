-- Migration: Add Personal Trainer (PT) fees columns to fee_structure table
-- Run this script if you have an existing database to add PT pricing columns

-- Add PT columns to fee_structure table
ALTER TABLE fee_structure
ADD COLUMN IF NOT EXISTS ptBasePrice DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ptOfferPrice DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ptOfferName VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS isPtOfferActive BOOLEAN DEFAULT FALSE;

-- Update existing fee records with default PT prices (approximately double the regular price)
UPDATE fee_structure SET 
  ptBasePrice = basePrice * 2,
  ptOfferPrice = CASE WHEN offerPrice IS NOT NULL THEN offerPrice * 2 ELSE NULL END,
  ptOfferName = CASE WHEN offerName IS NOT NULL THEN CONCAT('PT ', offerName) ELSE NULL END,
  isPtOfferActive = isOfferActive
WHERE ptBasePrice = 0 OR ptBasePrice IS NULL;

-- Verify the changes
SELECT * FROM fee_structure;
