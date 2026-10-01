# Loyalty Program API Documentation

This document provides comprehensive API documentation for the Loyalty Program endpoints, designed for consumption in React.js applications.

## Base URL

All API endpoints are accessed through the Frappe framework. The base URL format is:

```
/api/method/techsavanna_pos.api.loyalty.<function_name>
```

**Example:** 
```
/api/method/techsavanna_pos.api.loyalty.get_loyalty_balance
```

---

## Authentication

Most endpoints use `allow_guest=True`, meaning they can be accessed without authentication. However, `earn_loyalty_points` requires authentication (`allow_guest=False`).

When authentication is required, include the authentication token in the request headers:

```javascript
headers: {
  'Authorization': `token ${api_key}:${api_secret}`,
  // OR for session-based auth:
  'Cookie': `sid=${session_id}`
}
```

---

## Common Response Format

All endpoints return a JSON response with the following structure:

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  // ... additional data fields
}
```

### Error Response
```json
{
  "status": "failure",
  "message": "Error description",
  "error": "Detailed error message (if available)",
  "debug": ["debug", "messages", "array"] // (if available)
}
```

---

## API Endpoints

### 1. Create Loyalty Program

Creates a new loyalty program with specified rules and collection factors.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.create_loyalty_program`

**Method:** `POST`

**Authentication:** Required (via `allow_guest=True`, but recommend requiring auth in production)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `loyalty_program_name` | string | Yes | Unique name for the loyalty program |
| `points_per_unit` | number | Yes | Points earned per currency unit (collection_factor) |
| `program_type` | string | Yes | Type of loyalty program |
| `active` | boolean | No | Whether the program is active (default: `true`) |
| `tier_name` | string | No | Tier name for collection rules (default: `"Bronze"`) |

**Example Request:**

```javascript
const createLoyaltyProgram = async () => {
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.create_loyalty_program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      loyalty_program_name: 'Premium Rewards',
      points_per_unit: 10,
      program_type: 'Standard',
      active: true,
      tier_name: 'Gold'
    })
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Loyalty Program created successfully.",
  "loyalty_program": {
    "name": "Loyalty Program-00001",
    "loyalty_program_name": "Premium Rewards",
    "program_type": "Standard",
    "active": 1,
    // ... other loyalty program fields
  }
}
```

**Error Response:**

```json
{
  "status": "failure",
  "message": "A loyalty program with this name already exists."
}
```

---

### 2. Assign Loyalty Program to Customer

Assigns a loyalty program to a specific customer.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.assign_loyalty_program`

**Method:** `POST`

**Authentication:** Not required (`allow_guest=True`)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID (e.g., "CUST-001") |
| `loyalty_program_name` | string | Yes | Name of the loyalty program to assign |

**Example Request:**

```javascript
const assignLoyaltyProgram = async (customerId, programName) => {
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.assign_loyalty_program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: 'CUST-001',
      loyalty_program_name: 'Premium Rewards'
    })
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Loyalty Program assigned to customer successfully.",
  "customer": {
    "name": "CUST-001",
    "loyalty_program": "Loyalty Program-00001",
    // ... other customer fields
  }
}
```

**Error Response:**

```json
{
  "status": "failure",
  "message": "Customer not found."
}
```

---

### 3. Earn Loyalty Points

Awards loyalty points to a customer based on their purchase amount.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.earn_loyalty_points`

**Method:** `POST`

**Authentication:** Required (`allow_guest=False`)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID |
| `purchase_amount` | number | Yes | Amount of purchase (currency value) |

**Points Calculation:**

Points are calculated based on the loyalty program's `collection_factor`. If `collection_factor` is 10, then:
- Purchase of 100 = 10 points (100 / 10 = 10 points)
- Purchase of 25 = 2 points (25 / 10 = 2 points, integer division)

**Example Request:**

```javascript
const earnLoyaltyPoints = async (customerId, purchaseAmount) => {
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.earn_loyalty_points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}` // Required
    },
    body: JSON.stringify({
      customer_id: 'CUST-001',
      purchase_amount: 150.50
    })
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Points earned successfully.",
  "points_earned": 15,
  "total_points": 125,
  "debug": [
    "Converted purchase_amount: 150.5",
    "Customer fetched: CUST-001",
    "Loyalty Program fetched: Loyalty Program-00001",
    // ... more debug messages
  ]
}
```

**Error Response:**

```json
{
  "status": "failure",
  "message": "No loyalty program assigned to this customer.",
  "debug": ["..."]
}
```

---

### 4. Get Loyalty Balance

Retrieves the current loyalty points balance and recent transactions for a customer.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.get_loyalty_balance`

**Method:** `GET` or `POST`

**Authentication:** Not required (`allow_guest=True`)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID |
| `limit` | number | No | Number of recent transactions to return (default: 5) |

**Example Request (GET):**

```javascript
const getLoyaltyBalance = async (customerId, limit = 5) => {
  const params = new URLSearchParams({
    customer_id: customerId,
    limit: limit.toString()
  });
  
  const response = await fetch(
    `/api/method/techsavanna_pos.api.loyalty.get_loyalty_balance?${params}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
  
  const data = await response.json();
  return data;
};
```

**Example Request (POST):**

```javascript
const getLoyaltyBalance = async (customerId, limit = 5) => {
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.get_loyalty_balance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: customerId,
      limit: limit
    })
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "customer": "CUST-001",
  "points_balance": 125,
  "recent_transactions": [
    {
      "points_earned": 15,
      "transaction_type": "Earn",
      "purchase_amount": 150.50,
      "date": "2024-01-15 10:30:00",
      "reference_document": null
    },
    {
      "points_earned": 10,
      "transaction_type": "Redeem",
      "purchase_amount": 0,
      "date": "2024-01-14 14:20:00",
      "reference_document": "SAL-00045"
    }
    // ... more transactions
  ],
  "debug": ["..."]
}
```

---

### 5. Redeem Points

Redeems loyalty points for a customer.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.redeem_points`

**Method:** `POST`

**Authentication:** Not required (`allow_guest=True`)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID |
| `points_to_redeem` | number | Yes | Number of points to redeem (must be positive integer) |
| `reference_document` | string | No | Reference document (e.g., Sales Invoice number) |

**Example Request:**

```javascript
const redeemPoints = async (customerId, points, referenceDoc = null) => {
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.redeem_points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: customerId,
      points_to_redeem: points,
      reference_document: referenceDoc
    })
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "message": "Points redeemed successfully",
  "redeemed_points": 50,
  "remaining_points": 75,
  "reference_document": "SAL-00045",
  "debug": ["..."]
}
```

**Error Response:**

```json
{
  "status": "failure",
  "message": "Insufficient loyalty points",
  "available_points": 30,
  "requested_points": 50,
  "debug": ["..."]
}
```

---

### 6. Get Points History

Retrieves detailed transaction history with filtering and pagination support.

**Endpoint:** `/api/method/techsavanna_pos.api.loyalty.get_points_history`

**Method:** `GET` or `POST`

**Authentication:** Not required (`allow_guest=True`)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | string | Yes | Customer ID |
| `start_date` | string | No | Start date filter (format: "YYYY-MM-DD") |
| `end_date` | string | No | End date filter (format: "YYYY-MM-DD") |
| `transaction_type` | string | No | Filter by type: "earn", "redeem", "expire", "adjust" |
| `limit` | number | No | Number of records per page (default: 50) |
| `page` | number | No | Page number (default: 1) |

**Example Request:**

```javascript
const getPointsHistory = async (customerId, filters = {}) => {
  const params = {
    customer_id: customerId,
    start_date: filters.startDate || null,
    end_date: filters.endDate || null,
    transaction_type: filters.transactionType || null,
    limit: filters.limit || 50,
    page: filters.page || 1
  };
  
  // Remove null values
  Object.keys(params).forEach(key => 
    params[key] === null && delete params[key]
  );
  
  const response = await fetch('/api/method/techsavanna_pos.api.loyalty.get_points_history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
  
  const data = await response.json();
  return data;
};
```

**Success Response:**

```json
{
  "status": "success",
  "customer": "CUST-001",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_records": 125,
    "total_pages": 3
  },
  "filters": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "transaction_type": "earn"
  },
  "transactions": [
    {
      "name": "LTL-00001",
      "date": "2024-01-15 10:30:00",
      "transaction_type": "Earn",
      "points_earned": 15,
      "purchase_amount": 150.50,
      "reference_document": null
    }
    // ... more transactions
  ],
  "debug": ["..."]
}
```

---

## React.js Integration Examples

### Complete React Hook Example

```javascript
import { useState, useEffect } from 'react';

// Custom hook for loyalty operations
export const useLoyalty = (apiBaseUrl = '') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, data = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/method/techsavanna_pos.api.loyalty.${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.status === 'failure') {
        throw new Error(result.message);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    // Convenience methods
    createProgram: (name, pointsPerUnit, programType, active = true, tierName = 'Bronze') =>
      apiCall('create_loyalty_program', {
        loyalty_program_name: name,
        points_per_unit: pointsPerUnit,
        program_type: programType,
        active,
        tier_name: tierName
      }),
    
    assignProgram: (customerId, programName) =>
      apiCall('assign_loyalty_program', {
        customer_id: customerId,
        loyalty_program_name: programName
      }),
    
    earnPoints: (customerId, purchaseAmount) =>
      apiCall('earn_loyalty_points', {
        customer_id: customerId,
        purchase_amount: purchaseAmount
      }),
    
    getBalance: (customerId, limit = 5) =>
      apiCall('get_loyalty_balance', {
        customer_id: customerId,
        limit
      }),
    
    redeemPoints: (customerId, points, referenceDoc = null) =>
      apiCall('redeem_points', {
        customer_id: customerId,
        points_to_redeem: points,
        reference_document: referenceDoc
      }),
    
    getHistory: (customerId, filters = {}) =>
      apiCall('get_points_history', {
        customer_id: customerId,
        ...filters
      })
  };
};
```

### Usage in React Component

```javascript
import React, { useState, useEffect } from 'react';
import { useLoyalty } from './hooks/useLoyalty';

const LoyaltyDashboard = ({ customerId }) => {
  const { getBalance, earnPoints, redeemPoints, getHistory, loading, error } = useLoyalty();
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, [customerId]);

  const loadBalance = async () => {
    try {
      const result = await getBalance(customerId);
      setBalance(result);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await getHistory(customerId, {
        limit: 20,
        page: 1
      });
      setHistory(result.transactions);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleEarnPoints = async (purchaseAmount) => {
    try {
      const result = await earnPoints(customerId, purchaseAmount);
      alert(`Earned ${result.points_earned} points!`);
      loadBalance(); // Refresh balance
      loadHistory(); // Refresh history
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRedeemPoints = async (points) => {
    try {
      const result = await redeemPoints(customerId, points);
      alert(`Redeemed ${result.redeemed_points} points!`);
      loadBalance(); // Refresh balance
      loadHistory(); // Refresh history
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading && !balance) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Loyalty Points Dashboard</h2>
      {balance && (
        <div>
          <h3>Current Balance: {balance.points_balance} points</h3>
          <h4>Recent Transactions</h4>
          <ul>
            {balance.recent_transactions.map((txn, idx) => (
              <li key={idx}>
                {txn.transaction_type}: {txn.points_earned} points
                ({new Date(txn.date).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div>
        <h4>Actions</h4>
        <button onClick={() => handleEarnPoints(100)}>
          Earn Points (Purchase $100)
        </button>
        <button onClick={() => handleRedeemPoints(50)}>
          Redeem 50 Points
        </button>
      </div>
    </div>
  );
};

export default LoyaltyDashboard;
```

---

## Error Handling Best Practices

```javascript
// Utility function for handling API errors
const handleApiError = (response) => {
  if (response.status === 'failure') {
    const error = new Error(response.message);
    error.details = response.error;
    error.debug = response.debug;
    throw error;
  }
  return response;
};

// Usage
try {
  const result = await getBalance(customerId);
  const safeResult = handleApiError(result);
  // Process safeResult
} catch (error) {
  console.error('API Error:', error.message);
  if (error.debug) {
    console.error('Debug info:', error.debug);
  }
  // Show user-friendly error message
}
```

---

## TypeScript Type Definitions

```typescript
// loyalty.types.ts

export interface LoyaltyProgram {
  name: string;
  loyalty_program_name: string;
  program_type: string;
  active: boolean;
}

export interface LoyaltyTransaction {
  name?: string;
  points_earned: number;
  transaction_type: 'Earn' | 'Redeem' | 'Expire' | 'Adjust';
  purchase_amount: number;
  date: string;
  reference_document?: string | null;
}

export interface LoyaltyBalance {
  status: 'success' | 'failure';
  customer: string;
  points_balance: number;
  recent_transactions: LoyaltyTransaction[];
  debug?: string[];
  message?: string;
}

export interface PointsHistory {
  status: 'success' | 'failure';
  customer: string;
  pagination: {
    page: number;
    limit: number;
    total_records: number;
    total_pages: number;
  };
  filters: {
    start_date?: string | null;
    end_date?: string | null;
    transaction_type?: string | null;
  };
  transactions: LoyaltyTransaction[];
  debug?: string[];
}

export interface ApiResponse<T> {
  status: 'success' | 'failure';
  message?: string;
  error?: string;
  debug?: string[];
  [key: string]: any;
}
```

---

## Notes

1. **Date Format**: All dates should be in `YYYY-MM-DD` format when passed as parameters.

2. **Points Calculation**: Points are calculated using integer division. If `collection_factor` is 10 and purchase is 25, points earned = 2 (not 2.5).

3. **Balance Calculation**: The balance is calculated from the `Loyalty Transaction Log` ledger, ensuring accuracy. The `customer.loyalty_points` field is a cached value that gets updated but should not be the primary source of truth.

4. **Pagination**: The `get_points_history` endpoint supports pagination. Use the `pagination` object in the response to implement pagination controls.

5. **Authentication**: While most endpoints allow guest access, it's recommended to implement authentication checks in production to protect customer data.

6. **Debug Messages**: The `debug` array in responses contains detailed information useful for troubleshooting. Consider hiding these in production UIs.

---

## Support

For issues or questions, refer to the error logs in Frappe or contact the development team.

