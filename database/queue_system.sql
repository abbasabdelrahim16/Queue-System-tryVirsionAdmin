-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 08, 2026 at 02:31 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `queue_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
CREATE TABLE IF NOT EXISTS `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `created_at`) VALUES
(1, 'Ali', '0550000001', '2026-05-01 17:06:24'),
(2, 'Sara', '0550000002', '2026-05-01 17:06:24'),
(3, 'Ali', '0550000000', '2026-05-03 20:58:47'),
(4, 'Ali', '0550000000', '2026-05-03 21:02:50');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notification_customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `customer_id`, `message`, `is_read`, `created_at`) VALUES
(1, 1, 'Your turn is coming', 0, '2026-05-01 17:08:54'),
(2, 1, 'Your booking is confirmed! Ticket #2 – estimated wait: 0 min.', 0, '2026-05-02 09:32:48'),
(3, 1, 'Your ticket #2 has been cancelled.', 0, '2026-05-02 09:38:59'),
(4, 1, 'Your booking is confirmed! Ticket #3 – estimated wait: 0 min.', 0, '2026-05-02 12:32:17'),
(5, 1, 'Your booking is confirmed! Ticket #4 – estimated wait: 10 min.', 0, '2026-05-02 12:35:22'),
(6, 1, 'It\'s your turn! Please proceed to the counter. Ticket #3.', 0, '2026-05-02 12:48:31'),
(7, 1, 'Your booking is confirmed! Ticket #5 – estimated wait: 10 min.', 0, '2026-05-02 12:52:13'),
(8, 1, 'Service completed for ticket #3. Thank you!', 0, '2026-05-02 12:54:12'),
(9, 1, 'It\'s your turn! Please proceed to the counter. Ticket #4.', 0, '2026-05-02 12:54:37'),
(10, 1, 'Your booking is confirmed! Ticket #6 – estimated wait: 10 min.', 0, '2026-05-02 13:02:36'),
(11, 1, 'Your booking is confirmed! Ticket #7 – estimated wait: 20 min.', 0, '2026-05-02 13:02:57'),
(12, 1, 'Your booking is confirmed! Ticket #8 – estimated wait: 30 min.', 0, '2026-05-02 13:02:59'),
(13, 1, 'Your booking is confirmed! Ticket #9 – estimated wait: 40 min.', 0, '2026-05-02 13:03:03'),
(14, 1, 'It\'s your turn! Ticket #5', 0, '2026-05-02 13:07:56'),
(15, 1, 'Your booking is confirmed! Ticket #10 – estimated wait: 40 min.', 0, '2026-05-03 21:03:34'),
(16, 1, 'It\'s your turn! Ticket #6', 0, '2026-05-03 21:06:40');

-- --------------------------------------------------------

--
-- Table structure for table `operators`
--

DROP TABLE IF EXISTS `operators`;
CREATE TABLE IF NOT EXISTS `operators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `operators`
--

INSERT INTO `operators` (`id`, `name`, `role`, `created_at`) VALUES
(1, 'Operator 1', 'desk', '2026-05-01 17:06:38'),
(2, 'Operator 2', 'desk', '2026-05-01 17:06:38');

-- --------------------------------------------------------

--
-- Table structure for table `operator_queue`
--

DROP TABLE IF EXISTS `operator_queue`;
CREATE TABLE IF NOT EXISTS `operator_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `operator_id` int DEFAULT NULL,
  `queue_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `operator_id` (`operator_id`),
  KEY `queue_id` (`queue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `queues`
--

DROP TABLE IF EXISTS `queues`;
CREATE TABLE IF NOT EXISTS `queues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `status` enum('active','paused') DEFAULT 'active',
  `current_number` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `queues`
--

INSERT INTO `queues` (`id`, `name`, `status`, `current_number`) VALUES
(1, 'Main Queue', 'active', 4);

-- --------------------------------------------------------

--
-- Table structure for table `queue_tickets`
--

DROP TABLE IF EXISTS `queue_tickets`;
CREATE TABLE IF NOT EXISTS `queue_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_number` int DEFAULT NULL,
  `status` enum('waiting','in_progress','completed','cancelled') DEFAULT 'waiting',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `service_id` int DEFAULT NULL,
  `queue_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `fk_customer` (`customer_id`),
  KEY `fk_service` (`service_id`),
  KEY `fk_queue` (`queue_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `queue_tickets`
--

INSERT INTO `queue_tickets` (`id`, `ticket_number`, `status`, `created_at`, `start_time`, `end_time`, `customer_id`, `service_id`, `queue_id`) VALUES
(1, 1, 'completed', '2026-05-01 17:07:27', '2026-05-03 21:07:04', '2026-05-03 21:08:06', 1, 1, 1),
(3, 2, 'cancelled', '2026-05-02 09:32:48', NULL, NULL, 1, 1, 1),
(4, 3, 'completed', '2026-05-02 12:32:17', '2026-05-02 12:48:31', '2026-05-02 12:54:12', 1, 1, 1),
(5, 4, 'completed', '2026-05-02 12:35:22', '2026-05-02 12:54:38', '2026-05-02 13:07:56', 1, 1, 1),
(6, 5, 'completed', '2026-05-02 12:52:13', '2026-05-02 13:07:56', '2026-05-03 21:06:41', 1, 1, 1),
(7, 6, 'in_progress', '2026-05-02 13:02:36', '2026-05-03 21:06:41', NULL, 1, 1, 1),
(8, 7, 'waiting', '2026-05-02 13:02:57', NULL, NULL, 1, 1, 1),
(9, 8, 'waiting', '2026-05-02 13:02:59', NULL, NULL, 1, 1, 1),
(10, 9, 'waiting', '2026-05-02 13:03:03', NULL, NULL, 1, 1, 1),
(11, 10, 'waiting', '2026-05-03 21:03:34', NULL, NULL, 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
CREATE TABLE IF NOT EXISTS `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `estimated_time` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `name`, `estimated_time`) VALUES
(1, 'Consultation', 10),
(2, 'Payment', 5);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notification_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `operator_queue`
--
ALTER TABLE `operator_queue`
  ADD CONSTRAINT `operator_queue_ibfk_1` FOREIGN KEY (`operator_id`) REFERENCES `operators` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `operator_queue_ibfk_2` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `queue_tickets`
--
ALTER TABLE `queue_tickets`
  ADD CONSTRAINT `fk_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_queue` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
