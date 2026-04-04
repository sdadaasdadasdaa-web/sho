CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` varchar(128) NOT NULL,
	`externalRef` varchar(128) NOT NULL,
	`customerName` text,
	`customerEmail` varchar(320),
	`customerPhone` varchar(32),
	`customerCpf` varchar(14),
	`productsJson` text NOT NULL,
	`totalInCents` int NOT NULL,
	`trackingParamsJson` text,
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_transactionId_unique` UNIQUE(`transactionId`)
);
