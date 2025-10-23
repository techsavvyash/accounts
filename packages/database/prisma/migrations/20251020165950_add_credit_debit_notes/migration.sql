-- CreateEnum
CREATE TYPE "DebitNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED', 'VOID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditNoteStatus" ADD VALUE 'ISSUED';
ALTER TYPE "CreditNoteStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "credit_notes" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "original_invoice_id" TEXT,
ADD COLUMN     "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "credit_note_line_items" (
    "id" TEXT NOT NULL,
    "credit_note_id" TEXT NOT NULL,
    "inventory_item_id" TEXT,
    "description" TEXT NOT NULL,
    "hsn_code" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate_id" TEXT,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "credit_note_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "debit_note_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "original_invoice_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" "DebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "linked_journal_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_note_line_items" (
    "id" TEXT NOT NULL,
    "debit_note_id" TEXT NOT NULL,
    "inventory_item_id" TEXT,
    "description" TEXT NOT NULL,
    "hsn_code" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate_id" TEXT,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "debit_note_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_note_line_items_credit_note_id_idx" ON "credit_note_line_items"("credit_note_id");

-- CreateIndex
CREATE INDEX "debit_notes_tenant_id_idx" ON "debit_notes"("tenant_id");

-- CreateIndex
CREATE INDEX "debit_notes_customer_id_idx" ON "debit_notes"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "debit_notes_tenant_id_debit_note_number_key" ON "debit_notes"("tenant_id", "debit_note_number");

-- CreateIndex
CREATE INDEX "debit_note_line_items_debit_note_id_idx" ON "debit_note_line_items"("debit_note_id");

-- CreateIndex
CREATE INDEX "credit_notes_customer_id_idx" ON "credit_notes"("customer_id");

-- AddForeignKey
ALTER TABLE "credit_note_line_items" ADD CONSTRAINT "credit_note_line_items_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_line_items" ADD CONSTRAINT "credit_note_line_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_line_items" ADD CONSTRAINT "credit_note_line_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_notes" ADD CONSTRAINT "debit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_line_items" ADD CONSTRAINT "debit_note_line_items_debit_note_id_fkey" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_line_items" ADD CONSTRAINT "debit_note_line_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_line_items" ADD CONSTRAINT "debit_note_line_items_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
