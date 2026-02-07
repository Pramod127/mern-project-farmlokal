CREATE DATABASE IF NOT EXISTS farmlokal;
USE farmlokal;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  price_cents INT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  stock INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category_price (category_id, price_cents, id),
  KEY idx_products_created (created_at, id),
  KEY idx_products_active (is_active, id),
  FULLTEXT KEY ftx_products_name_desc (name, description),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(64) NOT NULL,
  event_id VARCHAR(128) NOT NULL,
  payload_json JSON NOT NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_provider_event (provider, event_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbound_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_key VARCHAR(128) NOT NULL,
  target VARCHAR(120) NOT NULL,
  status_code INT NULL,
  response_time_ms INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_outbound_target_created (target, created_at),
  UNIQUE KEY uq_outbound_request_key (request_key)
) ENGINE=InnoDB;
