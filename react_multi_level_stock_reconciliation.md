# React.js Implementation Guide: Multi-Level Stock Reconciliation

Complete guide for implementing the multi-level stock reconciliation workflow in your React.js application.

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [TypeScript Types](#typescript-types)
3. [API Service Layer](#api-service-layer)
4. [React Hooks](#react-hooks)
5. [Component Examples](#component-examples)
6. [Complete Workflow Example](#complete-workflow-example)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Setup & Installation

### Prerequisites

- React 16.8+ (for hooks)
- TypeScript (recommended)
- Axios or Fetch API for HTTP requests
- Your API base URL configured

### Base Configuration

Create an API configuration file:

```typescript
// src/config/api.ts
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-domain.com';
export const API_METHOD_BASE = `${API_BASE_URL}/api/method/techsavanna_pos.api.inventory_api`;

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token'); // Adjust based on your auth implementation
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    // Or use cookies if your app uses cookie-based auth
  };
};
```

---

## TypeScript Types

```typescript
// src/types/stockReconciliation.ts

export interface StockReconciliationItem {
  item_code: string;
  qty: number;
  comment?: string;
}

export interface CreateReconciliationPayload {
  warehouse: string;
  posting_date?: string;
  posting_time?: string;
  company?: string;
  expense_account?: string;
  cost_center?: string;
  purpose?: 'Stock Reconciliation' | 'Opening Stock';
  items?: Array<{ item_code: string }>;
}

export interface AddStockTakePayload {
  reconciliation_name: string;
  items: StockReconciliationItem[];
  comment?: string;
}

export interface StockReconciliationRecord {
  item_code: string;
  warehouse: string;
  final_qty: number;
  current_qty: number | null;
  sales_person_qty?: number;
  sales_person_comment?: string;
  sales_person_name?: string;
  sales_person_date?: string;
  stock_controller_qty?: number;
  stock_controller_comment?: string;
  stock_controller_name?: string;
  stock_controller_date?: string;
  stock_manager_qty?: number;
  stock_manager_comment?: string;
  stock_manager_name?: string;
  stock_manager_date?: string;
}

export interface StockReconciliationData {
  name: string;
  company: string;
  warehouse: string;
  posting_date: string;
  posting_time: string;
  purpose: string;
  docstatus: number;
  workflow_status: string;
  stock_taking_records: StockReconciliationRecord[];
  items: Array<{
    item_code: string;
    warehouse: string;
    qty: number;
    current_qty: number;
  }>;
}

export type WorkflowStatus = 
  | 'Pending Sales User'
  | 'Pending Quality Manager'
  | 'Pending Stock Manager'
  | 'Completed';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error_type?: string;
}
```

---

## API Service Layer

```typescript
// src/services/stockReconciliationApi.ts

import { API_METHOD_BASE, getAuthHeaders } from '../config/api';
import {
  CreateReconciliationPayload,
  AddStockTakePayload,
  StockReconciliationData,
  ApiResponse,
} from '../types/stockReconciliation';

class StockReconciliationApi {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_METHOD_BASE}.${endpoint}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Create a new multi-level stock reconciliation
   */
  async createReconciliation(
    payload: CreateReconciliationPayload
  ): Promise<ApiResponse<{ name: string; workflow_status: string }>> {
    return this.request('create_multi_level_stock_reconciliation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Add stock take from Sales User
   */
  async addSalesUserStockTake(
    payload: AddStockTakePayload
  ): Promise<ApiResponse<{ reconciliation_name: string; items_counted: number; workflow_status: string }>> {
    return this.request('add_sales_person_stock_take', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Add stock take from Quality Manager
   */
  async addQualityManagerStockTake(
    payload: AddStockTakePayload
  ): Promise<ApiResponse<{ reconciliation_name: string; items_counted: number; workflow_status: string }>> {
    return this.request('add_stock_controller_stock_take', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Add stock take from Stock Manager and optionally submit
   */
  async addStockManagerStockTake(
    payload: AddStockTakePayload & { submit?: boolean }
  ): Promise<ApiResponse<{
    reconciliation_name: string;
    items_counted: number;
    workflow_status: string;
    submission: { submitted: boolean; docstatus?: number; error?: string };
    docstatus: number;
  }>> {
    return this.request('add_stock_manager_stock_take_and_submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get stock reconciliation with all stock taking records
   */
  async getReconciliation(
    reconciliationName: string
  ): Promise<ApiResponse<StockReconciliationData>> {
    return this.request(
      `get_multi_level_stock_reconciliation?reconciliation_name=${encodeURIComponent(reconciliationName)}`,
      {
        method: 'GET',
      }
    );
  }
}

export const stockReconciliationApi = new StockReconciliationApi();
```

---

## React Hooks

### Main Hook

```typescript
// src/hooks/useStockReconciliation.ts

import { useState, useCallback } from 'react';
import { stockReconciliationApi } from '../services/stockReconciliationApi';
import {
  CreateReconciliationPayload,
  AddStockTakePayload,
  StockReconciliationData,
  WorkflowStatus,
} from '../types/stockReconciliation';

interface UseStockReconciliationReturn {
  // State
  loading: boolean;
  error: string | null;
  reconciliation: StockReconciliationData | null;

  // Actions
  createReconciliation: (payload: CreateReconciliationPayload) => Promise<void>;
  addSalesUserStockTake: (payload: AddStockTakePayload) => Promise<void>;
  addQualityManagerStockTake: (payload: AddStockTakePayload) => Promise<void>;
  addStockManagerStockTake: (payload: AddStockTakePayload & { submit?: boolean }) => Promise<void>;
  getReconciliation: (name: string) => Promise<void>;
  clearError: () => void;
}

export const useStockReconciliation = (): UseStockReconciliationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<StockReconciliationData | null>(null);

  const handleError = useCallback((err: any) => {
    const errorMessage = err?.message || err?.response?.data?.message || 'An error occurred';
    setError(errorMessage);
    console.error('Stock Reconciliation Error:', err);
  }, []);

  const createReconciliation = useCallback(async (payload: CreateReconciliationPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockReconciliationApi.createReconciliation(payload);
      if (response.success && response.data) {
        // Optionally fetch the full reconciliation
        await getReconciliation(response.data.name);
      } else {
        throw new Error(response.message || 'Failed to create reconciliation');
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addSalesUserStockTake = useCallback(async (payload: AddStockTakePayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockReconciliationApi.addSalesUserStockTake(payload);
      if (response.success) {
        // Refresh reconciliation data
        await getReconciliation(payload.reconciliation_name);
      } else {
        throw new Error(response.message || 'Failed to add sales user stock take');
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addQualityManagerStockTake = useCallback(async (payload: AddStockTakePayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockReconciliationApi.addQualityManagerStockTake(payload);
      if (response.success) {
        await getReconciliation(payload.reconciliation_name);
      } else {
        throw new Error(response.message || 'Failed to add quality manager stock take');
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addStockManagerStockTake = useCallback(async (payload: AddStockTakePayload & { submit?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockReconciliationApi.addStockManagerStockTake(payload);
      if (response.success) {
        await getReconciliation(payload.reconciliation_name);
      } else {
        throw new Error(response.message || 'Failed to add stock manager stock take');
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReconciliation = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockReconciliationApi.getReconciliation(name);
      if (response.success && response.data) {
        setReconciliation(response.data);
      } else {
        throw new Error(response.message || 'Failed to get reconciliation');
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    reconciliation,
    createReconciliation,
    addSalesUserStockTake,
    addQualityManagerStockTake,
    addStockManagerStockTake,
    getReconciliation,
    clearError,
  };
};
```

### Role-Based Hook

```typescript
// src/hooks/useStockReconciliationByRole.ts

import { useMemo } from 'react';
import { useStockReconciliation } from './useStockReconciliation';
import { WorkflowStatus } from '../types/stockReconciliation';

interface UseStockReconciliationByRoleProps {
  userRole: 'Sales User' | 'Quality Manager' | 'Stock Manager';
}

export const useStockReconciliationByRole = ({ userRole }: UseStockReconciliationByRoleProps) => {
  const hook = useStockReconciliation();

  const canAddStockTake = useMemo(() => {
    if (!hook.reconciliation) return false;
    
    const status = hook.reconciliation.workflow_status;
    
    switch (userRole) {
      case 'Sales User':
        return status === 'Pending Sales User';
      case 'Quality Manager':
        return status === 'Pending Quality Manager';
      case 'Stock Manager':
        return status === 'Pending Stock Manager' || status === 'Completed';
      default:
        return false;
    }
  }, [hook.reconciliation, userRole]);

  const canSubmit = useMemo(() => {
    return userRole === 'Stock Manager' && 
           hook.reconciliation?.workflow_status === 'Pending Stock Manager';
  }, [hook.reconciliation, userRole]);

  const addStockTake = useMemo(() => {
    switch (userRole) {
      case 'Sales User':
        return hook.addSalesUserStockTake;
      case 'Quality Manager':
        return hook.addQualityManagerStockTake;
      case 'Stock Manager':
        return hook.addStockManagerStockTake;
      default:
        return null;
    }
  }, [userRole, hook]);

  return {
    ...hook,
    canAddStockTake,
    canSubmit,
    addStockTake,
    userRole,
  };
};
```

---

## Component Examples

### 1. Create Reconciliation Component

```typescript
// src/components/stockReconciliation/CreateReconciliation.tsx

import React, { useState } from 'react';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';

interface CreateReconciliationProps {
  onSuccess?: (reconciliationName: string) => void;
}

export const CreateReconciliation: React.FC<CreateReconciliationProps> = ({ onSuccess }) => {
  const { createReconciliation, loading, error } = useStockReconciliation();
  const [warehouse, setWarehouse] = useState('');
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Array<{ item_code: string }>>([]);
  const [newItemCode, setNewItemCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReconciliation({
        warehouse,
        posting_date: postingDate,
        items: items.length > 0 ? items : undefined,
      });
      
      // Get the created reconciliation name from the hook's state
      // You might need to adjust this based on your implementation
      if (onSuccess) {
        // onSuccess will be called after reconciliation is created
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const addItem = () => {
    if (newItemCode.trim()) {
      setItems([...items, { item_code: newItemCode.trim() }]);
      setNewItemCode('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="create-reconciliation">
      <h2>Create Stock Reconciliation</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Warehouse *
            <input
              type="text"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              required
              disabled={loading}
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            Posting Date
            <input
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        <div className="form-group">
          <label>
            Initial Items (Optional)
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={newItemCode}
                onChange={(e) => setNewItemCode(e.target.value)}
                placeholder="Item Code"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
              />
              <button type="button" onClick={addItem} disabled={loading}>
                Add Item
              </button>
            </div>
          </label>
          
          {items.length > 0 && (
            <ul style={{ marginTop: '0.5rem' }}>
              {items.map((item, index) => (
                <li key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {item.item_code}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" disabled={loading || !warehouse}>
          {loading ? 'Creating...' : 'Create Reconciliation'}
        </button>
      </form>
    </div>
  );
};
```

### 2. Stock Take Component

```typescript
// src/components/stockReconciliation/StockTakeForm.tsx

import React, { useState, useEffect } from 'react';
import { useStockReconciliationByRole } from '../../hooks/useStockReconciliationByRole';
import { StockReconciliationItem } from '../../types/stockReconciliation';

interface StockTakeFormProps {
  reconciliationName: string;
  userRole: 'Sales User' | 'Quality Manager' | 'Stock Manager';
  onSuccess?: () => void;
}

export const StockTakeForm: React.FC<StockTakeFormProps> = ({
  reconciliationName,
  userRole,
  onSuccess,
}) => {
  const { addStockTake, getReconciliation, reconciliation, loading, error, canAddStockTake, canSubmit } =
    useStockReconciliationByRole({ userRole });

  const [items, setItems] = useState<StockReconciliationItem[]>([]);
  const [generalComment, setGeneralComment] = useState('');
  const [submitOnComplete, setSubmitOnComplete] = useState(false);

  useEffect(() => {
    if (reconciliationName) {
      getReconciliation(reconciliationName);
    }
  }, [reconciliationName, getReconciliation]);

  useEffect(() => {
    if (reconciliation?.items) {
      // Initialize items from reconciliation
      const initialItems: StockReconciliationItem[] = reconciliation.items.map((item) => ({
        item_code: item.item_code,
        qty: item.qty || 0,
        comment: '',
      }));
      setItems(initialItems);
    }
  }, [reconciliation]);

  const updateItemQty = (itemCode: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_code === itemCode ? { ...item, qty } : item
      )
    );
  };

  const updateItemComment = (itemCode: string, comment: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.item_code === itemCode ? { ...item, comment } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canAddStockTake) {
      alert('You cannot add stock take at this stage');
      return;
    }

    try {
      if (userRole === 'Stock Manager' && canSubmit && submitOnComplete) {
        await addStockTake({
          reconciliation_name: reconciliationName,
          items,
          comment: generalComment,
          submit: true,
        });
      } else {
        await addStockTake({
          reconciliation_name: reconciliationName,
          items,
          comment: generalComment,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  if (!reconciliation) {
    return <div>Loading reconciliation...</div>;
  }

  const roleLabel = {
    'Sales User': 'Sales User',
    'Quality Manager': 'Quality Manager',
    'Stock Manager': 'Stock Manager',
  }[userRole];

  return (
    <div className="stock-take-form">
      <h2>{roleLabel} Stock Take</h2>
      <p>Reconciliation: {reconciliationName}</p>
      <p>Status: {reconciliation.workflow_status}</p>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!canAddStockTake && (
        <div className="warning" style={{ color: 'orange', marginBottom: '1rem' }}>
          You cannot add stock take at the current workflow stage.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            General Comment
            <textarea
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </label>
        </div>

        <div className="items-list">
          <h3>Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Current Qty</th>
                <th>Counted Qty *</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const currentQty =
                  reconciliation.stock_taking_records.find(
                    (r) => r.item_code === item.item_code
                  )?.current_qty || 0;

                return (
                  <tr key={item.item_code}>
                    <td>{item.item_code}</td>
                    <td>{currentQty}</td>
                    <td>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) =>
                          updateItemQty(item.item_code, parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                        required
                        disabled={loading}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.comment || ''}
                        onChange={(e) =>
                          updateItemComment(item.item_code, e.target.value)
                        }
                        placeholder="Item comment"
                        disabled={loading}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {userRole === 'Stock Manager' && canSubmit && (
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={submitOnComplete}
                onChange={(e) => setSubmitOnComplete(e.target.checked)}
                disabled={loading}
              />
              Submit reconciliation after adding stock take
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canAddStockTake}
        >
          {loading
            ? 'Saving...'
            : userRole === 'Stock Manager' && submitOnComplete
            ? 'Add Stock Take & Submit'
            : 'Add Stock Take'}
        </button>
      </form>
    </div>
  );
};
```

### 3. Reconciliation View Component

```typescript
// src/components/stockReconciliation/ReconciliationView.tsx

import React, { useEffect } from 'react';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';

interface ReconciliationViewProps {
  reconciliationName: string;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  reconciliationName,
}) => {
  const { getReconciliation, reconciliation, loading, error } = useStockReconciliation();

  useEffect(() => {
    if (reconciliationName) {
      getReconciliation(reconciliationName);
    }
  }, [reconciliationName, getReconciliation]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!reconciliation) {
    return <div>Reconciliation not found</div>;
  }

  return (
    <div className="reconciliation-view">
      <h2>Stock Reconciliation: {reconciliation.name}</h2>
      
      <div className="reconciliation-info">
        <p><strong>Company:</strong> {reconciliation.company}</p>
        <p><strong>Warehouse:</strong> {reconciliation.warehouse}</p>
        <p><strong>Posting Date:</strong> {reconciliation.posting_date}</p>
        <p><strong>Status:</strong> {reconciliation.workflow_status}</p>
        <p><strong>Document Status:</strong> {reconciliation.docstatus === 0 ? 'Draft' : reconciliation.docstatus === 1 ? 'Submitted' : 'Cancelled'}</p>
      </div>

      <div className="stock-taking-records">
        <h3>Stock Taking Records</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Current Qty</th>
              <th>Sales User Qty</th>
              <th>Sales User Comment</th>
              <th>Quality Manager Qty</th>
              <th>Quality Manager Comment</th>
              <th>Stock Manager Qty</th>
              <th>Stock Manager Comment</th>
              <th>Final Qty</th>
            </tr>
          </thead>
          <tbody>
            {reconciliation.stock_taking_records.map((record) => (
              <tr key={record.item_code}>
                <td>{record.item_code}</td>
                <td>{record.current_qty || 0}</td>
                <td>{record.sales_person_qty ?? '-'}</td>
                <td>{record.sales_person_comment || '-'}</td>
                <td>{record.stock_controller_qty ?? '-'}</td>
                <td>{record.stock_controller_comment || '-'}</td>
                <td>{record.stock_manager_qty ?? '-'}</td>
                <td>{record.stock_manager_comment || '-'}</td>
                <td><strong>{record.final_qty}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="audit-trail">
        <h3>Audit Trail</h3>
        {reconciliation.stock_taking_records.map((record) => (
          <div key={record.item_code} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ddd' }}>
            <h4>{record.item_code}</h4>
            {record.sales_person_name && (
              <p>
                <strong>Sales User:</strong> {record.sales_person_name} on {record.sales_person_date} - 
                Qty: {record.sales_person_qty} - {record.sales_person_comment}
              </p>
            )}
            {record.stock_controller_name && (
              <p>
                <strong>Quality Manager:</strong> {record.stock_controller_name} on {record.stock_controller_date} - 
                Qty: {record.stock_controller_qty} - {record.stock_controller_comment}
              </p>
            )}
            {record.stock_manager_name && (
              <p>
                <strong>Stock Manager:</strong> {record.stock_manager_name} on {record.stock_manager_date} - 
                Qty: {record.stock_manager_qty} - {record.stock_manager_comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4. Workflow Status Badge Component

```typescript
// src/components/stockReconciliation/WorkflowStatusBadge.tsx

import React from 'react';
import { WorkflowStatus } from '../../types/stockReconciliation';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

const statusColors: Record<WorkflowStatus, string> = {
  'Pending Sales User': '#ff9800',
  'Pending Quality Manager': '#2196f3',
  'Pending Stock Manager': '#9c27b0',
  'Completed': '#4caf50',
};

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({ status }) => {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '0.25rem',
        backgroundColor: statusColors[status],
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: 'bold',
      }}
    >
      {status}
    </span>
  );
};
```

---

## Complete Workflow Example

```typescript
// src/pages/StockReconciliationWorkflow.tsx

import React, { useState } from 'react';
import { CreateReconciliation } from '../components/stockReconciliation/CreateReconciliation';
import { StockTakeForm } from '../components/stockReconciliation/StockTakeForm';
import { ReconciliationView } from '../components/stockReconciliation/ReconciliationView';
import { WorkflowStatusBadge } from '../components/stockReconciliation/WorkflowStatusBadge';

// This would come from your auth context
const getUserRole = (): 'Sales User' | 'Quality Manager' | 'Stock Manager' => {
  // Implement based on your auth system
  return 'Sales User'; // Example
};

export const StockReconciliationWorkflow: React.FC = () => {
  const [currentReconciliation, setCurrentReconciliation] = useState<string | null>(null);
  const [step, setStep] = useState<'create' | 'stock-take' | 'view'>('create');
  const userRole = getUserRole();

  const handleReconciliationCreated = (name: string) => {
    setCurrentReconciliation(name);
    setStep('stock-take');
  };

  const handleStockTakeComplete = () => {
    setStep('view');
  };

  return (
    <div className="stock-reconciliation-workflow">
      <h1>Multi-Level Stock Reconciliation</h1>
      <p>Current Role: <strong>{userRole}</strong></p>

      {step === 'create' && (
        <CreateReconciliation
          onSuccess={handleReconciliationCreated}
        />
      )}

      {step === 'stock-take' && currentReconciliation && (
        <>
          <button onClick={() => setStep('view')}>View Reconciliation</button>
          <StockTakeForm
            reconciliationName={currentReconciliation}
            userRole={userRole}
            onSuccess={handleStockTakeComplete}
          />
        </>
      )}

      {step === 'view' && currentReconciliation && (
        <>
          <button onClick={() => setStep('stock-take')}>Back to Stock Take</button>
          <ReconciliationView reconciliationName={currentReconciliation} />
        </>
      )}
    </div>
  );
};
```

---

## Error Handling

```typescript
// src/utils/errorHandler.ts

export interface ApiError {
  message: string;
  error_type?: string;
  status?: number;
}

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Usage in components
const MyComponent = () => {
  const { error, clearError } = useStockReconciliation();

  useEffect(() => {
    if (error) {
      // Show toast notification
      toast.error(error);
      // Or show modal
      // Or log to error tracking service
    }
  }, [error]);

  return (
    <div>
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
};
```

---

## Best Practices

### 1. Loading States

```typescript
// Show loading indicators during API calls
{loading && <Spinner />}
```

### 2. Optimistic Updates

```typescript
// Update UI immediately, then sync with server
const addStockTakeOptimistic = async (payload: AddStockTakePayload) => {
  // Update local state immediately
  setLocalItems(payload.items);
  
  try {
    await addStockTake(payload);
  } catch (err) {
    // Revert on error
    setLocalItems(previousItems);
    throw err;
  }
};
```

### 3. Form Validation

```typescript
const validateStockTake = (items: StockReconciliationItem[]): string | null => {
  if (items.length === 0) {
    return 'At least one item is required';
  }
  
  for (const item of items) {
    if (item.qty < 0) {
      return `Quantity cannot be negative for item ${item.item_code}`;
    }
    if (!item.item_code) {
      return 'Item code is required for all items';
    }
  }
  
  return null;
};
```

### 4. Debouncing API Calls

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedGetReconciliation = useDebouncedCallback(
  (name: string) => {
    getReconciliation(name);
  },
  500
);
```

### 5. Caching

```typescript
// Use React Query or SWR for caching
import { useQuery } from 'react-query';

const { data, isLoading } = useQuery(
  ['reconciliation', reconciliationName],
  () => stockReconciliationApi.getReconciliation(reconciliationName),
  {
    staleTime: 30000, // 30 seconds
    cacheTime: 300000, // 5 minutes
  }
);
```

---

## Complete Example: Full Implementation

```typescript
// src/App.tsx (Example)

import React from 'react';
import { StockReconciliationWorkflow } from './pages/StockReconciliationWorkflow';
import './App.css';

function App() {
  return (
    <div className="App">
      <StockReconciliationWorkflow />
    </div>
  );
}

export default App;
```

---

## Testing

### Unit Test Example

```typescript
// src/hooks/__tests__/useStockReconciliation.test.ts

import { renderHook, act } from '@testing-library/react-hooks';
import { useStockReconciliation } from '../useStockReconciliation';
import { stockReconciliationApi } from '../../services/stockReconciliationApi';

jest.mock('../../services/stockReconciliationApi');

describe('useStockReconciliation', () => {
  it('should create reconciliation', async () => {
    const mockResponse = {
      success: true,
      data: { name: 'MAT-RECO-2025-00001', workflow_status: 'Pending Sales User' },
    };

    (stockReconciliationApi.createReconciliation as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useStockReconciliation());

    await act(async () => {
      await result.current.createReconciliation({
        warehouse: 'Stores - HO',
      });
    });

    expect(result.current.error).toBeNull();
  });
});
```

---

## Summary

This guide provides:

1. ✅ Complete TypeScript types
2. ✅ API service layer with all endpoints
3. ✅ React hooks for state management
4. ✅ Role-based hook for workflow control
5. ✅ Complete component examples
6. ✅ Error handling utilities
7. ✅ Best practices and patterns
8. ✅ Testing examples

You can now implement the multi-level stock reconciliation workflow in your React.js application!

