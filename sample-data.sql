-- Insert sample customers
INSERT INTO "Customer" (id, name, email, phone, "gstin", address, "tenantId", "createdAt", "updatedAt") VALUES
('customer-1', 'ABC Corporation', 'contact@abc.com', '+91-9876543210', '29ABCDE1234F1Z5', '123 Business Street, Mumbai', 'demo-tenant-id', NOW(), NOW()),
('customer-2', 'XYZ Ltd', 'info@xyz.com', '+91-9876543211', '29XYZDE1234F1Z6', '456 Corporate Ave, Delhi', 'demo-tenant-id', NOW(), NOW()),
('customer-3', 'Demo Industries', 'hello@demo.com', '+91-9876543212', '29DEMDE1234F1Z7', '789 Industrial Park, Bangalore', 'demo-tenant-id', NOW(), NOW());

-- Insert sample inventory items
INSERT INTO "InventoryItem" (id, name, description, "unitPrice", "currentStock", "tenantId", "createdAt", "updatedAt") VALUES
('item-1', 'Product A', 'High quality product A', 1000.00, 100, 'demo-tenant-id', NOW(), NOW()),
('item-2', 'Product B', 'Premium product B', 2000.00, 50, 'demo-tenant-id', NOW(), NOW()),
('item-3', 'Service C', 'Professional service C', 5000.00, 999, 'demo-tenant-id', NOW(), NOW());

-- Insert sample invoices
INSERT INTO "Invoice" (id, "invoiceNumber", "customerId", "issueDate", "dueDate", status, "subtotal", "taxAmount", "totalAmount", "tenantId", "createdAt", "updatedAt") VALUES
('invoice-1', 'INV-001', 'customer-1', '2025-09-19', '2025-10-19', 'SENT', 10000.00, 1800.00, 11800.00, 'demo-tenant-id', NOW(), NOW()),
('invoice-2', 'INV-002', 'customer-2', '2025-09-18', '2025-10-18', 'DRAFT', 5000.00, 900.00, 5900.00, 'demo-tenant-id', NOW(), NOW()),
('invoice-3', 'INV-003', 'customer-3', '2025-09-17', '2025-10-17', 'PAID', 15000.00, 2700.00, 17700.00, 'demo-tenant-id', NOW(), NOW());

-- Insert sample invoice line items
INSERT INTO "InvoiceLineItem" (id, "invoiceId", "productId", "description", quantity, "unitPrice", "lineTotal", "createdAt", "updatedAt") VALUES
-- Invoice 1 line items
('line-1', 'invoice-1', 'item-1', 'Product A - Batch 1', 10, 1000.00, 10000.00, NOW(), NOW()),
-- Invoice 2 line items
('line-2', 'invoice-2', 'item-2', 'Product B - Special order', 2.5, 2000.00, 5000.00, NOW(), NOW()),
-- Invoice 3 line items
('line-3', 'invoice-3', 'item-3', 'Service C - Consulting', 3, 5000.00, 15000.00, NOW(), NOW());