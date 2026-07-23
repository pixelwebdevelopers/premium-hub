-- AlterTable
ALTER TABLE `chat_sessions` ADD COLUMN `tracking_id` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `subscription_country_overrides` ADD COLUMN `full_account_description` TEXT NULL,
    ADD COLUMN `full_account_price` DECIMAL(10, 2) NULL,
    ADD COLUMN `private_description` TEXT NULL,
    ADD COLUMN `shared_description` TEXT NULL;

-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `default_full_account_description` TEXT NULL,
    ADD COLUMN `default_full_account_price` DECIMAL(10, 2) NULL,
    ADD COLUMN `default_private_description` TEXT NULL,
    ADD COLUMN `default_shared_description` TEXT NULL;

-- CreateTable
CREATE TABLE `quick_replies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shortcut` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `quick_replies_shortcut_key`(`shortcut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
