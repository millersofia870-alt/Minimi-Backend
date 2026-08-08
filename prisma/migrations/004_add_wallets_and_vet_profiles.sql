-- Wallet balances are a cache of the immutable wallet_transactions ledger.
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY,
  owner_id VARCHAR(36) NOT NULL,
  owner_role VARCHAR(10) NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wallet_owner (owner_id, owner_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(36) PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  type VARCHAR(30) NOT NULL, -- deposit | service_debit | service_credit
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | success | failed
  request_id VARCHAR(36) NULL,
  payment_request_id VARCHAR(36) NULL,
  checkout_request_id VARCHAR(100) NULL UNIQUE,
  mpesa_receipt_number VARCHAR(50) NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  INDEX idx_wallet_tx_wallet (wallet_id, created_at),
  INDEX idx_wallet_tx_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_payment_requests (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  farmer_id VARCHAR(36) NOT NULL,
  vet_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | rejected | expired
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  CONSTRAINT fk_wpr_request FOREIGN KEY (request_id) REFERENCES service_requests(id),
  CONSTRAINT fk_wpr_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  CONSTRAINT fk_wpr_vet FOREIGN KEY (vet_id) REFERENCES vets(id),
  INDEX idx_wpr_farmer (farmer_id, status),
  INDEX idx_wpr_vet (vet_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE vets ADD COLUMN profile_image_url LONGTEXT NULL;
