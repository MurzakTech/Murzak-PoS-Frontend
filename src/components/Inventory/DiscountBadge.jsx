import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { formatDiscountDisplay } from '../../utils/discountCalculator';

/**
 * Component to display a discount badge
 * 
 * @param {Object} props
 * @param {Object} props.discountRule - Discount rule object
 * @param {string} [props.size='small'] - Size of the badge
 * @param {string} [props.variant='filled'] - Variant of the chip
 * @param {boolean} [props.showIcon=true] - Whether to show the discount icon
 * @param {string} [props.color='success'] - Color of the badge
 * 
 * @example
 * <DiscountBadge discountRule={{ discount_type: 'Percentage', discount_value: 10 }} />
 */
const DiscountBadge = ({
  discountRule,
  size = 'small',
  variant = 'filled',
  showIcon = true,
  color = 'success',
  ...props
}) => {
  if (!discountRule) {
    return null;
  }

  const displayText = formatDiscountDisplay(discountRule);

  return (
    <Tooltip
      title={`${discountRule.discount_type}: ${displayText}`}
      arrow
    >
      <Chip
        label={displayText}
        size={size}
        color={color}
        variant={variant}
        icon={showIcon ? <LocalOffer sx={{ fontSize: '14px !important' }} /> : undefined}
        {...props}
      />
    </Tooltip>
  );
};

export default DiscountBadge;



