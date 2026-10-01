import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { LocalOffer, CalendarToday, Business, Star } from '@mui/icons-material';
import { formatDiscountDisplay, formatRuleType, isDiscountRuleValidForDate } from '../../utils/discountCalculator';

/**
 * Component to display detailed discount information
 * 
 * @param {Object} props
 * @param {Object} props.discountRule - Discount rule object
 * @param {number} [props.price] - Original price (optional, for calculating discount amount)
 * 
 * @example
 * <DiscountInfo 
 *   discountRule={{ discount_type: 'Percentage', discount_value: 10, rule_type: 'Item Group' }}
 *   price={100}
 * />
 */
const DiscountInfo = ({ discountRule, price = null }) => {
  if (!discountRule) {
    return null;
  }

  const discountDisplay = formatDiscountDisplay(discountRule);
  const isValid = isDiscountRuleValidForDate(discountRule, new Date());
  const discountAmount = price ? (discountRule.discount_type === 'Percentage' 
    ? (price * discountRule.discount_value) / 100 
    : discountRule.discount_value) : null;
  const finalPrice = price && discountAmount ? price - discountAmount : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LocalOffer sx={{ fontSize: 18, color: 'success.main' }} />
        <Typography variant="body1" fontWeight="medium">
          {discountDisplay}
        </Typography>
        <Chip
          label={formatRuleType(discountRule.rule_type)}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {price && discountAmount && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Save {discountAmount.toFixed(2)} - Final Price: {finalPrice?.toFixed(2)}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {discountRule.priority !== undefined && (
          <Tooltip title="Priority (lower = higher priority)">
            <Chip
              icon={<Star sx={{ fontSize: 14 }} />}
              label={`Priority: ${discountRule.priority || 10}`}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}

        {discountRule.warehouse && (
          <Tooltip title="Warehouse">
            <Chip
              icon={<Business sx={{ fontSize: 14 }} />}
              label={discountRule.warehouse}
              size="small"
              variant="outlined"
            />
          </Tooltip>
        )}

        {(discountRule.valid_from || discountRule.valid_upto) && (
          <Tooltip title="Validity Period">
            <Chip
              icon={<CalendarToday sx={{ fontSize: 14 }} />}
              label={
                discountRule.valid_from && discountRule.valid_upto
                  ? `${new Date(discountRule.valid_from).toLocaleDateString()} - ${new Date(discountRule.valid_upto).toLocaleDateString()}`
                  : discountRule.valid_from
                  ? `From ${new Date(discountRule.valid_from).toLocaleDateString()}`
                  : `Until ${new Date(discountRule.valid_upto).toLocaleDateString()}`
              }
              size="small"
              variant="outlined"
              color={isValid ? 'default' : 'error'}
            />
          </Tooltip>
        )}

        {!isValid && (
          <Chip
            label="Expired"
            size="small"
            color="error"
          />
        )}
      </Box>

      {discountRule.description && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {discountRule.description}
        </Typography>
      )}
    </Box>
  );
};

export default DiscountInfo;



