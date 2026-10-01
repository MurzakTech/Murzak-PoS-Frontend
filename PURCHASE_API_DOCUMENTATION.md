# Purchase Order & GRN API Documentation

Complete API documentation for Purchase Order and Goods Receipt Note (GRN) operations in TechSavanna POS.

---

## Table of Contents

1. [Base URL & Authentication](#base-url--authentication)
2. [API Endpoints Overview](#api-endpoints-overview)
3. [Common Response Format](#common-response-format)
4. [Error Codes](#error-codes)
5. [API Endpoints](#api-endpoints)
   - [Create Purchase Order](#1-create-purchase-order)
   - [Submit Purchase Order](#2-submit-purchase-order)
   - [Get Purchase Order](#3-get-purchase-order)
   - [List Purchase Orders](#4-list-purchase-orders)
   - [Create GRN](#5-create-grn)
   - [Create GRN Full](#6-create-grn-full)
   - [Apply GRN to Inventory](#7-apply-grn-to-inventory)
6. [React.js Integration Examples](#reactjs-integration-examples)
7. [Complete Flow Example](#complete-flow-example)

---

## Base URL & Authentication

### Base URL
```
https://your-domain.com/api/method/techsavanna_pos.api.purchase
```

### Authentication
All endpoints (except `create_purchase_order` which allows guest access) require authentication using one of the following methods:

#### Method 1: Session Cookie (Recommended for Web Apps)
Include cookies from Frappe login session.

#### Method 2: API Key & Secret (Basic Auth)
```javascript
const credentials = btoa(`${apiKey}:${apiSecret}`);
headers: {
  'Authorization': `Basic ${credentials}`,
  'Content-Type': 'application/json'
}
```

#### Method 3: OAuth Bearer Token
```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

#### Headers
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Frappe-CSRF-Token': csrfToken, // Required for POST/PUT/DELETE
}
```

---

## API Endpoints Overview

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `create_purchase_order` | POST | Guest Allowed | Create Purchase Order (Draft) |
| `submit_purchase_order` | POST | Yes | Submit Purchase Order |
| `get_purchase_order` | GET | Yes | Get Purchase Order details |
| `list_purchase_orders` | GET | Yes | List Purchase Orders |
| `create_grn` | POST | Yes | Create & Submit GRN |
| `create_grn_full` | POST | Yes | Create & Submit GRN (Full) |
| `grn_to_inventory` | POST | Yes | Apply GRN to inventory |

---

## Common Response Format

### Success Response
```json
{
  "status": "success",
  "code": "PO_CREATED",
  "message": "Purchase order created successfully",
  "lpo_no": "PUR-ORD-2024-00001",
  "grn_no": "PUR-REC-2024-00001",  // Only for GRN endpoints
  "data": {
    "docstatus": 1,
    "grand_total": 15000.00,
    "company": "Your Company",
    "supplier": "Supplier Name",
    "items_count": 3
  }
}
```

### Error Response
```json
{
  "status": "error",
  "code": "INVALID_COMPANY",
  "message": "Invalid or missing company 'Invalid Company'",
  "lpo_no": null,  // Present if relevant
  "grn_no": null,  // Present if relevant
  "data": {
    "company": "Invalid Company"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Missing or invalid request parameters |
| `INVALID_COMPANY` | Company does not exist |
| `INVALID_SUPPLIER` | Supplier does not exist |
| `INVALID_ITEMS` | Items array is empty or invalid |
| `INVALID_ITEM` | Item does not exist or not found in PO |
| `INVALID_QTY` | Quantity is zero or negative |
| `INVALID_WAREHOUSE` | Warehouse missing, invalid, or wrong company |
| `INVALID_MATERIAL_REQUEST` | Material Request invalid or missing |
| `LPO_NOT_FOUND` | Purchase Order not found |
| `PO_NOT_SUBMITTED` | Purchase Order must be submitted before creating GRN |
| `PO_ALREADY_SUBMITTED` | Purchase Order already submitted |
| `LPO_CANCELLED` | Purchase Order is cancelled |
| `QTY_EXCEEDS_ORDERED` | Received quantity exceeds ordered quantity |
| `GRN_NOT_FOUND` | Purchase Receipt (GRN) not found |
| `GRN_NOT_RECEIVED` | GRN not in Received status |
| `GRN_ALREADY_APPLIED` | GRN already applied to stock |
| `PERMISSION_DENIED` | User lacks required permissions |
| `UNKNOWN_ERROR` | Unexpected system error |

---

## API Endpoints

### 1. Create Purchase Order

Creates a new Purchase Order in **Draft** state.

**Endpoint:** `create_purchase_order`  
**Method:** `POST`  
**Authentication:** Guest access allowed

#### Request Body
```json
{
  "company": "Your Company",
  "supplier": "Supplier Name",
  "transaction_date": "2024-01-15",  // Optional, defaults to today
  "idempotency_key": "unique-key-123",  // Optional
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": 10,
      "rate": 1500.00,
      "schedule_date": "2024-01-20",  // Optional, defaults to today
      "warehouse": "Stores - YC",  // Optional, resolved automatically if not provided
      "material_request": "MAT-REQ-00001",  // Optional
      "material_request_item": "material-request-item-name"  // Optional, required if material_request provided
    }
  ]
}
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company` | string | Yes | Company name/ID |
| `supplier` | string | Yes | Supplier name/ID |
| `transaction_date` | string (YYYY-MM-DD) | No | Order date (defaults to today) |
| `idempotency_key` | string | No | Unique key to prevent duplicate creation |
| `items` | array | Yes | Array of items to order |
| `items[].item_code` | string | Yes | Item code/ID |
| `items[].qty` | number | Yes | Quantity (must be > 0) |
| `items[].rate` | number | No | Unit rate/price |
| `items[].schedule_date` | string (YYYY-MM-DD) | No | Expected delivery date |
| `items[].warehouse` | string | Conditional | Warehouse (required for stock items if no default) |
| `items[].material_request` | string | No | Material Request reference |
| `items[].material_request_item` | string | Conditional | Required if material_request is provided |

#### Warehouse Resolution Priority
1. Material Request warehouse (if provided)
2. Explicit `warehouse` parameter
3. Item Default warehouse for company
4. Company's default warehouse (`custom_default_warehouse`)

#### Success Response (200 OK)
```json
{
  "status": "success",
  "code": "PO_CREATED",
  "message": "Purchase order created successfully",
  "lpo_no": "PUR-ORD-2024-00001",
  "data": {
    "docstatus": 0,
    "grand_total": 15000.00,
    "company": "Your Company",
    "supplier": "Supplier Name",
    "items_count": 1
  }
}
```

#### Error Response (200 OK with error status)
```json
{
  "status": "error",
  "code": "INVALID_COMPANY",
  "message": "Invalid or missing company 'Invalid Company'",
  "data": {
    "company": "Invalid Company"
  }
}
```

---

### 2. Submit Purchase Order

Submits an existing Purchase Order (changes from Draft to Submitted state).

**Endpoint:** `submit_purchase_order`  
**Method:** `POST`  
**Authentication:** Required

#### Request Body
```json
{
  "lpo_no": "PUR-ORD-2024-00001"
}
```
OR
```json
{
  "purchase_order": "PUR-ORD-2024-00001"
}
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lpo_no` | string | Yes* | Purchase Order name/ID (use either lpo_no or purchase_order) |
| `purchase_order` | string | Yes* | Purchase Order name/ID (alternative to lpo_no) |

#### Success Response (200 OK)
```json
{
  "status": "success",
  "code": "PO_SUBMITTED",
  "message": "LPO submitted successfully",
  "lpo_no": "PUR-ORD-2024-00001",
  "data": {
    "docstatus": 1,
    "grand_total": 15000.00,
    "company": "Your Company",
    "supplier": "Supplier Name",
    "items_count": 1
  }
}
```

#### Error Responses

**PO Not Found:**
```json
{
  "status": "error",
  "code": "LPO_NOT_FOUND",
  "message": "LPO No. PUR-ORD-2024-00001 was not found",
  "lpo_no": "PUR-ORD-2024-00001"
}
```

**Already Submitted:**
```json
{
  "status": "error",
  "code": "PO_ALREADY_SUBMITTED",
  "message": "LPO already submitted",
  "lpo_no": "PUR-ORD-2024-00001"
}
```

**Cancelled:**
```json
{
  "status": "error",
  "code": "LPO_CANCELLED",
  "message": "This LPO has been cancelled and cannot be submitted",
  "lpo_no": "PUR-ORD-2024-00001"
}
```

---

### 3. Get Purchase Order

Retrieves detailed information for a specific Purchase Order.

**Endpoint:** `get_purchase_order`  
**Method:** `GET`  
**Authentication:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `po_name` | string | Yes | Purchase Order name/ID |

#### Request Example
```
GET /api/method/techsavanna_pos.api.purchase.get_purchase_order?po_name=PUR-ORD-2024-00001
```

#### Success Response (200 OK)
```json
{
  "status": "success",
  "purchase_order": {
    "name": "PUR-ORD-2024-00001",
    "supplier": "Supplier Name",
    "company": "Your Company",
    "transaction_date": "2024-01-15",
    "status": "Submitted",
    "docstatus": 1,
    "grand_total": 15000.00,
    "total_qty": 10,
    "currency": "KES",
    "idempotency_key": "unique-key-123",
    "taxes_and_charges": null,
    "items": [
      {
        "item_code": "ITEM-001",
        "description": "Item Description",
        "qty": 10,
        "uom": "Nos",
        "rate": 1500.00,
        "amount": 15000.00,
        "warehouse": "Stores - YC",
        "material_request": null,
        "material_request_item": null
      }
    ],
    "taxes": [
      {
        "charge_type": "On Net Total",
        "account_head": "VAT - YC",
        "description": "VAT",
        "rate": 16,
        "tax_amount": 2400.00,
        "total": 17400.00
      }
    ]
  }
}
```

---

### 4. List Purchase Orders

Lists Purchase Orders with optional filters and pagination.

**Endpoint:** `list_purchase_orders`  
**Method:** `GET`  
**Authentication:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | string (JSON) | No | Filter conditions (e.g., `{"supplier": "Supplier A", "status": "Draft"}`) |
| `limit_start` | integer | No | Starting index for pagination (default: 0) |
| `limit_page_length` | integer | No | Number of records per page (default: 20) |

#### Request Example
```
GET /api/method/techsavanna_pos.api.purchase.list_purchase_orders?filters={"supplier":"Supplier A"}&limit_start=0&limit_page_length=20
```

#### Success Response (200 OK)
```json
{
  "status": "success",
  "total_count": 50,
  "purchase_orders": [
    {
      "name": "PUR-ORD-2024-00001",
      "supplier": "Supplier A",
      "company": "Your Company",
      "transaction_date": "2024-01-15",
      "status": "Submitted",
      "docstatus": 1,
      "grand_total": 15000.00
    },
    {
      "name": "PUR-ORD-2024-00002",
      "supplier": "Supplier B",
      "company": "Your Company",
      "transaction_date": "2024-01-14",
      "status": "Draft",
      "docstatus": 0,
      "grand_total": 8500.00
    }
  ]
}
```

---

### 5. Create GRN

Creates and submits a Purchase Receipt (GRN) from a submitted Purchase Order.

**Endpoint:** `create_grn`  
**Method:** `POST`  
**Authentication:** Required

#### Request Body
```json
{
  "lpo_no": "PUR-ORD-2024-00001",
  "warehouse": "Stores - YC",
  "items": [
    {
      "item_code": "ITEM-001",
      "qty": 10
    },
    {
      "item_code": "ITEM-002",
      "qty": 5
    }
  ]
}
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lpo_no` | string | Yes | Purchase Order name/ID (must be submitted) |
| `warehouse` | string | Yes | Warehouse name/ID (must belong to PO's company) |
| `items` | array | Yes | Array of items to receive |
| `items[].item_code` | string | Yes | Item code (must exist in Purchase Order) |
| `items[].qty` | number | Yes | Quantity to receive (cannot exceed ordered - received) |

#### Business Rules
- Purchase Order **must** be submitted (`docstatus = 1`)
- Can receive partial quantities (multiple GRNs per PO)
- Received quantity cannot exceed: `ordered_qty - already_received_qty`
- Warehouse must belong to PO's company
- GRN is created and submitted automatically (stock updated immediately)

#### Success Response (200 OK)
```json
{
  "status": "success",
  "code": "GRN_CREATED",
  "message": "Goods received successfully",
  "lpo_no": "PUR-ORD-2024-00001",
  "grn_no": "PUR-REC-2024-00001",
  "data": {
    "docstatus": 1,
    "received_items": 2
  }
}
```

#### Error Responses

**PO Not Submitted:**
```json
{
  "status": "error",
  "code": "PO_NOT_SUBMITTED",
  "message": "Purchase Order must be submitted",
  "lpo_no": "PUR-ORD-2024-00001"
}
```

**Quantity Exceeds Ordered:**
```json
{
  "status": "error",
  "code": "QTY_EXCEEDS_ORDERED",
  "message": "Row #1: Received qty exceeds ordered quantity for item 'ITEM-001'",
  "lpo_no": "PUR-ORD-2024-00001",
  "data": {
    "row": 1,
    "item_code": "ITEM-001",
    "lpo_no": "PUR-ORD-2024-00001"
  }
}
```

**Invalid Warehouse:**
```json
{
  "status": "error",
  "code": "INVALID_WAREHOUSE",
  "message": "Warehouse 'Wrong Warehouse' does not belong to the company 'Your Company'",
  "lpo_no": "PUR-ORD-2024-00001",
  "data": {
    "warehouse": "Wrong Warehouse",
    "po_company": "Your Company"
  }
}
```

---

### 6. Create GRN Full

Creates and submits a Purchase Receipt (GRN) - identical functionality to `create_grn`.

**Endpoint:** `create_grn_full`  
**Method:** `POST`  
**Authentication:** Required

**Note:** This endpoint has identical functionality to `create_grn`. Use `create_grn` for consistency.

Request/Response format is the same as [Create GRN](#5-create-grn).

---

### 7. Apply GRN to Inventory

Applies GRN to inventory (updates stock). **Note:** This is typically redundant as Purchase Receipt submission already updates stock automatically.

**Endpoint:** `grn_to_inventory`  
**Method:** `POST`  
**Authentication:** Required

#### Request Body
```json
{
  "grn_no": "PUR-REC-2024-00001",
  "warehouse": "Stores - YC"
}
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `grn_no` | string | Yes | Purchase Receipt (GRN) name/ID |
| `warehouse` | string | No | Warehouse (may be used for validation) |

#### Success Response (200 OK)
```json
{
  "status": "success",
  "code": "GRN_APPLIED",
  "message": "Goods received and stock updated successfully",
  "grn_no": "PUR-REC-2024-00001",
  "lpo_no": "PUR-ORD-2024-00001",
  "data": {
    "docstatus": 1,
    "received_items": 2
  }
}
```

#### Error Responses

**GRN Not Found:**
```json
{
  "status": "error",
  "code": "GRN_NOT_FOUND",
  "message": "GRN No. PUR-REC-2024-00001 does not exist",
  "grn_no": "PUR-REC-2024-00001"
}
```

**GRN Not Received:**
```json
{
  "status": "error",
  "code": "GRN_NOT_RECEIVED",
  "message": "GRN No. PUR-REC-2024-00001 has not been fully received yet",
  "grn_no": "PUR-REC-2024-00001"
}
```

**Already Applied:**
```json
{
  "status": "error",
  "code": "GRN_ALREADY_APPLIED",
  "message": "GRN No. PUR-REC-2024-00001 has already been applied to stock",
  "grn_no": "PUR-REC-2024-00001"
}
```

---

## React.js Integration Examples

### Setup: API Service Configuration

Create a service file for API calls:

```javascript
// services/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-domain.com/api/method';
const API_NAMESPACE = 'techsavanna_pos.api.purchase';

// Get CSRF token (if using session-based auth)
export const getCSRFToken = async () => {
  const response = await fetch(`${API_BASE_URL}/frappe.auth.get_logged_user`, {
    credentials: 'include'
  });
  const data = await response.json();
  return data.message?.csrf_token || '';
};

// API request helper
export const apiRequest = async (endpoint, method = 'GET', body = null, options = {}) => {
  const url = `${API_BASE_URL}/${API_NAMESPACE}.${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  // Add CSRF token for POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
    const csrfToken = await getCSRFToken();
    headers['X-Frappe-CSRF-Token'] = csrfToken;
  }

  // Add authentication (Bearer token or API key)
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  } else if (options.apiKey && options.apiSecret) {
    const credentials = btoa(`${options.apiKey}:${options.apiSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const config = {
    method,
    headers,
    credentials: 'include', // Include cookies for session-based auth
    ...options
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### Example 1: Create Purchase Order

```javascript
// hooks/usePurchaseOrder.js
import { useState } from 'react';
import { apiRequest } from '../services/api';

export const useCreatePurchaseOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPO = async (poData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('create_purchase_order', 'POST', poData);
      
      return {
        success: true,
        lpoNo: response.lpo_no,
        data: response.data
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  return { createPO, loading, error };
};

// Component usage
import React from 'react';
import { useCreatePurchaseOrder } from './hooks/usePurchaseOrder';

const CreatePurchaseOrderForm = () => {
  const { createPO, loading, error } = useCreatePurchaseOrder();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      company: 'Your Company',
      supplier: 'Supplier Name',
      transaction_date: '2024-01-15',
      items: [
        {
          item_code: 'ITEM-001',
          qty: 10,
          rate: 1500.00,
          warehouse: 'Stores - YC'
        }
      ]
    };

    const result = await createPO(formData);
    
    if (result.success) {
      alert(`Purchase Order created: ${result.lpoNo}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Purchase Order'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

### Example 2: Submit Purchase Order

```javascript
// hooks/useSubmitPurchaseOrder.js
import { useState } from 'react';
import { apiRequest } from '../services/api';

export const useSubmitPurchaseOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitPO = async (lpoNo) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('submit_purchase_order', 'POST', {
        lpo_no: lpoNo
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  return { submitPO, loading, error };
};

// Component usage
const SubmitPOButton = ({ lpoNo, onSuccess }) => {
  const { submitPO, loading, error } = useSubmitPurchaseOrder();

  const handleSubmit = async () => {
    const result = await submitPO(lpoNo);
    
    if (result.success) {
      onSuccess && onSuccess(result.data);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Submitting...' : 'Submit Purchase Order'}
    </button>
  );
};
```

### Example 3: Create GRN

```javascript
// hooks/useCreateGRN.js
import { useState } from 'react';
import { apiRequest } from '../services/api';

export const useCreateGRN = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createGRN = async (grnData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest('create_grn', 'POST', grnData);
      
      return {
        success: true,
        grnNo: response.grn_no,
        lpoNo: response.lpo_no,
        data: response.data
      };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        code: err.code
      };
    } finally {
      setLoading(false);
    }
  };

  return { createGRN, loading, error };
};

// Component usage
const CreateGRNForm = ({ lpoNo, onSuccess }) => {
  const { createGRN, loading, error } = useCreateGRN();
  const [items, setItems] = useState([
    { item_code: '', qty: 0 }
  ]);
  const [warehouse, setWarehouse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const grnData = {
      lpo_no: lpoNo,
      warehouse: warehouse,
      items: items.filter(item => item.item_code && item.qty > 0)
    };

    const result = await createGRN(grnData);
    
    if (result.success) {
      alert(`GRN created: ${result.grnNo}`);
      onSuccess && onSuccess(result);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Warehouse"
        value={warehouse}
        onChange={(e) => setWarehouse(e.target.value)}
        required
      />
      
      {/* Items input fields */}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating GRN...' : 'Create GRN'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

### Example 4: Get Purchase Order Details

```javascript
// hooks/usePurchaseOrder.js
import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export const usePurchaseOrder = (poName) => {
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!poName) return;

    const fetchPO = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest(
          `get_purchase_order?po_name=${poName}`,
          'GET'
        );
        setPO(response.purchase_order);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [poName]);

  return { po, loading, error };
};

// Component usage
const PurchaseOrderDetails = ({ poName }) => {
  const { po, loading, error } = usePurchaseOrder(poName);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!po) return null;

  return (
    <div>
      <h2>{po.name}</h2>
      <p>Supplier: {po.supplier}</p>
      <p>Status: {po.status}</p>
      <p>Grand Total: {po.grand_total}</p>
      
      <h3>Items</h3>
      <ul>
        {po.items.map((item, index) => (
          <li key={index}>
            {item.item_code} - Qty: {item.qty} - Rate: {item.rate}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Example 5: List Purchase Orders

```javascript
// hooks/usePurchaseOrderList.js
import { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export const usePurchaseOrderList = (filters = {}, page = 0, pageSize = 20) => {
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const filtersStr = JSON.stringify(filters);
        const response = await apiRequest(
          `list_purchase_orders?filters=${encodeURIComponent(filtersStr)}&limit_start=${page * pageSize}&limit_page_length=${pageSize}`,
          'GET'
        );
        
        setOrders(response.purchase_orders);
        setTotalCount(response.total_count);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [filters, page, pageSize]);

  return { orders, totalCount, loading, error };
};

// Component usage
const PurchaseOrderList = () => {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const { orders, totalCount, loading, error } = usePurchaseOrderList(filters, page);

  return (
    <div>
      {/* Filter controls */}
      
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>LPO No.</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.name}>
                  <td>{order.name}</td>
                  <td>{order.supplier}</td>
                  <td>{order.transaction_date}</td>
                  <td>{order.status}</td>
                  <td>{order.grand_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button 
              onClick={() => setPage(p => p + 1)} 
              disabled={(page + 1) * 20 >= totalCount}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
```

---

## Complete Flow Example

Complete React component demonstrating the full purchase-to-GRN flow:

```javascript
// components/CompletePurchaseFlow.jsx
import React, { useState } from 'react';
import { useCreatePurchaseOrder } from '../hooks/usePurchaseOrder';
import { useSubmitPurchaseOrder } from '../hooks/useSubmitPurchaseOrder';
import { useCreateGRN } from '../hooks/useCreateGRN';

const CompletePurchaseFlow = () => {
  const [step, setStep] = useState(1); // 1: Create PO, 2: Submit PO, 3: Create GRN
  const [lpoNo, setLpoNo] = useState(null);
  const [grnNo, setGrnNo] = useState(null);
  
  const { createPO, loading: creatingPO } = useCreatePurchaseOrder();
  const { submitPO, loading: submittingPO } = useSubmitPurchaseOrder();
  const { createGRN, loading: creatingGRN } = useCreateGRN();

  // Step 1: Create Purchase Order
  const handleCreatePO = async () => {
    const poData = {
      company: 'Your Company',
      supplier: 'Supplier Name',
      items: [
        { item_code: 'ITEM-001', qty: 10, rate: 1500.00, warehouse: 'Stores - YC' }
      ]
    };

    const result = await createPO(poData);
    if (result.success) {
      setLpoNo(result.lpoNo);
      setStep(2);
    }
  };

  // Step 2: Submit Purchase Order
  const handleSubmitPO = async () => {
    if (!lpoNo) return;
    
    const result = await submitPO(lpoNo);
    if (result.success) {
      setStep(3);
    }
  };

  // Step 3: Create GRN
  const handleCreateGRN = async () => {
    if (!lpoNo) return;

    const grnData = {
      lpo_no: lpoNo,
      warehouse: 'Stores - YC',
      items: [
        { item_code: 'ITEM-001', qty: 10 }
      ]
    };

    const result = await createGRN(grnData);
    if (result.success) {
      setGrnNo(result.grnNo);
      alert(`Complete! GRN: ${result.grnNo}`);
    }
  };

  return (
    <div className="purchase-flow">
      <h1>Purchase Order Flow</h1>
      
      {/* Step 1: Create PO */}
      {step === 1 && (
        <div>
          <h2>Step 1: Create Purchase Order</h2>
          <button onClick={handleCreatePO} disabled={creatingPO}>
            {creatingPO ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      )}

      {/* Step 2: Submit PO */}
      {step === 2 && (
        <div>
          <h2>Step 2: Submit Purchase Order</h2>
          <p>LPO No: {lpoNo}</p>
          <button onClick={handleSubmitPO} disabled={submittingPO}>
            {submittingPO ? 'Submitting...' : 'Submit Purchase Order'}
          </button>
        </div>
      )}

      {/* Step 3: Create GRN */}
      {step === 3 && (
        <div>
          <h2>Step 3: Create GRN</h2>
          <p>LPO No: {lpoNo}</p>
          <button onClick={handleCreateGRN} disabled={creatingGRN}>
            {creatingGRN ? 'Creating GRN...' : 'Create GRN'}
          </button>
          {grnNo && <p>GRN No: {grnNo}</p>}
        </div>
      )}
    </div>
  );
};

export default CompletePurchaseFlow;
```

---

## Error Handling Best Practices

```javascript
// utils/errorHandler.js
export const handleAPIError = (error, response) => {
  const errorCode = response?.code || 'UNKNOWN_ERROR';
  const errorMessage = response?.message || error.message;

  switch (errorCode) {
    case 'INVALID_COMPANY':
    case 'INVALID_SUPPLIER':
    case 'INVALID_ITEM':
      return {
        type: 'validation',
        message: errorMessage,
        field: response?.data?.company || response?.data?.supplier || response?.data?.item_code
      };
    
    case 'PO_NOT_SUBMITTED':
      return {
        type: 'business_rule',
        message: 'Purchase Order must be submitted before creating GRN',
        action: 'submit_po'
      };
    
    case 'QTY_EXCEEDS_ORDERED':
      return {
        type: 'business_rule',
        message: errorMessage,
        row: response?.data?.row
      };
    
    case 'PERMISSION_DENIED':
      return {
        type: 'permission',
        message: 'You do not have permission to perform this action'
      };
    
    default:
      return {
        type: 'unknown',
        message: errorMessage
      };
  }
};

// Usage in component
const result = await createGRN(grnData);
if (!result.success) {
  const error = handleAPIError(null, result);
  
  if (error.type === 'validation') {
    // Show field-level error
    setFieldError(error.field, error.message);
  } else if (error.type === 'business_rule') {
    // Show business rule violation
    showNotification(error.message, 'warning');
  } else {
    // Generic error
    showNotification(error.message, 'error');
  }
}
```

---

## TypeScript Definitions

```typescript
// types/purchase.ts
export interface PurchaseOrderItem {
  item_code: string;
  qty: number;
  rate?: number;
  schedule_date?: string;
  warehouse?: string;
  material_request?: string;
  material_request_item?: string;
}

export interface CreatePORequest {
  company: string;
  supplier: string;
  transaction_date?: string;
  idempotency_key?: string;
  items: PurchaseOrderItem[];
}

export interface CreatePOResponse {
  status: 'success' | 'error';
  code: string;
  message: string;
  lpo_no?: string;
  data?: {
    docstatus: number;
    grand_total: number;
    company: string;
    supplier: string;
    items_count: number;
  };
}

export interface CreateGRNRequest {
  lpo_no: string;
  warehouse: string;
  items: Array<{
    item_code: string;
    qty: number;
  }>;
}

export interface CreateGRNResponse {
  status: 'success' | 'error';
  code: string;
  message: string;
  lpo_no?: string;
  grn_no?: string;
  data?: {
    docstatus: number;
    received_items: number;
  };
}
```

---

## Testing Examples

```javascript
// __tests__/purchaseAPI.test.js
import { apiRequest } from '../services/api';

describe('Purchase API', () => {
  test('creates purchase order', async () => {
    const poData = {
      company: 'Test Company',
      supplier: 'Test Supplier',
      items: [
        { item_code: 'ITEM-001', qty: 10, rate: 100 }
      ]
    };

    const response = await apiRequest('create_purchase_order', 'POST', poData);
    
    expect(response.status).toBe('success');
    expect(response.lpo_no).toBeDefined();
  });

  test('handles validation errors', async () => {
    const poData = {
      company: 'Invalid Company',
      supplier: 'Test Supplier',
      items: []
    };

    await expect(
      apiRequest('create_purchase_order', 'POST', poData)
    ).rejects.toThrow();
  });
});
```

---

## Notes & Best Practices

1. **Idempotency:** Use `idempotency_key` when creating Purchase Orders to prevent duplicates
2. **Partial Receipts:** You can create multiple GRNs for a single PO (partial receipts)
3. **Stock Updates:** GRN submission automatically updates stock - `grn_to_inventory` is typically redundant
4. **Error Handling:** Always check `status === 'error'` in responses
5. **Pagination:** Use `limit_start` and `limit_page_length` for large datasets
6. **Warehouse Validation:** Ensure warehouse belongs to the same company as PO
7. **State Management:** PO must be submitted before creating GRN
8. **CSRF Tokens:** Required for all POST/PUT/DELETE requests

---

## Support & Contact

For API support, please contact the TechSavanna POS development team.

