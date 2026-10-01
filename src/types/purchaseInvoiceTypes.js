/**
 * Purchase Invoice Type Definitions
 * 
 * This file contains JSDoc type definitions for Purchase Invoice API data structures.
 * Based on PURCHASE_INVOICE_API_DOCUMENTATION.md
 * 
 * @module purchaseInvoiceTypes
 */

/**
 * @typedef {Object} PurchaseInvoiceListItem
 * @property {string} name - Purchase Invoice number/name (e.g., "ACC-PINV-2026-00001")
 * @property {string} supplier - Supplier ID
 * @property {string} supplier_name - Supplier display name
 * @property {string} company - Company name
 * @property {string} posting_date - Posting date (YYYY-MM-DD)
 * @property {string|null} due_date - Due date (YYYY-MM-DD) or null
 * @property {string|null} bill_no - Supplier invoice number or null
 * @property {string|null} bill_date - Supplier invoice date (YYYY-MM-DD) or null
 * @property {number} grand_total - Grand total amount
 * @property {number} outstanding_amount - Outstanding amount
 * @property {string} status - Invoice status (e.g., "Draft", "Unpaid", "Paid", "Partly Paid", "Overdue", "Cancelled")
 * @property {number} docstatus - Document status (0 = Draft, 1 = Submitted, 2 = Cancelled)
 * @property {string} currency - Currency code (e.g., "KES")
 */

/**
 * @typedef {Object} PurchaseInvoiceItem
 * @property {string} item_code - Item code/ID
 * @property {string} item_name - Item name
 * @property {string|null} description - Item description or null
 * @property {number} qty - Quantity
 * @property {number} rate - Unit rate/price
 * @property {number} amount - Total amount (qty * rate)
 * @property {string|null} warehouse - Warehouse name or null
 * @property {string|null} uom - Unit of measure or null
 * @property {number|null} stock_qty - Stock quantity or null
 * @property {string} [purchase_receipt] - Linked Purchase Receipt (GRN) number (optional)
 * @property {string} [purchase_receipt_item] - Purchase Receipt item reference (optional)
 * @property {string} [purchase_order] - Linked Purchase Order number (optional)
 * @property {string} [purchase_order_item] - Purchase Order item reference (optional)
 */

/**
 * @typedef {Object} PurchaseInvoiceTax
 * @property {string} charge_type - Charge type (e.g., "On Net Total")
 * @property {string} account_head - Tax account head
 * @property {string|null} description - Tax description or null
 * @property {number|null} rate - Tax rate percentage or null
 * @property {number} tax_amount - Tax amount
 * @property {number} total - Total after tax
 */

/**
 * @typedef {Object} FileAttachment
 * @property {string} name - File ID/name
 * @property {string} file_name - File display name
 * @property {string} file_url - File URL path
 * @property {number} is_private - Privacy flag (0 = public, 1 = private)
 * @property {number|null} file_size - File size in bytes or null
 */

/**
 * @typedef {Object} PurchaseInvoiceDetail
 * @property {string} invoice_no - Purchase Invoice number
 * @property {string} supplier - Supplier ID
 * @property {string} supplier_name - Supplier display name
 * @property {string} company - Company name
 * @property {string|null} posting_date - Posting date (YYYY-MM-DD) or null
 * @property {string|null} posting_time - Posting time (HH:MM:SS) or null
 * @property {string|null} due_date - Due date (YYYY-MM-DD) or null
 * @property {string|null} bill_no - Supplier invoice number or null
 * @property {string|null} bill_date - Supplier invoice date (YYYY-MM-DD) or null
 * @property {string} status - Invoice status
 * @property {number} docstatus - Document status (0 = Draft, 1 = Submitted, 2 = Cancelled)
 * @property {number} is_return - Return flag (0 = no, 1 = yes)
 * @property {number} is_paid - Paid flag (0 = no, 1 = yes)
 * @property {string} currency - Currency code
 * @property {number} conversion_rate - Currency conversion rate
 * @property {number} grand_total - Grand total amount
 * @property {number} net_total - Net total (before taxes)
 * @property {number} total_taxes_and_charges - Total taxes and charges
 * @property {number} outstanding_amount - Outstanding amount
 * @property {number} paid_amount - Paid amount
 * @property {number} write_off_amount - Write-off amount
 * @property {PurchaseInvoiceItem[]} items - Array of invoice items
 * @property {PurchaseInvoiceTax[]} taxes - Array of tax charges
 * @property {string[]} purchase_orders - Array of linked Purchase Order numbers
 * @property {string[]} purchase_receipts - Array of linked Purchase Receipt (GRN) numbers
 * @property {FileAttachment[]} attachments - Array of file attachments
 */

/**
 * @typedef {Object} PurchaseInvoiceFilters
 * @property {number} [page] - Page number for pagination (default: 1)
 * @property {number} [page_size] - Number of records per page (default: 20, max: 100)
 * @property {string} [supplier] - Filter by supplier name
 * @property {string} [company] - Filter by company name
 * @property {string} [purchase_order] - Filter by Purchase Order number
 * @property {string} [purchase_receipt] - Filter by Purchase Receipt (GRN) number
 * @property {string} [from_date] - Filter from date (YYYY-MM-DD)
 * @property {string} [to_date] - Filter to date (YYYY-MM-DD)
 * @property {number|string} [docstatus] - Document status filter (0 = Draft, 1 = Submitted, 2 = Cancelled, "all" = All)
 * @property {string} [status] - Invoice status filter (e.g., "Draft", "Unpaid", "Paid", "Overdue")
 * @property {string} [bill_no] - Filter by supplier invoice number (partial match)
 */

/**
 * @typedef {Object} PurchaseInvoicePaginationMeta
 * @property {number} page - Current page number
 * @property {number} page_size - Number of records per page
 * @property {number} total - Total number of records
 * @property {number} total_pages - Total number of pages
 */

/**
 * @typedef {Object} PurchaseInvoiceListResponse
 * @property {"success"|"error"} status - Response status
 * @property {string} message - Response message
 * @property {PurchaseInvoiceListItem[]} data - Array of purchase invoice list items
 * @property {PurchaseInvoicePaginationMeta} meta - Pagination metadata
 */

/**
 * @typedef {Object} PurchaseInvoiceDetailResponse
 * @property {"success"|"error"} status - Response status
 * @property {string} message - Response message
 * @property {PurchaseInvoiceDetail} data - Purchase invoice detail data
 * @property {string} [code] - Error code (if status is "error")
 */

// Export type definitions as constants for reference (optional, for IDE autocomplete)
// These can be used in JSDoc comments throughout the codebase

/**
 * Common Purchase Invoice Status Values
 * @constant
 * @type {Object<string, string>}
 */
export const PURCHASE_INVOICE_STATUS = {
  DRAFT: 'Draft',
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PARTLY_PAID: 'Partly Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

/**
 * Document Status Values
 * @constant
 * @type {Object<string, number>}
 */
export const DOCUMENT_STATUS = {
  DRAFT: 0,
  SUBMITTED: 1,
  CANCELLED: 2,
  ALL: 'all',
};

/**
 * Error Codes
 * @constant
 * @type {Object<string, string>}
 */
export const PURCHASE_INVOICE_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  LPO_NOT_FOUND: 'LPO_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Default export for convenience
export default {
  PURCHASE_INVOICE_STATUS,
  DOCUMENT_STATUS,
  PURCHASE_INVOICE_ERROR_CODES,
};

