-- ============================================
-- Real-Time Queue Management System
-- MySQL Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS queue_management;
USE queue_management;

-- ─────────────────────────────────────────────
-- customers
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- operators
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operators (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  role       VARCHAR(50)  NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- services
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  estimated_time INT          NOT NULL DEFAULT 5  -- minutes per ticket
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- queues
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queues (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  status         ENUM('active','paused') NOT NULL DEFAULT 'active',
  current_number INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- queue_tickets
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queue_tickets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_number INT UNSIGNED NOT NULL,
  status        ENUM('waiting','in_progress','completed','cancelled') NOT NULL DEFAULT 'waiting',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  start_time    TIMESTAMP    NULL,
  end_time      TIMESTAMP    NULL,
  customer_id   INT UNSIGNED NOT NULL,
  service_id    INT UNSIGNED NOT NULL,
  queue_id      INT UNSIGNED NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE CASCADE,
  FOREIGN KEY (queue_id)    REFERENCES queues(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  message     TEXT         NOT NULL,
  is_read     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- Seed Data
-- ─────────────────────────────────────────────
INSERT INTO services (name, estimated_time) VALUES
  ('General Inquiry', 5),
  ('Account Services', 10),
  ('Technical Support', 15),
  ('Document Processing', 8);

INSERT INTO queues (name, status, current_number) VALUES
  ('Main Queue', 'active', 0);

INSERT INTO operators (name, role) VALUES
  ('Alice Martin', 'operator'),
  ('Bob Chen', 'operator');

INSERT INTO customers (name, phone) VALUES
  ('Youssef Benali', '+213555001001'),
  ('Sara Meziane',  '+213555001002'),
  ('Karim Hadj',    '+213555001003');
