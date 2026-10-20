import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice, initApiBridge } from './api/apiSlice';
import authReducer from './authSlice';
import onboardingReducer from './onboardingSlice';
import notificationReducer from './notificationSlice';
import staffReducer from './staffSlice';
import productReducer from './productSlice';
import supplierReducer from './supplierSlice';
import purchaseReducer from './purchaseSlice';
import warehouseReducer from './warehouseSlice';
import inventoryReducer from './inventorySlice';
import salesReducer from './salesSlice';
import customerReducer from './customerSlice';
import accountProvisioningReducer from './accountProvisioningSlice';
import inventoryDiscountReducer from './inventoryDiscountSlice';
import roleReducer from './roleSlice';
import systemReducer from './systemSlice';
import productSeedingReducer from './productSeedingSlice';
import loyaltyReducer from './loyaltySlice';
import stockTransferReducer from './stockTransferSlice';
import reportsReducer from './reportsSlice';
import grnReducer from './grnSlice';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    onboarding: onboardingReducer,
    notification: notificationReducer,
    staff: staffReducer,
    product: productReducer,
    supplier: supplierReducer,
    purchase: purchaseReducer,
    warehouse: warehouseReducer,
    inventory: inventoryReducer,
    sales: salesReducer,
    customer: customerReducer,
    accountProvisioning: accountProvisioningReducer,
    inventoryDiscount: inventoryDiscountReducer,
    role: roleReducer,
    system: systemReducer,
    productSeeding: productSeedingReducer,
    loyalty: loyaltyReducer,
    stockTransfer: stockTransferReducer,
    reports: reportsReducer,
    grn: grnReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore legacy auth action token paths if any
        ignoredActions: ['auth/register/fulfilled', 'auth/login/fulfilled'],
        ignoredActionPaths: ['payload.jwtToken'],
      },
    }).concat(apiSlice.middleware),
});

// Enables refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Bridges New Look mutations to RTK Query cache invalidation
initApiBridge(store.dispatch);
