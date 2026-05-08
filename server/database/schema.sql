-- Gym Master Hub Database Schema
-- Run this SQL script to create the database and tables

CREATE DATABASE IF NOT EXISTS gymmaster_db;
USE gymmaster_db;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'staff') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Trainers table
CREATE TABLE IF NOT EXISTS trainers (
  trainerId VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  specialization VARCHAR(100),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  memberId VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  dob DATE NOT NULL,
  address TEXT,
  photo TEXT,
  status ENUM('active', 'expired', 'expiring', 'cancelled', 'inactive') DEFAULT 'active',
  hasPersonalTrainer BOOLEAN DEFAULT FALSE,
  assignedTrainerId VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignedTrainerId) REFERENCES trainers(trainerId) ON DELETE SET NULL
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id VARCHAR(20) PRIMARY KEY,
  memberId VARCHAR(20) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  duration INT NOT NULL,
  status ENUM('active', 'expired') DEFAULT 'active',
  totalFees DECIMAL(10, 2) NOT NULL,
  paid DECIMAL(10, 2) DEFAULT 0,
  pending DECIMAL(10, 2) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (memberId) REFERENCES members(memberId) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(20) PRIMARY KEY,
  memberId VARCHAR(20) NOT NULL,
  membershipId VARCHAR(20) NOT NULL,
  totalFees DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  paid DECIMAL(10, 2) NOT NULL,
  pending DECIMAL(10, 2) NOT NULL,
  paymentMode ENUM('cash', 'upi', 'cheque') NOT NULL,
  receiptId VARCHAR(50) NOT NULL,
  paymentDate DATE NOT NULL,
  dueDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (memberId) REFERENCES members(memberId) ON DELETE CASCADE,
  FOREIGN KEY (membershipId) REFERENCES memberships(id) ON DELETE CASCADE
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(20) PRIMARY KEY,
  memberId VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent') DEFAULT 'present',
  checkInTime TIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memberId) REFERENCES members(memberId) ON DELETE CASCADE,
  UNIQUE KEY unique_member_date (memberId, date)
);

-- Trainer Attendance table
CREATE TABLE IF NOT EXISTS trainer_attendance (
  id VARCHAR(20) PRIMARY KEY,
  trainerId VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  checkInTime TIME NOT NULL,
  checkOutTime TIME,
  status ENUM('present', 'absent') DEFAULT 'present',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainerId) REFERENCES trainers(trainerId) ON DELETE CASCADE,
  UNIQUE KEY unique_trainer_date (trainerId, date)
);

-- Enquiries table
CREATE TABLE IF NOT EXISTS enquiries (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  visitDate DATE NOT NULL,
  notes TEXT,
  referralSource VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Gym Info table
CREATE TABLE IF NOT EXISTS gym_info (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  timings VARCHAR(200) NOT NULL,
  welcomeMessage TEXT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Fee Structure table
CREATE TABLE IF NOT EXISTS fee_structure (
  id INT PRIMARY KEY AUTO_INCREMENT,
  duration INT NOT NULL UNIQUE,
  basePrice DECIMAL(10, 2) NOT NULL,
  offerPrice DECIMAL(10, 2),
  offerName VARCHAR(100),
  isOfferActive BOOLEAN DEFAULT FALSE,
  ptBasePrice DECIMAL(10, 2) DEFAULT 0,
  ptOfferPrice DECIMAL(10, 2),
  ptOfferName VARCHAR(100),
  isPtOfferActive BOOLEAN DEFAULT FALSE,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Performance indexes (safe to run on fresh DB; skip manually if re-running on existing DB)
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_memberships_memberId ON memberships(memberId);
CREATE INDEX idx_memberships_endDate ON memberships(endDate);
CREATE INDEX idx_payments_memberId ON payments(memberId);
CREATE INDEX idx_payments_paymentDate ON payments(paymentDate);
CREATE INDEX idx_attendance_memberId ON attendance(memberId);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_trainer_attendance_trainerId ON trainer_attendance(trainerId);
CREATE INDEX idx_trainer_attendance_date ON trainer_attendance(date);
CREATE INDEX idx_enquiries_visitDate ON enquiries(visitDate);

-- Insert default gym info
INSERT INTO gym_info (id, name, address, phone, email, timings, welcomeMessage) VALUES
(1, 'Hardcore Fitness Gym', 'Balajinagar, Medenkarwadi Chakan, Pune-410501', '+91 9172721040', 'fitnesshardcore91@gmail.com',
 'Mon-Sat: 5:00 AM - 10:00 AM | 5:00 PM - 10:00 PM',
 'Welcome to Hardcore Fitness Gym! Your journey to fitness starts here. We''re committed to helping you achieve your health and fitness goals.')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  address = VALUES(address),
  phone = VALUES(phone),
  email = VALUES(email),
  timings = VALUES(timings),
  welcomeMessage = VALUES(welcomeMessage);

-- Insert default fee structure
INSERT INTO fee_structure (duration, basePrice, offerPrice, offerName, isOfferActive, ptBasePrice, ptOfferPrice, ptOfferName, isPtOfferActive) VALUES
(1, 1000.00, NULL, NULL, FALSE, 2000.00, NULL, NULL, FALSE),
(3, 2700.00, NULL, NULL, FALSE, 5400.00, NULL, NULL, FALSE),
(6, 5000.00, 4500.00, 'Summer Special', TRUE, 9000.00, 8000.00, 'PT Summer Special', TRUE),
(12, 9000.00, 7500.00, 'Annual Discount', TRUE, 16000.00, 14000.00, 'PT Annual Discount', TRUE)
ON DUPLICATE KEY UPDATE duration = duration;

-- No default users — create your admin account via the registration page on first launch.
