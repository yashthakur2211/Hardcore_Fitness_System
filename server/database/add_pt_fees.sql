-- Migration: Add Personal Trainer (PT) fees columns to fee_structure table
-- Run this script if you have an existing database to add PT pricing columns

-- Add ptBasePrice if it doesn't exist
SET @dbname = DATABASE();
SET @col1 = 'ptBasePrice';
SET @col2 = 'ptOfferPrice';
SET @col3 = 'ptOfferName';
SET @col4 = 'isPtOfferActive';
SET @tbl  = 'fee_structure';

SET @add1 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tbl AND COLUMN_NAME = @col1) = 0,
  'ALTER TABLE fee_structure ADD COLUMN ptBasePrice DECIMAL(10,2) DEFAULT 0',
  'SELECT ''ptBasePrice already exists'''
);
PREPARE stmt FROM @add1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @add2 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tbl AND COLUMN_NAME = @col2) = 0,
  'ALTER TABLE fee_structure ADD COLUMN ptOfferPrice DECIMAL(10,2) DEFAULT NULL',
  'SELECT ''ptOfferPrice already exists'''
);
PREPARE stmt FROM @add2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @add3 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tbl AND COLUMN_NAME = @col3) = 0,
  'ALTER TABLE fee_structure ADD COLUMN ptOfferName VARCHAR(100) DEFAULT NULL',
  'SELECT ''ptOfferName already exists'''
);
PREPARE stmt FROM @add3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @add4 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tbl AND COLUMN_NAME = @col4) = 0,
  'ALTER TABLE fee_structure ADD COLUMN isPtOfferActive BOOLEAN DEFAULT FALSE',
  'SELECT ''isPtOfferActive already exists'''
);
PREPARE stmt FROM @add4; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Update existing fee records with default PT prices (approximately double the regular price)
UPDATE fee_structure SET
  ptBasePrice   = basePrice * 2,
  ptOfferPrice  = CASE WHEN offerPrice IS NOT NULL THEN offerPrice * 2 ELSE NULL END,
  ptOfferName   = CASE WHEN offerName  IS NOT NULL THEN CONCAT('PT ', offerName) ELSE NULL END,
  isPtOfferActive = isOfferActive
WHERE ptBasePrice = 0 OR ptBasePrice IS NULL;

-- Verify the changes
SELECT * FROM fee_structure;
