-- Create the database
CREATE DATABASE cinema_reservation;

-- Use the database
USE cinema_reservation;

-- Create the 'seats' table
CREATE TABLE seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(10) NOT NULL DEFAULT 'free',
  email VARCHAR(255)
);

-- Insert initial data (optional)
INSERT INTO seats (status) VALUES ('free'), ('free');
