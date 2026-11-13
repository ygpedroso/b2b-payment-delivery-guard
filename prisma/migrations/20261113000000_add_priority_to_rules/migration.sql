-- AlterTable
ALTER TABLE "PaymentRule" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "DeliveryRule" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 3;
