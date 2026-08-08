-- Migration 002 — Add vet_id to payments table
-- Allows direct lookup of payments per vet without joining service_requests.

ALTER TABLE payments
  ADD COLUMN vet_id VARCHAR(36) NULL AFTER farmer_id;

ALTER TABLE payments
  ADD CONSTRAINT fk_pay_vet FOREIGN KEY (vet_id) REFERENCES vets(id);

ALTER TABLE payments
  ADD INDEX idx_pay_vet (vet_id);
