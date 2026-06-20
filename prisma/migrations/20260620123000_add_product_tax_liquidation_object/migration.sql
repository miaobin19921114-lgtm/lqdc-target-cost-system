-- Add tax liquidation object classification for product types.
ALTER TABLE "ProductType" ADD COLUMN "taxLiquidationObject" TEXT;
