-- CreateTable
CREATE TABLE `chat_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `sender_type` VARCHAR(50) NOT NULL,
    `sender_name` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `chat_messages_session_id_fkey`(`session_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_token` VARCHAR(100) NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_email` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'waiting',
    `assigned_to_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `chat_sessions_assigned_to_id_fkey`(`assigned_to_id` ASC),
    UNIQUE INDEX `chat_sessions_session_token_key`(`session_token` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tracking_id` VARCHAR(100) NOT NULL,
    `customer_name` VARCHAR(255) NOT NULL,
    `customer_email` VARCHAR(255) NOT NULL,
    `whatsapp_number` VARCHAR(100) NOT NULL,
    `screenshot_url` VARCHAR(512) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    `subscription_name` VARCHAR(255) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `duration_months` INTEGER NOT NULL DEFAULT 1,
    `expires_at` DATETIME(3) NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `orders_tracking_id_key`(`tracking_id` ASC),
    INDEX `orders_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_method_countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_method_id` INTEGER NOT NULL,
    `country_code` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `method_country`(`payment_method_id` ASC, `country_code` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `instructions` TEXT NOT NULL,
    `fields` TEXT NOT NULL,
    `is_global` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_country_overrides` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscription_id` INTEGER NOT NULL,
    `country_code` VARCHAR(10) NOT NULL,
    `price` DECIMAL(10, 2) NULL,
    `currency` VARCHAR(10) NOT NULL,
    `description` TEXT NOT NULL,
    `is_visible` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `private_price` DECIMAL(10, 2) NULL,
    `shared_price` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `sub_country`(`subscription_id` ASC, `country_code` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `logo_url` VARCHAR(255) NULL,
    `cover_url` VARCHAR(255) NULL,
    `is_global` BOOLEAN NOT NULL DEFAULT true,
    `default_price` DECIMAL(10, 2) NULL,
    `default_currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `default_description` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `default_private_price` DECIMAL(10, 2) NULL,
    `default_shared_price` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'staff',
    `can_view_subscriptions` BOOLEAN NOT NULL DEFAULT true,
    `can_view_analytics` BOOLEAN NOT NULL DEFAULT false,
    `can_view_settings` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_seen_at` TIMESTAMP(0) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verification_code` VARCHAR(10) NULL,
    `verification_code_expires` DATETIME(3) NULL,
    `can_view_chat` BOOLEAN NOT NULL DEFAULT true,
    `can_view_orders` BOOLEAN NOT NULL DEFAULT true,
    `can_view_payments` BOOLEAN NOT NULL DEFAULT false,
    `can_view_overview` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `users_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_method_countries` ADD CONSTRAINT `payment_method_countries_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_country_overrides` ADD CONSTRAINT `subscription_country_overrides_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
