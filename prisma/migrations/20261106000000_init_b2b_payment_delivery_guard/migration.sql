-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRule" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "minSubtotal" DOUBLE PRECISION,
    "maxSubtotal" DOUBLE PRECISION,
    "customerTags" TEXT,
    "customerTagsMatch" TEXT NOT NULL DEFAULT 'ANY',
    "countryCodes" TEXT,
    "currencies" TEXT,
    "productTags" TEXT,
    "productIds" TEXT,
    "paymentMethodName" TEXT NOT NULL,
    "actionType" TEXT NOT NULL DEFAULT 'HIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRule" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "minTotalAmount" DOUBLE PRECISION,
    "maxTotalAmount" DOUBLE PRECISION,
    "minTotalWeight" DOUBLE PRECISION,
    "maxTotalWeight" DOUBLE PRECISION,
    "postalCodes" TEXT,
    "postalCodeType" TEXT NOT NULL DEFAULT 'PREFIX',
    "countryCodes" TEXT,
    "provinceCodes" TEXT,
    "productTags" TEXT,
    "deliveryOptionName" TEXT NOT NULL,
    "actionType" TEXT NOT NULL DEFAULT 'HIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomizationSetting" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "paymentCustomizationId" TEXT,
    "deliveryCustomizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRule_shop_idx" ON "PaymentRule"("shop");

-- CreateIndex
CREATE INDEX "DeliveryRule_shop_idx" ON "DeliveryRule"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "CustomizationSetting_shop_key" ON "CustomizationSetting"("shop");
