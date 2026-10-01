/**
 * Utility functions for calculating and formatting inventory discounts
 */

/**
 * Calculate the discount amount from a discount rule
 * 
 * @param {number} price - Original price
 * @param {Object} discountRule - Discount rule object
 * @param {string} discountRule.discount_type - "Percentage" or "Amount"
 * @param {number} discountRule.discount_value - Discount value
 * @returns {number} - Discount amount
 * 
 * @example
 * calculateDiscountAmount(100, { discount_type: 'Percentage', discount_value: 10 })
 * // Returns: 10
 * 
 * calculateDiscountAmount(100, { discount_type: 'Amount', discount_value: 5 })
 * // Returns: 5
 */
export const calculateDiscountAmount = (price, discountRule) => {
  if (!discountRule || !price || price <= 0) {
    return 0;
  }

  if (discountRule.discount_type === 'Percentage') {
    const percentage = Math.min(100, Math.max(0, discountRule.discount_value || 0));
    return (price * percentage) / 100;
  } else if (discountRule.discount_type === 'Amount') {
    return Math.min(price, Math.max(0, discountRule.discount_value || 0));
  }

  return 0;
};

/**
 * Calculate the discounted price from a discount rule
 * 
 * @param {number} price - Original price
 * @param {Object} discountRule - Discount rule object
 * @returns {number} - Price after discount
 * 
 * @example
 * calculateDiscountedPrice(100, { discount_type: 'Percentage', discount_value: 10 })
 * // Returns: 90
 */
export const calculateDiscountedPrice = (price, discountRule) => {
  if (!discountRule || !price || price <= 0) {
    return price;
  }

  const discountAmount = calculateDiscountAmount(price, discountRule);
  return Math.max(0, price - discountAmount);
};

/**
 * Format discount for display in UI
 * 
 * @param {Object} discountRule - Discount rule object
 * @returns {string} - Formatted discount string
 * 
 * @example
 * formatDiscountDisplay({ discount_type: 'Percentage', discount_value: 10 })
 * // Returns: "10%"
 * 
 * formatDiscountDisplay({ discount_type: 'Amount', discount_value: 5 })
 * // Returns: "$5.00 off"
 */
export const formatDiscountDisplay = (discountRule, currency = 'KES') => {
  if (!discountRule) {
    return '';
  }

  if (discountRule.discount_type === 'Percentage') {
    return `${discountRule.discount_value || 0}%`;
  } else if (discountRule.discount_type === 'Amount') {
    return `${currency} ${(discountRule.discount_value || 0).toFixed(2)} off`;
  }

  return '';
};

/**
 * Get the best discount rule from an array of rules based on priority
 * Priority order: Batch > Item > Item Group
 * Within same type: Lower priority number wins
 * 
 * @param {Array} rules - Array of discount rules
 * @returns {Object|null} - Best matching rule or null
 * 
 * @example
 * const rules = [
 *   { rule_type: 'Item Group', priority: 10, discount_value: 5 },
 *   { rule_type: 'Item', priority: 5, discount_value: 10 },
 * ];
 * getBestDiscountRule(rules)
 * // Returns: { rule_type: 'Item', priority: 5, discount_value: 10 }
 */
export const getBestDiscountRule = (rules) => {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  // Filter out inactive rules
  const activeRules = rules.filter((rule) => rule.is_active !== 0 && rule.is_active !== false);

  if (activeRules.length === 0) {
    return null;
  }

  // Priority order: Batch (1) > Item (2) > Item Group (3)
  const typePriority = {
    'Batch': 1,
    'Item': 2,
    'Item Group': 3,
  };

  // Sort by type priority first, then by rule priority
  const sortedRules = [...activeRules].sort((a, b) => {
    const aTypePriority = typePriority[a.rule_type] || 999;
    const bTypePriority = typePriority[b.rule_type] || 999;

    if (aTypePriority !== bTypePriority) {
      return aTypePriority - bTypePriority;
    }

    // Within same type, lower priority number wins
    const aPriority = a.priority || 10;
    const bPriority = b.priority || 10;
    return aPriority - bPriority;
  });

  return sortedRules[0];
};

/**
 * Check if a discount rule is valid for a given date
 * 
 * @param {Object} discountRule - Discount rule object
 * @param {string|Date} date - Date to check (YYYY-MM-DD format or Date object)
 * @returns {boolean} - True if rule is valid for the date
 * 
 * @example
 * const rule = {
 *   valid_from: '2025-01-01',
 *   valid_upto: '2025-01-31',
 * };
 * isDiscountRuleValidForDate(rule, '2025-01-15')
 * // Returns: true
 */
export const isDiscountRuleValidForDate = (discountRule, date) => {
  if (!discountRule) {
    return false;
  }

  // If no date restrictions, rule is always valid
  if (!discountRule.valid_from && !discountRule.valid_upto) {
    return true;
  }

  const checkDate = date instanceof Date ? date : new Date(date);
  if (isNaN(checkDate.getTime())) {
    return false;
  }

  if (discountRule.valid_from) {
    const validFrom = new Date(discountRule.valid_from);
    if (checkDate < validFrom) {
      return false;
    }
  }

  if (discountRule.valid_upto) {
    const validUpto = new Date(discountRule.valid_upto);
    // Set to end of day for comparison
    validUpto.setHours(23, 59, 59, 999);
    if (checkDate > validUpto) {
      return false;
    }
  }

  return true;
};

/**
 * Format discount rule type for display
 * 
 * @param {string} ruleType - Rule type ("Batch", "Item", "Item Group")
 * @returns {string} - Formatted string
 * 
 * @example
 * formatRuleType('Item Group')
 * // Returns: "Item Group"
 */
export const formatRuleType = (ruleType) => {
  if (!ruleType) return '';
  
  const typeMap = {
    'Batch': 'Batch',
    'Item': 'Item',
    'Item Group': 'Item Group',
  };

  return typeMap[ruleType] || ruleType;
};

/**
 * Get discount summary for display
 * 
 * @param {Object} discountRule - Discount rule object
 * @param {number} price - Original price (optional)
 * @returns {Object} - Summary object with formatted strings
 * 
 * @example
 * getDiscountSummary({ discount_type: 'Percentage', discount_value: 10 }, 100)
 * // Returns: {
 * //   type: 'Percentage',
 * //   value: 10,
 * //   display: '10%',
 * //   amount: 10,
 * //   finalPrice: 90,
 * // }
 */
export const getDiscountSummary = (discountRule, price = null) => {
  if (!discountRule) {
    return null;
  }

  const amount = price ? calculateDiscountAmount(price, discountRule) : null;
  const finalPrice = price ? calculateDiscountedPrice(price, discountRule) : null;

  return {
    type: discountRule.discount_type,
    value: discountRule.discount_value,
    display: formatDiscountDisplay(discountRule),
    amount,
    finalPrice,
    rule: discountRule,
  };
};

