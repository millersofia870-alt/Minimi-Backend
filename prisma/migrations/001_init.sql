-- Minimi Agri — initial schema (MySQL)
-- Mirrors prisma/schema.prisma field-for-field. If you have a working
-- `prisma generate`/`migrate` in your own environment (this sandbox blocks
-- binaries.prisma.sh), you can use Prisma Migrate instead of this file —
-- they produce the same tables.

CREATE TABLE IF NOT EXISTS farmers (
  id         VARCHAR(36) PRIMARY KEY,
  full_name  VARCHAR(191) NOT NULL,
  id_number  VARCHAR(30) NOT NULL UNIQUE,
  phone      VARCHAR(20) NOT NULL UNIQUE,
  county     VARCHAR(100) NOT NULL,
  sub_county VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vets (
  id         VARCHAR(36) PRIMARY KEY,
  full_name  VARCHAR(191) NOT NULL,
  id_number  VARCHAR(30) NOT NULL UNIQUE,
  phone      VARCHAR(20) NOT NULL UNIQUE,
  county     VARCHAR(100) NOT NULL,
  sub_county VARCHAR(100) NOT NULL,
  status     VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
  rating     FLOAT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  id            VARCHAR(36) PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(191) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_requests (
  id                  VARCHAR(36) PRIMARY KEY,
  farmer_id           VARCHAR(36) NOT NULL,
  vet_id              VARCHAR(36) NULL,
  county              VARCHAR(100) NOT NULL,
  sub_county          VARCHAR(100) NOT NULL,
  description         TEXT NOT NULL,
  animal_or_crop_type VARCHAR(100) NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  requested_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at         DATETIME NULL,
  completed_at        DATETIME NULL,
  paid_at             DATETIME NULL,
  CONSTRAINT fk_sr_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  CONSTRAINT fk_sr_vet FOREIGN KEY (vet_id) REFERENCES vets(id),
  INDEX idx_sr_county_status (county, sub_county, status),
  INDEX idx_sr_farmer (farmer_id),
  INDEX idx_sr_vet (vet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id          VARCHAR(36) PRIMARY KEY,
  request_id  VARCHAR(36) NOT NULL,
  sender_role VARCHAR(10) NOT NULL,
  sender_id   VARCHAR(36) NOT NULL,
  message     TEXT NOT NULL,
  media_url   VARCHAR(500) NULL,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at     DATETIME NULL,
  CONSTRAINT fk_cm_request FOREIGN KEY (request_id) REFERENCES service_requests(id),
  INDEX idx_cm_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS capture_images (
  id          VARCHAR(36) PRIMARY KEY,
  request_id  VARCHAR(36) NOT NULL,
  vet_id      VARCHAR(36) NOT NULL,
  farmer_id   VARCHAR(36) NOT NULL,
  image_url   LONGTEXT NOT NULL,
  type        VARCHAR(20) NOT NULL,
  notes       TEXT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_request FOREIGN KEY (request_id) REFERENCES service_requests(id),
  CONSTRAINT fk_ci_vet FOREIGN KEY (vet_id) REFERENCES vets(id),
  INDEX idx_ci_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id                   VARCHAR(36) PRIMARY KEY,
  request_id           VARCHAR(36) NOT NULL,
  farmer_id            VARCHAR(36) NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,
  mpesa_receipt_number VARCHAR(50) NULL,
  phone                VARCHAR(20) NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending',
  checkout_request_id  VARCHAR(100) NULL UNIQUE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at         DATETIME NULL,
  CONSTRAINT fk_pay_request FOREIGN KEY (request_id) REFERENCES service_requests(id),
  CONSTRAINT fk_pay_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id),
  INDEX idx_pay_request (request_id),
  INDEX idx_pay_farmer (farmer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  user_role  VARCHAR(10) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, user_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS otp_codes (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  user_role  VARCHAR(10) NOT NULL,
  code_hash  VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_user (user_id, user_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  user_role  VARCHAR(10) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rt_user (user_id, user_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
