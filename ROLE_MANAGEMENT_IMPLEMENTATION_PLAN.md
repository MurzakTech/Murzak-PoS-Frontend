# Role Management Enhancement Implementation Plan

## Overview

This plan outlines the implementation steps to enhance the role management system to match the documented workflow and improve usability. The plan is organized into phases with clear deliverables and acceptance criteria.

---

## Implementation Phases

### Phase 1: System API Integration (Foundation)
**Priority**: High  
**Estimated Time**: 4-6 hours  
**Dependencies**: None

### Phase 2: Enhanced Permission Management UI
**Priority**: High  
**Estimated Time**: 6-8 hours  
**Dependencies**: Phase 1

### Phase 3: Role Creation Improvements
**Priority**: Medium  
**Estimated Time**: 2-3 hours  
**Dependencies**: Phase 1

### Phase 4: Doctype Explorer Component (Optional)
**Priority**: Low  
**Estimated Time**: 4-5 hours  
**Dependencies**: Phase 1

---

## Phase 1: System API Integration

### Objective
Create the foundation for doctype and module discovery by integrating System APIs.

### Tasks

#### 1.1 Create System API Slice
**File**: `src/store/systemSlice.js`

**Implementation Details:**
```javascript
// Endpoints
const ENDPOINTS = {
  listModules: 'techsavanna_pos.api.system_api.list_modules',
  listDoctypes: 'techsavanna_pos.api.system_api.list_doctypes',
  getDoctypeDetails: 'techsavanna_pos.api.system_api.get_doctype_details',
};

// Thunks to implement:
- listModules()
- listDoctypes(filters) // with search, module, is_submittable, pagination
- getDoctypeDetails(doctype)
```

**State Structure:**
```javascript
{
  modules: [],
  doctypes: [],
  selectedDoctype: null,
  doctypeDetails: null,
  isLoadingModules: false,
  isLoadingDoctypes: false,
  isLoadingDetails: false,
  filters: {
    module: null,
    is_submittable: null,
    is_custom: null,
    search: '',
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  error: null,
}
```

**Acceptance Criteria:**
- [ ] All three System API endpoints are integrated
- [ ] Proper error handling with notifications
- [ ] Response data normalization
- [ ] Loading states managed
- [ ] Follows existing slice patterns (like `roleSlice.js`)

#### 1.2 Create System API Hook
**File**: `src/hooks/useSystemAPI.js`

**Implementation Details:**
```javascript
export const useSystemAPI = () => {
  // Return:
  // - listModules()
  // - listDoctypes(filters, pagination)
  // - getDoctypeDetails(doctype)
  // - setFilters()
  // - setPagination()
  // - modules, doctypes, doctypeDetails
  // - loading states
  // - error
}
```

**Acceptance Criteria:**
- [ ] Hook follows pattern of `useRoleManagement.js`
- [ ] All System API functions exposed
- [ ] Proper memoization with useCallback
- [ ] Easy to use in components

#### 1.3 Register System Slice in Store
**File**: `src/store/store.js`

**Implementation:**
- Import `systemSlice` reducer
- Add to store configuration

**Acceptance Criteria:**
- [ ] System slice added to Redux store
- [ ] No breaking changes to existing store

---

## Phase 2: Enhanced Permission Management UI

### Objective
Transform the permission assignment UI from manual entry to discovery-based selection.

### Tasks

#### 2.1 Create Doctype Selector Component
**File**: `src/components/Roles/DoctypeSelector.jsx`

**Features:**
- Module dropdown/selector
- Doctype search with debouncing (300ms)
- Autocomplete for doctype selection
- Display doctype metadata:
  - Submittable badge
  - Custom badge
  - Permission count (e.g., "4 roles have permissions")
  - Module name
- Pagination for large lists
- Loading states

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Module: [Stock ▼]                        │
│                                         │
│ Search: [Search doctypes...]            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Stock Entry                         │ │
│ │   Module: Stock | Submittable | 4   │ │
│ │   roles have permissions            │ │
│ ├─────────────────────────────────────┤ │
│ │ Stock Reconciliation                │ │
│ │   Module: Stock | Submittable | 2   │ │
│ │   roles have permissions            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Clear] [Select]                        │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Module selector works
- [ ] Search is debounced (300ms)
- [ ] Autocomplete shows relevant results
- [ ] Metadata displayed correctly
- [ ] Loading states shown
- [ ] Responsive design

#### 2.2 Create Permission Analysis Component
**File**: `src/components/Roles/PermissionAnalysis.jsx`

**Features:**
- Display existing permissions for selected doctype
- Show permission patterns:
  - Count of roles with each permission type
  - List of roles with permissions
- Permission recommendations based on doctype type
- Visual indicators (charts/badges)

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ Permission Analysis: Stock Entry       │
│                                         │
│ Existing Permissions:                   │
│ Read: 4 roles | Write: 3 | Create: 3  │
│ Submit: 2 | Delete: 2                  │
│                                         │
│ Roles with Permissions:                │
│ • Stock Manager                        │
│ • Stock User                           │
│ • Manufacturing User                    │
│                                         │
│ Recommendations:                        │
│ ✓ Read (all roles have it)            │
│ ✓ Write (recommended for managers)    │
│ ⚠ Submit (only if submittable)         │
└─────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Shows existing permissions when doctype selected
- [ ] Displays permission counts
- [ ] Lists roles with permissions
- [ ] Provides recommendations
- [ ] Updates when doctype changes

#### 2.3 Enhance RolePermissions Component
**File**: `src/components/Roles/RolePermissions.jsx`

**Changes:**
1. Replace manual TextField with `DoctypeSelector`
2. Add `PermissionAnalysis` component
3. Show doctype details before permission assignment
4. Add "Use Template" button to copy existing permissions
5. Improve permission flag UI (better layout, tooltips)

**Before:**
```jsx
<TextField
  label="DocType"
  value={newDoctype}
  onChange={(e) => setNewDoctype(e.target.value)}
/>
```

**After:**
```jsx
<DoctypeSelector
  selectedDoctype={selectedDoctype}
  onSelect={handleDoctypeSelect}
  module={selectedModule}
  onModuleChange={setSelectedModule}
/>

{selectedDoctype && (
  <PermissionAnalysis doctype={selectedDoctype} />
)}

{selectedDoctype && (
  <PermissionForm
    doctype={selectedDoctype}
    onSave={handleAddPermission}
  />
)}
```

**Acceptance Criteria:**
- [ ] DoctypeSelector integrated
- [ ] PermissionAnalysis shown when doctype selected
- [ ] Permission form improved
- [ ] "Use Template" functionality works
- [ ] Better UX flow

#### 2.4 Add Permission Template Feature
**File**: `src/components/Roles/PermissionTemplate.jsx` (new)

**Features:**
- When doctype selected, show existing permission sets
- Allow user to select a template (from existing role)
- Apply template to new permissions
- Modify template before applying

**Acceptance Criteria:**
- [ ] Templates loaded from existing permissions
- [ ] Can select and apply template
- [ ] Can modify template before applying

---

## Phase 3: Role Creation Improvements

### Objective
Add validation and better UX for role creation.

### Tasks

#### 3.1 Add Role Existence Check
**File**: `src/components/Roles/RoleForm.jsx`

**Changes:**
- Before submitting, check if role exists using `listRoles` with search
- Show warning if role name already exists
- Suggest similar role names
- Disable submit if duplicate

**Implementation:**
```javascript
const checkRoleExists = async (roleName) => {
  const result = await listRoles({ search: roleName });
  return result.payload.roles.some(
    role => role.role_name.toLowerCase() === roleName.toLowerCase()
  );
};

// In form validation
const validateRoleName = async (value) => {
  if (await checkRoleExists(value)) {
    return 'Role already exists';
  }
};
```

**Acceptance Criteria:**
- [ ] Checks role existence before creation
- [ ] Shows warning if duplicate
- [ ] Suggests similar names
- [ ] Prevents duplicate creation

#### 3.2 Enhance Role Form Validation
**File**: `src/components/Roles/RoleForm.jsx`

**Improvements:**
- Real-time validation
- Better error messages
- Character limit indicators
- Format suggestions

**Acceptance Criteria:**
- [ ] Real-time validation
- [ ] Clear error messages
- [ ] Better UX feedback

---

## Phase 4: Doctype Explorer Component (Optional)

### Objective
Create a standalone component for exploring doctypes and modules.

### Tasks

#### 4.1 Create Doctype Explorer Page
**File**: `src/pages/Settings/DoctypeExplorer.js`

**Features:**
- Sidebar with modules list
- Main area with doctype list
- Search bar with filters
- Doctype details panel
- Permission analysis view
- Export/import capabilities

**UI Layout:**
```
┌──────────┬─────────────────────────────────┐
│ Modules  │ Search: [________] [Filters ▼]  │
│          │                                 │
│ • Stock  │ ┌─────────────────────────────┐ │
│ • Buying │ │ Stock Entry                 │ │
│ • Selling│ │ Module: Stock | Submittable│ │
│          │ │ 4 roles have permissions    │ │
│          │ ├─────────────────────────────┤ │
│          │ │ Stock Reconciliation        │ │
│          │ │ Module: Stock | Submittable│ │
│          │ └─────────────────────────────┘ │
│          │                                 │
│          │ [Pagination: 1 2 3 ...]        │
└──────────┴─────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Module sidebar works
- [ ] Search and filters functional
- [ ] Doctype list displays correctly
- [ ] Details panel shows on selection
- [ ] Responsive design

---

## File Structure

```
src/
├── store/
│   ├── systemSlice.js          [NEW - Phase 1]
│   └── store.js                [UPDATE - Phase 1]
├── hooks/
│   └── useSystemAPI.js         [NEW - Phase 1]
├── components/
│   └── Roles/
│       ├── DoctypeSelector.jsx         [NEW - Phase 2]
│       ├── PermissionAnalysis.jsx     [NEW - Phase 2]
│       ├── PermissionTemplate.jsx      [NEW - Phase 2]
│       ├── RoleForm.jsx                [UPDATE - Phase 3]
│       └── RolePermissions.jsx         [UPDATE - Phase 2]
└── pages/
    └── Settings/
        └── DoctypeExplorer.js          [NEW - Phase 4]
```

---

## Implementation Details

### System API Slice Structure

```javascript
// src/store/systemSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../api/axiosInstance';
import { showNotification } from './notificationSlice';

const ENDPOINTS = {
  listModules: 'techsavanna_pos.api.system_api.list_modules',
  listDoctypes: 'techsavanna_pos.api.system_api.list_doctypes',
  getDoctypeDetails: 'techsavanna_pos.api.system_api.get_doctype_details',
};

// Helper functions (similar to roleSlice.js)
const extractResponseData = (response) => {
  if (response.data?.message && typeof response.data.message === 'object') {
    return response.data.message;
  }
  return response.data?.message || response.data;
};

const extractErrorMessage = (error) => {
  // Same pattern as roleSlice.js
};

// Thunks
export const listModules = createAsyncThunk(
  'system/listModules',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/api/method/${ENDPOINTS.listModules}`,
        { credentials: 'include' }
      );
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch modules',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const listDoctypes = createAsyncThunk(
  'system/listDoctypes',
  async ({ module, is_submittable, is_custom, search, page = 1, page_size = 50 } = {}, { dispatch, rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (module) params.append('module', module);
      if (is_submittable !== undefined) params.append('is_submittable', is_submittable);
      if (is_custom !== undefined) params.append('is_custom', is_custom);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('page_size', page_size);

      const response = await axiosInstance.get(
        `/api/method/${ENDPOINTS.listDoctypes}?${params.toString()}`,
        { credentials: 'include' }
      );
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch doctypes',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

export const getDoctypeDetails = createAsyncThunk(
  'system/getDoctypeDetails',
  async (doctype, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/api/method/${ENDPOINTS.getDoctypeDetails}?doctype=${encodeURIComponent(doctype)}`,
        { credentials: 'include' }
      );
      const data = extractResponseData(response);
      return data.data || data;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      dispatch(showNotification({
        message: errorMessage,
        severity: 'error',
        title: 'Failed to fetch doctype details',
      }));
      return rejectWithValue(errorMessage);
    }
  }
);

const initialState = {
  modules: [],
  doctypes: [],
  selectedDoctype: null,
  doctypeDetails: null,
  isLoadingModules: false,
  isLoadingDoctypes: false,
  isLoadingDetails: false,
  filters: {
    module: null,
    is_submittable: null,
    is_custom: null,
    search: '',
  },
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  },
  error: null,
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSelectedDoctype: (state, action) => {
      state.selectedDoctype = action.payload;
    },
  },
  extraReducers: (builder) => {
    // listModules
    builder
      .addCase(listModules.pending, (state) => {
        state.isLoadingModules = true;
        state.error = null;
      })
      .addCase(listModules.fulfilled, (state, action) => {
        state.isLoadingModules = false;
        state.modules = action.payload.modules || [];
      })
      .addCase(listModules.rejected, (state, action) => {
        state.isLoadingModules = false;
        state.error = action.payload;
      });

    // listDoctypes
    builder
      .addCase(listDoctypes.pending, (state) => {
        state.isLoadingDoctypes = true;
        state.error = null;
      })
      .addCase(listDoctypes.fulfilled, (state, action) => {
        state.isLoadingDoctypes = false;
        state.doctypes = action.payload.doctypes || [];
        state.pagination = {
          page: action.payload.pagination?.page || state.pagination.page,
          pageSize: action.payload.pagination?.page_size || state.pagination.pageSize,
          total: action.payload.pagination?.total || 0,
          totalPages: action.payload.pagination?.total_pages || 0,
        };
      })
      .addCase(listDoctypes.rejected, (state, action) => {
        state.isLoadingDoctypes = false;
        state.error = action.payload;
      });

    // getDoctypeDetails
    builder
      .addCase(getDoctypeDetails.pending, (state) => {
        state.isLoadingDetails = true;
        state.error = null;
      })
      .addCase(getDoctypeDetails.fulfilled, (state, action) => {
        state.isLoadingDetails = false;
        state.doctypeDetails = action.payload;
      })
      .addCase(getDoctypeDetails.rejected, (state, action) => {
        state.isLoadingDetails = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, setPagination, clearFilters, setSelectedDoctype } = systemSlice.actions;
export default systemSlice.reducer;
```

### System API Hook Structure

```javascript
// src/hooks/useSystemAPI.js
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  listModules,
  listDoctypes,
  getDoctypeDetails,
  setFilters,
  setPagination,
  clearFilters,
  setSelectedDoctype,
} from '../store/systemSlice';

export const useSystemAPI = () => {
  const dispatch = useAppDispatch();
  const {
    modules,
    doctypes,
    selectedDoctype,
    doctypeDetails,
    isLoadingModules,
    isLoadingDoctypes,
    isLoadingDetails,
    filters,
    pagination,
    error,
  } = useAppSelector((state) => state.system);

  const handleListModules = useCallback(async () => {
    return await dispatch(listModules());
  }, [dispatch]);

  const handleListDoctypes = useCallback(async (listFilters = {}, paginationOptions = {}) => {
    return await dispatch(listDoctypes({
      ...filters,
      ...listFilters,
      page: paginationOptions.page || pagination.page,
      page_size: paginationOptions.pageSize || pagination.pageSize,
    }));
  }, [dispatch, filters, pagination]);

  const handleGetDoctypeDetails = useCallback(async (doctype) => {
    return await dispatch(getDoctypeDetails(doctype));
  }, [dispatch]);

  const handleSetFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const handleSetPagination = useCallback((newPagination) => {
    dispatch(setPagination(newPagination));
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const handleSetSelectedDoctype = useCallback((doctype) => {
    dispatch(setSelectedDoctype(doctype));
  }, [dispatch]);

  return {
    // Data
    modules,
    doctypes,
    selectedDoctype,
    doctypeDetails,
    
    // Loading states
    isLoadingModules,
    isLoadingDoctypes,
    isLoadingDetails,
    
    // Filters & Pagination
    filters,
    pagination,
    
    // Error
    error,
    
    // Actions
    listModules: handleListModules,
    listDoctypes: handleListDoctypes,
    getDoctypeDetails: handleGetDoctypeDetails,
    setFilters: handleSetFilters,
    setPagination: handleSetPagination,
    clearFilters: handleClearFilters,
    setSelectedDoctype: handleSetSelectedDoctype,
  };
};

export default useSystemAPI;
```

---

## Testing Strategy

### Unit Tests
- [ ] System API slice reducers
- [ ] System API hook functions
- [ ] DoctypeSelector component
- [ ] PermissionAnalysis component

### Integration Tests
- [ ] System API integration with backend
- [ ] DoctypeSelector with RolePermissions
- [ ] Role creation with existence check

### Manual Testing Checklist
- [ ] List modules loads correctly
- [ ] Search doctypes works with debouncing
- [ ] Filter by module works
- [ ] Get doctype details shows permissions
- [ ] Permission assignment with discovery works
- [ ] Role existence check prevents duplicates
- [ ] All error states handled gracefully

---

## Migration Guide

### For Existing Users
1. No breaking changes - existing functionality preserved
2. New features are additive
3. Manual doctype entry still works (fallback)

### For Developers
1. Import `useSystemAPI` hook where needed
2. Use `DoctypeSelector` component in permission forms
3. Follow existing patterns for consistency

---

## Success Metrics

### Phase 1
- ✅ System APIs integrated and working
- ✅ No errors in console
- ✅ Response times < 500ms

### Phase 2
- ✅ Users can discover doctypes without typing
- ✅ Permission assignment time reduced by 50%
- ✅ Zero manual doctype name errors

### Phase 3
- ✅ Zero duplicate role creations
- ✅ Better user feedback on validation

---

## Timeline Estimate

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1 | System API Integration | 4-6 hours | High |
| Phase 2 | Enhanced Permission UI | 6-8 hours | High |
| Phase 3 | Role Creation Improvements | 2-3 hours | Medium |
| Phase 4 | Doctype Explorer | 4-5 hours | Low |
| **Total** | | **16-22 hours** | |

---

## Next Steps

1. **Review and Approve Plan** - Get stakeholder approval
2. **Start Phase 1** - Implement System API integration
3. **Test Phase 1** - Verify API integration works
4. **Start Phase 2** - Build enhanced UI components
5. **Iterate** - Test and refine based on feedback

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Status**: Ready for Implementation

