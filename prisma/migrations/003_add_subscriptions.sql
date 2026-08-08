-- Migration 003 — Add Subscription Packages and Farmer Subscriptions tables

CREATE TABLE IF NOT EXISTS subscription_packages (
  id            VARCHAR(36) PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  description   TEXT NOT NULL,
  price         DECIMAL(12,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS farmer_subscriptions (
  id                   VARCHAR(36) PRIMARY KEY,
  farmer_id            VARCHAR(36) NOT NULL,
  package_id           VARCHAR(36) NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,
  duration_days        INT NOT NULL,
  start_date           DATETIME NULL,
  end_date             DATETIME NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, expired, cancelled
  checkout_request_id  VARCHAR(100) NULL UNIQUE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  CONSTRAINT fk_sub_package FOREIGN KEY (package_id) REFERENCES subscription_packages(id),
  INDEX idx_sub_farmer (farmer_id),
  INDEX idx_sub_package (package_id),
  INDEX idx_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
