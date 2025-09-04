-- CreateTable
CREATE TABLE "public"."Session" (
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

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rule" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "country" TEXT,
    "deliveryTime" TEXT,
    "shippingMethod" TEXT,
    "message" TEXT,
    "eventName" TEXT,
    "zipCodes" TEXT,
    "zipCodeType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pickupAvailable" BOOLEAN NOT NULL DEFAULT false,
    "localDelivery" TEXT,
    "messageTranslations" JSONB,
    "deliveryTimeTranslations" JSONB,
    "localDeliveryTranslations" JSONB,
    "language" TEXT DEFAULT 'en',

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductRule" (
    "productId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductRule_pkey" PRIMARY KEY ("ruleId","productId")
);

-- CreateTable
CREATE TABLE "public"."CollectionRule" (
    "collectionId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CollectionRule_pkey" PRIMARY KEY ("ruleId","collectionId")
);

-- CreateTable
CREATE TABLE "public"."VendorRule" (
    "vendorName" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VendorRule_pkey" PRIMARY KEY ("ruleId","vendorName")
);

-- CreateTable
CREATE TABLE "public"."TagRule" (
    "tagName" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TagRule_pkey" PRIMARY KEY ("ruleId","tagName")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "productId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "public"."Collection" (
    "collectionId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("collectionId")
);

-- CreateTable
CREATE TABLE "public"."Vendor" (
    "name" TEXT NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "name" TEXT NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "public"."NotificationSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT,
    "collectionId" TEXT,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationSignup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ProductRule" ADD CONSTRAINT "ProductRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductRule" ADD CONSTRAINT "ProductRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionRule" ADD CONSTRAINT "CollectionRule_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "public"."Collection"("collectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollectionRule" ADD CONSTRAINT "CollectionRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorRule" ADD CONSTRAINT "VendorRule_vendorName_fkey" FOREIGN KEY ("vendorName") REFERENCES "public"."Vendor"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VendorRule" ADD CONSTRAINT "VendorRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TagRule" ADD CONSTRAINT "TagRule_tagName_fkey" FOREIGN KEY ("tagName") REFERENCES "public"."Tag"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TagRule" ADD CONSTRAINT "TagRule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
