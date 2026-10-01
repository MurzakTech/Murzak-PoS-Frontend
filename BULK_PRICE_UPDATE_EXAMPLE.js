/**
 * BULK PRICE UPDATE - React Implementation Example
 * 
 * Endpoint: techsavanna_pos.api.product_api.bulk_update_prices
 * Method: POST
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { bulkUpdatePrices } from '../store/productSlice';

// ============================================================================
// 1. API ENDPOINT & REQUEST STRUCTURE
// ============================================================================

/**
 * Endpoint: 'techsavanna_pos.api.product_api.bulk_update_prices'
 * Method: POST
 * 
 * Request Payload Structure:
 * {
 *   company: string,                    // Required: Company name
 *   price_list: string,                 // Required: Price list name (e.g., "Standard Selling")
 *   currency?: string,                  // Optional: Currency code (defaults to 'KES')
 *   price_updates: [                    // Required: Array of price updates
 *     {
 *       item_code: string,              // Required: Product/item code
 *       price: number                   // Required: Price value (must be > 0)
 *     }
 *   ]
 * }
 */

// ============================================================================
// 2. COMPLETE REACT COMPONENT EXAMPLE
// ============================================================================

const BulkPriceUpdateExample = () => {
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceList, setPriceList] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [priceUpdates, setPriceUpdates] = useState([
    { item_code: '', price: '' }
  ]);

  // Get company from user/auth context
  const userCompany = 'Your Company Name'; // Replace with actual company from auth state

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!userCompany) {
      alert('Company information not found. Please complete your profile setup.');
      return;
    }

    if (!priceList) {
      alert('Please select a price list.');
      return;
    }

    // Prepare valid price updates array
    const validPrices = priceUpdates
      .filter((p) => p.item_code && p.price && parseFloat(p.price) > 0)
      .map((p) => ({
        item_code: p.item_code.trim(),
        price: parseFloat(p.price),
      }));

    if (validPrices.length === 0) {
      alert('Please add at least one valid price entry with item_code and price > 0.');
      return;
    }

    // Prepare request payload
    const requestPayload = {
      company: userCompany,
      price_list: priceList,
      currency: currency || 'KES',
      price_updates: validPrices,
    };

    // Example request payload:
    // {
    //   company: "Your Company Name",
    //   price_list: "Standard Selling",
    //   currency: "KES",
    //   price_updates: [
    //     { item_code: "ITEM-001", price: 1500.00 },
    //     { item_code: "ITEM-002", price: 2500.00 },
    //     { item_code: "ITEM-003", price: 3200.00 }
    //   ]
    // }

    setIsSubmitting(true);

    try {
      // Dispatch the Redux action (handles API call internally)
      const result = await dispatch(bulkUpdatePrices(requestPayload));

      if (result.type === 'product/bulkUpdatePrices/fulfilled') {
        console.log('Bulk price update successful!', result.payload);
        alert(`Successfully updated ${validPrices.length} product price(s)`);
        
        // Reset form
        setPriceUpdates([{ item_code: '', price: '' }]);
        setPriceList('');
      } else if (result.type === 'product/bulkUpdatePrices/rejected') {
        console.error('Bulk price update failed:', result.payload);
        // Error notification is already handled by the Redux thunk
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add new price entry row
  const addPriceEntry = () => {
    setPriceUpdates([...priceUpdates, { item_code: '', price: '' }]);
  };

  // Remove price entry row
  const removePriceEntry = (index) => {
    if (priceUpdates.length > 1) {
      setPriceUpdates(priceUpdates.filter((_, i) => i !== index));
    }
  };

  // Update price entry
  const updatePriceEntry = (index, field, value) => {
    const updated = [...priceUpdates];
    updated[index] = { ...updated[index], [field]: value };
    setPriceUpdates(updated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Bulk Price Update</h2>
      
      {/* Price List Selection */}
      <div>
        <label>Price List *</label>
        <input
          type="text"
          value={priceList}
          onChange={(e) => setPriceList(e.target.value)}
          placeholder="e.g., Standard Selling"
          required
        />
      </div>

      {/* Currency Selection */}
      <div>
        <label>Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="KES">KES</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>

      {/* Price Updates List */}
      <div>
        <h3>Price Updates</h3>
        {priceUpdates.map((entry, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Item Code"
              value={entry.item_code}
              onChange={(e) => updatePriceEntry(index, 'item_code', e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={entry.price}
              onChange={(e) => updatePriceEntry(index, 'price', e.target.value)}
              min="0"
              step="0.01"
              required
            />
            <button
              type="button"
              onClick={() => removePriceEntry(index)}
              disabled={priceUpdates.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addPriceEntry}>
          Add Another Item
        </button>
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating Prices...' : 'Update Prices'}
      </button>
    </form>
  );
};

export default BulkPriceUpdateExample;

// ============================================================================
// 3. ALTERNATIVE: DIRECT API CALL (without Redux)
// ============================================================================

/**
 * If you need to call the API directly without Redux:
 */

import axiosInstance from '../api/axiosInstance';

const bulkUpdatePricesDirect = async (payload) => {
  try {
    const endpoint = 'techsavanna_pos.api.product_api.bulk_update_prices';
    
    const response = await axiosInstance.post(endpoint, payload);
    
    // Extract data from response (based on your API response structure)
    const data = response.data?.message || response.data;
    
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update prices';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Usage example:
const exampleDirectCall = async () => {
  const payload = {
    company: "Your Company Name",
    price_list: "Standard Selling",
    currency: "KES",
    price_updates: [
      { item_code: "ITEM-001", price: 1500.00 },
      { item_code: "ITEM-002", price: 2500.00 },
      { item_code: "ITEM-003", price: 3200.00 }
    ]
  };

  const result = await bulkUpdatePricesDirect(payload);
  
  if (result.success) {
    console.log('Prices updated:', result.data);
  } else {
    console.error('Error:', result.error);
  }
};

// ============================================================================
// 4. SAMPLE REQUEST PAYLOAD EXAMPLES
// ============================================================================

/**
 * Example 1: Basic bulk update with 3 items
 */
const examplePayload1 = {
  company: "Your Company Name",
  price_list: "Standard Selling",
  currency: "KES",
  price_updates: [
    { item_code: "ITEM-001", price: 1500.00 },
    { item_code: "ITEM-002", price: 2500.00 },
    { item_code: "ITEM-003", price: 3200.00 }
  ]
};

/**
 * Example 2: Bulk update with different currency
 */
const examplePayload2 = {
  company: "Your Company Name",
  price_list: "International Prices",
  currency: "USD",
  price_updates: [
    { item_code: "PROD-101", price: 10.50 },
    { item_code: "PROD-102", price: 25.75 },
    { item_code: "PROD-103", price: 15.00 }
  ]
};

/**
 * Example 3: Minimal payload (currency optional)
 */
const examplePayload3 = {
  company: "Your Company Name",
  price_list: "Standard Selling",
  price_updates: [
    { item_code: "ITEM-001", price: 1500.00 }
  ]
};

// ============================================================================
// 5. TYPE DEFINITION (TypeScript)
// ============================================================================

/**
 * TypeScript interface definitions:
 */

/*
interface PriceUpdate {
  item_code: string;
  price: number;
}

interface BulkPriceUpdatePayload {
  company: string;
  price_list: string;
  currency?: string;  // Optional, defaults to 'KES'
  price_updates: PriceUpdate[];
}

interface BulkPriceUpdateResponse {
  message?: string;
  updated_count?: number;
  failed_count?: number;
  errors?: Array<{
    item_code: string;
    error: string;
  }>;
}
*/

