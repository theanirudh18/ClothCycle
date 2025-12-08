-- ClothCycle Database Schema
-- Created for Donation, QR Scanning, Leaderboard & Impact Tracking

CREATE DATABASE IF NOT EXISTS clothcycle;
USE clothcycle;

-- ============================
-- USERS TABLE
-- ============================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    points INT DEFAULT 0,
    donations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- BINS TABLE
-- ============================
CREATE TABLE bins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bin_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type ENUM('men','women','kids','mixed') DEFAULT 'mixed',
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    capacity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- DONATIONS TABLE
-- ============================
CREATE TABLE donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bin_id INT NOT NULL,
    items INT NOT NULL,
    weight_kg DECIMAL(5,2),
    points_earned INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE
);

-- ============================
-- SCAN LOGS TABLE
-- ============================
CREATE TABLE scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bin_id INT NOT NULL,
    qr_code VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE
);

-- ============================
-- BADGES TABLE
-- ============================
CREATE TABLE badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- ============================
-- USER-BADGES (MANY-TO-MANY)
-- ============================
CREATE TABLE user_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);
INSERT INTO bins (bin_code, name, type, address, latitude, longitude, capacity)
VALUES
('BIN01', 'AIT Campus', 'mixed', 'AGS Colony, Anand Nagar, Hebbal', 13.032639, 77.592472, 20),
('BIN02', 'Lakshmi Nivas', 'mixed', '4th Cross Road, CIL Layout', 13.037250, 77.599722, 20),
('BIN03', 'SSN Clermont', 'mixed', 'Outer Ring Rd, Opp. Nagawara', 13.041056, 77.609778, 20);


-- Insert default badges
INSERT INTO badges (name, description) VALUES
('First Donation', 'Awarded for completing the first donation'),
('Eco Supporter', 'Earned after reaching 100 points'),
('Dedicated Donor', 'Earned after 10 donor scans');

-- ============================
-- IMPACT TABLE
-- ============================
CREATE TABLE impact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_kg DECIMAL(10,2) DEFAULT 0,
    families_helped INT DEFAULT 0,
    co2_saved_kg DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ensure one global row
INSERT INTO impact (total_kg, families_helped, co2_saved_kg)
VALUES (0,0,0);
