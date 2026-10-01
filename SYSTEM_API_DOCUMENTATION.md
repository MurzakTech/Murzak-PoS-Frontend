# System API Documentation

Complete API documentation for system utilities endpoints, designed for React.js frontend consumption. These APIs are essential for role creation and permission management workflows.

## Table of Contents

1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [Use Cases in Role Creation](#use-cases-in-role-creation)
4. [API Endpoints](#api-endpoints)
   - [List Doctypes](#1-list-doctypes)
   - [Get Doctype Details](#2-get-doctype-details)
   - [List Modules](#3-list-modules)
5. [React.js Examples](#reactjs-examples)
6. [TypeScript Types](#typescript-types)
7. [Integration with Role Creation](#integration-with-role-creation)
8. [Error Handling](#error-handling)

---

## Overview

The System API provides endpoints to discover and explore doctypes, modules, and their permissions. These APIs are particularly useful when:

- **Creating custom roles** - Discover available doctypes to assign permissions
- **Setting up permissions** - Understand what permissions exist for each doctype
- **Exploring the system** - Find doctypes by module, type, or search term
- **Permission management** - Get detailed permission information for role assignment

---

## Base URL & Authentication

All endpoints are relative to your Frappe backend API:

```
/api/method/techsavanna_pos.api.system_api.<endpoint_name>
```

### Authentication

All endpoints require authentication. Include session cookie or API key in your requests.

```javascript
// Using fetch with session cookie (automatic)
fetch('/api/method/techsavanna_pos.api.system_api.list_doctypes', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Using API key
fetch('/api/method/techsavanna_pos.api.system_api.list_doctypes', {
  method: 'GET',
  headers: {
    'Authorization': 'token <api_key>:<api_secret>',
    'Content-Type': 'application/json'
  }
})
```

---

## Use Cases in Role Creation

### Workflow: Creating a Role with Permissions

1. **Discover Doctypes** → Use `list_doctypes` to find relevant doctypes
2. **Get Permission Details** → Use `get_doctype_details` to see existing permissions
3. **Create Role** → Use `create_role` from role_api
4. **Assign Permissions** → Use `assign_permissions_to_role` from role_api

### Common Scenarios

**Scenario 1: Creating a "Stock Counter" Role**
```
1. list_doctypes(module="Stock", is_submittable=true)
   → Find: Stock Reconciliation, Stock Entry, etc.
2. get_doctype_details("Stock Reconciliation")
   → See what permissions exist
3. create_role("Stock Counter")
4. assign_permissions_to_role("Stock Counter", "Stock Reconciliation", {...})
```

**Scenario 2: Creating a "Transfer Requester" Role**
```
1. list_doctypes(search="Material Request")
   → Find Material Request doctype
2. get_doctype_details("Material Request")
   → Understand permission structure
3. create_role("Transfer Requester")
4. assign_permissions_to_role("Transfer Requester", "Material Request", {...})
```

**Scenario 3: Exploring Available Modules**
```
1. list_modules()
   → See all modules (Stock, Buying, Selling, etc.)
2. list_doctypes(module="Stock")
   → Get all Stock-related doctypes
3. Filter and select relevant doctypes for role
```

---

## API Endpoints

### 0. List Roles (Role API)

Lists all roles in the system with optional filtering, search, and pagination. Useful for checking if a role already exists before creating.

**Endpoint:** `list_roles` (from `role_api`)  
**Method:** `GET`  
**URL:** `/api/method/techsavanna_pos.api.role_api.list_roles`  
**Authentication:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `disabled` | boolean | No | Filter by disabled status |
| `is_custom` | boolean | No | Filter by custom roles |
| `desk_access` | boolean | No | Filter by desk access |
| `restrict_to_domain` | string | No | Filter by domain |
| `search` | string | No | **Search in role name** (partial match, case-insensitive) |
| `page` | number | No | Page number (default: 1) |
| `page_size` | number | No | Items per page (default: 20, max: 200) |

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "name": "Stock Manager",
        "role_name": "Stock Manager",
        "disabled": 0,
        "is_custom": 0,
        "desk_access": 1,
        "two_factor_auth": 0,
        "restrict_to_domain": null,
        "home_page": null,
        "user_count": 5
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 45,
      "total_pages": 3
    },
    "filters_applied": {
      "disabled": null,
      "is_custom": null,
      "desk_access": null,
      "restrict_to_domain": null,
      "search": "Stock"
    }
  }
}
```

#### Example

```javascript
const listRoles = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.disabled !== undefined) params.append('disabled', filters.disabled);
    if (filters.is_custom !== undefined) params.append('is_custom', filters.is_custom);
    if (filters.desk_access !== undefined) params.append('desk_access', filters.desk_access);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);
    
    const response = await fetch(
      `/api/method/techsavanna_pos.api.role_api.list_roles?${params.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    return result.message || result;
  } catch (error) {
    console.error('Error listing roles:', error);
    throw error;
  }
};

// Usage examples
const allRoles = await listRoles();
const stockRoles = await listRoles({ search: 'Stock' });
const customRoles = await listRoles({ is_custom: true, search: 'Manager' });
const paginatedRoles = await listRoles({ page: 1, page_size: 10 });
```

**Use Case: Check if role exists before creating**
```javascript
const checkRoleExists = async (roleName) => {
  const result = await listRoles({ search: roleName });
  return result.data.roles.some(role => 
    role.role_name.toLowerCase() === roleName.toLowerCase()
  );
};

// Before creating a role
const roleName = 'Stock Counter';
if (await checkRoleExists(roleName)) {
  alert('Role already exists!');
} else {
  await createRole(roleName);
}
```

---

### 1. List Doctypes

Lists all doctypes in the system with optional filtering and pagination.

**Endpoint:** `list_doctypes`  
**Method:** `GET`  
**URL:** `/api/method/techsavanna_pos.api.system_api.list_doctypes`  
**Authentication:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module` | string | No | Filter by module name (e.g., "Stock", "Buying", "Selling") |
| `is_submittable` | boolean | No | Filter by submittable status (true/false) |
| `is_custom` | boolean | No | Filter by custom doctypes (true/false) |
| `is_virtual` | boolean | No | Filter by virtual doctypes (true/false) |
| `search` | string | No | **Search in doctype name** (partial match, case-insensitive) |
| `page` | number | No | Page number (default: 1) |
| `page_size` | number | No | Items per page (default: 50, max: 200) |

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Doctypes retrieved successfully",
  "data": {
    "doctypes": [
      {
        "name": "Stock Entry",
        "module": "Stock",
        "is_submittable": 1,
        "custom": 0,
        "is_virtual": 0,
        "issingle": 0,
        "track_changes": 1,
        "allow_import": 1,
        "allow_export": 1,
        "icon": "fa fa-file-text",
        "permission_count": 4,
        "custom_permission_count": 0,
        "field_count": 45,
        "has_workflow": false,
        "role_count": 4,
        "creation": "2013-05-21 16:16:39",
        "modified": "2025-10-13 15:09:23.905118"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 50,
      "total": 150,
      "total_pages": 3
    },
    "filters_applied": {
      "module": "Stock",
      "is_submittable": true,
      "is_custom": null,
      "is_virtual": null,
      "search": null
    }
  }
}
```

#### Example

```javascript
const listDoctypes = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.module) params.append('module', filters.module);
    if (filters.is_submittable !== undefined) params.append('is_submittable', filters.is_submittable);
    if (filters.is_custom !== undefined) params.append('is_custom', filters.is_custom);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.page_size) params.append('page_size', filters.page_size);
    
    const response = await fetch(
      `/api/method/techsavanna_pos.api.system_api.list_doctypes?${params.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    return result.message || result;
  } catch (error) {
    console.error('Error listing doctypes:', error);
    throw error;
  }
};

// Usage examples
const stockDoctypes = await listDoctypes({ module: 'Stock' });
const submittableDoctypes = await listDoctypes({ is_submittable: true });

// Search examples
const searchResults = await listDoctypes({ search: 'Stock', page: 1, page_size: 20 });
const materialSearch = await listDoctypes({ search: 'Material' }); // Finds Material Request, Material Issue, etc.
const combinedSearch = await listDoctypes({ 
  module: 'Stock', 
  search: 'Entry',
  is_submittable: true 
}); // Combines filters with search
```

---

### 2. Get Doctype Details

Retrieves detailed information about a specific doctype, including permissions, roles, and workflow information.

**Endpoint:** `get_doctype_details`  
**Method:** `GET`  
**URL:** `/api/method/techsavanna_pos.api.system_api.get_doctype_details`  
**Authentication:** Required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctype` | string | Yes | Name of the doctype |

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Doctype details retrieved successfully",
  "data": {
    "name": "Stock Entry",
    "module": "Stock",
    "is_submittable": 1,
    "custom": 0,
    "is_virtual": 0,
    "issingle": 0,
    "track_changes": 1,
    "allow_import": 1,
    "allow_export": 1,
    "naming_rule": "By \"Naming Series\" field",
    "autoname": "naming_series:",
    "title_field": "stock_entry_type",
    "icon": "fa fa-file-text",
    "field_count": 45,
    "permissions": {
      "standard": [
        {
          "role": "Stock User",
          "permlevel": 0,
          "read": 1,
          "write": 1,
          "create": 1,
          "submit": 1,
          "delete": 1
        }
      ],
      "custom": [],
      "standard_count": 4,
      "custom_count": 0
    },
    "roles_with_permissions": [
      "Stock User",
      "Stock Manager",
      "Manufacturing User",
      "Manufacturing Manager"
    ],
    "role_count": 4,
    "workflow": null,
    "has_workflow": false,
    "child_table_count": 2,
    "creation": "2013-05-21 16:16:39",
    "modified": "2025-10-13 15:09:23.905118"
  }
}
```

#### Example

```javascript
const getDoctypeDetails = async (doctype) => {
  try {
    const response = await fetch(
      `/api/method/techsavanna_pos.api.system_api.get_doctype_details?doctype=${encodeURIComponent(doctype)}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    return result.message || result;
  } catch (error) {
    console.error('Error getting doctype details:', error);
    throw error;
  }
};

// Usage
const stockEntryDetails = await getDoctypeDetails('Stock Entry');
console.log('Roles with permissions:', stockEntryDetails.data.roles_with_permissions);
console.log('Has workflow:', stockEntryDetails.data.has_workflow);
```

---

### 3. List Modules

Lists all modules in the system with their doctype counts.

**Endpoint:** `list_modules`  
**Method:** `GET`  
**URL:** `/api/method/techsavanna_pos.api.system_api.list_modules`  
**Authentication:** Required

#### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Modules retrieved successfully",
  "data": {
    "modules": [
      {
        "name": "Stock",
        "module_name": "Stock",
        "app_name": "erpnext",
        "custom": 0,
        "doctype_count": 45
      },
      {
        "name": "Buying",
        "module_name": "Buying",
        "app_name": "erpnext",
        "custom": 0,
        "doctype_count": 12
      }
    ],
    "total": 25
  }
}
```

#### Example

```javascript
const listModules = async () => {
  try {
    const response = await fetch(
      '/api/method/techsavanna_pos.api.system_api.list_modules',
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    return result.message || result;
  } catch (error) {
    console.error('Error listing modules:', error);
    throw error;
  }
};

// Usage
const modules = await listModules();
console.log('Available modules:', modules.data.modules);
```

---

## React.js Examples

### Complete Role Creation Workflow

```javascript
import React, { useState, useEffect } from 'react';

const RoleCreationWizard = () => {
  const [step, setStep] = useState(1);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [doctypes, setDoctypes] = useState([]);
  const [selectedDoctypes, setSelectedDoctypes] = useState([]);
  const [doctypeDetails, setDoctypeDetails] = useState({});
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Load modules
  useEffect(() => {
    const loadModules = async () => {
      const result = await listModules();
      setModules(result.data.modules);
    };
    loadModules();
  }, []);

  // Step 2: Load doctypes when module selected
  useEffect(() => {
    if (selectedModule) {
      const loadDoctypes = async () => {
        setLoading(true);
        const result = await listDoctypes({ module: selectedModule });
        setDoctypes(result.data.doctypes);
        setLoading(false);
      };
      loadDoctypes();
    }
  }, [selectedModule]);

  // Step 3: Load doctype details when selected
  const handleDoctypeSelect = async (doctype) => {
    if (!selectedDoctypes.includes(doctype)) {
      setLoading(true);
      const details = await getDoctypeDetails(doctype);
      setDoctypeDetails(prev => ({
        ...prev,
        [doctype]: details.data
      }));
      setSelectedDoctypes([...selectedDoctypes, doctype]);
      setLoading(false);
    }
  };

  // Step 4: Create role and assign permissions
  const handleCreateRole = async () => {
    setLoading(true);
    try {
      // Create role
      const roleResult = await createRole(roleName);
      
      // Assign permissions for each selected doctype
      for (const doctype of selectedDoctypes) {
        const details = doctypeDetails[doctype];
        // Use existing permissions as template or set custom ones
        await assignPermissionsToRole(roleName, doctype, {
          read: 1,
          write: 1,
          create: 1,
          submit: details.is_submittable ? 1 : 0,
          delete: 1
        });
      }
      
      alert('Role created successfully!');
      setStep(1);
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-creation-wizard">
      {step === 1 && (
        <div>
          <h2>Step 1: Select Module</h2>
          <select 
            value={selectedModule} 
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setStep(2);
            }}
          >
            <option value="">Select a module...</option>
            {modules.map(module => (
              <option key={module.name} value={module.name}>
                {module.module_name} ({module.doctype_count} doctypes)
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Step 2: Select Doctypes</h2>
          <button onClick={() => setStep(1)}>Back</button>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              {doctypes.map(doctype => (
                <div key={doctype.name}>
                  <input
                    type="checkbox"
                    checked={selectedDoctypes.includes(doctype.name)}
                    onChange={() => handleDoctypeSelect(doctype.name)}
                  />
                  <label>
                    {doctype.name}
                    {doctype.is_submittable && <span> (Submittable)</span>}
                    {doctype.permission_count > 0 && (
                      <span> - {doctype.permission_count} roles have permissions</span>
                    )}
                  </label>
                </div>
              ))}
              <button onClick={() => setStep(3)}>Next</button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Step 3: Configure Role</h2>
          <button onClick={() => setStep(2)}>Back</button>
          <div>
            <label>Role Name:</label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Stock Counter"
            />
          </div>
          <div>
            <h3>Selected Doctypes:</h3>
            <ul>
              {selectedDoctypes.map(doctype => (
                <li key={doctype}>
                  {doctype}
                  {doctypeDetails[doctype] && (
                    <span> - {doctypeDetails[doctype].role_count} roles have permissions</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={handleCreateRole} disabled={loading || !roleName}>
            {loading ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      )}
    </div>
  );
};
```

### Doctype Explorer Component with Search

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash'; // or implement your own debounce

const DoctypeExplorer = () => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [doctypes, setDoctypes] = useState([]);
  const [selectedDoctype, setSelectedDoctype] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    is_submittable: null,
    is_custom: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });

  useEffect(() => {
    const loadModules = async () => {
      const result = await listModules();
      setModules(result.data.modules);
    };
    loadModules();
  }, []);

  // Debounced search function (300ms delay)
  const debouncedSearch = useCallback(
    debounce(async (search, module, filters, page) => {
      setLoading(true);
      try {
        const params = {
          page,
          page_size: pagination.page_size
        };
        
        if (search) params.search = search;
        if (module) params.module = module;
        if (filters.is_submittable !== null) params.is_submittable = filters.is_submittable;
        if (filters.is_custom !== null) params.is_custom = filters.is_custom;
        
        const result = await listDoctypes(params);
        setDoctypes(result.data.doctypes);
        setPagination(result.data.pagination);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [pagination.page_size]
  );

  // Trigger search when search term, module, or filters change
  useEffect(() => {
    debouncedSearch(searchTerm, selectedModule, filters, pagination.page);
  }, [searchTerm, selectedModule, filters, pagination.page, debouncedSearch]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on new search
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleDoctypeClick = async (doctype) => {
    setLoading(true);
    const result = await getDoctypeDetails(doctype);
    setDetails(result.data);
    setSelectedDoctype(doctype);
    setLoading(false);
  };

  return (
    <div className="doctype-explorer">
      <div className="sidebar">
        <h3>Modules</h3>
        <ul>
          {modules.map(module => (
            <li
              key={module.name}
              onClick={() => setSelectedModule(module.name)}
              className={selectedModule === module.name ? 'active' : ''}
            >
              {module.module_name} ({module.doctype_count})
            </li>
          ))}
        </ul>
      </div>

      <div className="main-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search doctypes..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <div className="filters">
            <label>
              <input
                type="checkbox"
                checked={filters.is_submittable === true}
                onChange={(e) => handleFilterChange('is_submittable', e.target.checked ? true : null)}
              />
              Submittable
            </label>
            <label>
              <input
                type="checkbox"
                checked={filters.is_custom === true}
                onChange={(e) => handleFilterChange('is_custom', e.target.checked ? true : null)}
              />
              Custom
            </label>
          </div>
          {searchTerm && (
            <button onClick={() => handleSearchChange('')}>Clear Search</button>
          )}
        </div>

        {pagination.total > 0 && (
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.page_size) + 1} - {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} results
            {searchTerm && ` for "${searchTerm}"`}
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : doctypes.length === 0 ? (
          <p>No doctypes found{searchTerm && ` matching "${searchTerm}"`}</p>
        ) : (
          <>
            <div className="doctype-list">
              {doctypes.map(doctype => (
                <div
                  key={doctype.name}
                  className="doctype-card"
                  onClick={() => handleDoctypeClick(doctype.name)}
                >
                  <h4>{doctype.name}</h4>
                  <p>Module: {doctype.module}</p>
                  {doctype.is_submittable && <span className="badge">Submittable</span>}
                  {doctype.custom && <span className="badge">Custom</span>}
                  <p>Permissions: {doctype.permission_count} roles</p>
                </div>
              ))}
            </div>
            
            {pagination.total_pages > 1 && (
              <div className="pagination-controls">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  disabled={pagination.page === pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {details && (
          <div className="doctype-details">
            <h3>{details.name}</h3>
            <div>
              <h4>Permissions</h4>
              <p>Standard: {details.permissions.standard_count}</p>
              <p>Custom: {details.permissions.custom_count}</p>
              <h4>Roles with Permissions</h4>
              <ul>
                {details.roles_with_permissions.map(role => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## TypeScript Types

```typescript
// types/system.ts

export interface Doctype {
  name: string;
  module: string;
  is_submittable: number;
  custom: number;
  is_virtual: number;
  issingle: number;
  track_changes: number;
  allow_import: number;
  allow_export: number;
  icon: string;
  permission_count: number;
  custom_permission_count: number;
  field_count: number;
  has_workflow: boolean;
  role_count: number;
  creation: string;
  modified: string;
}

export interface DoctypeListResponse {
  success: boolean;
  message: string;
  data: {
    doctypes: Doctype[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
    filters_applied: {
      module?: string;
      is_submittable?: boolean;
      is_custom?: boolean;
      is_virtual?: boolean;
      search?: string;
    };
  };
}

export interface DoctypePermission {
  role: string;
  permlevel: number;
  read: number;
  write: number;
  create: number;
  submit: number;
  delete: number;
}

export interface DoctypeDetails {
  name: string;
  module: string;
  is_submittable: number;
  custom: number;
  is_virtual: number;
  issingle: number;
  track_changes: number;
  allow_import: number;
  allow_export: number;
  naming_rule: string;
  autoname: string;
  title_field: string;
  icon: string;
  field_count: number;
  permissions: {
    standard: DoctypePermission[];
    custom: DoctypePermission[];
    standard_count: number;
    custom_count: number;
  };
  roles_with_permissions: string[];
  role_count: number;
  workflow: {
    name: string;
    workflow_state_field: string;
  } | null;
  has_workflow: boolean;
  child_table_count: number;
  creation: string;
  modified: string;
  modified_by: string;
}

export interface DoctypeDetailsResponse {
  success: boolean;
  message: string;
  data: DoctypeDetails;
}

export interface Module {
  name: string;
  module_name: string;
  app_name: string;
  custom: number;
  doctype_count: number;
}

export interface ModulesResponse {
  success: boolean;
  message: string;
  data: {
    modules: Module[];
    total: number;
  };
}

export interface ListDoctypesFilters {
  module?: string;
  is_submittable?: boolean;
  is_custom?: boolean;
  is_virtual?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface Role {
  name: string;
  role_name: string;
  disabled: number;
  is_custom: number;
  desk_access: number;
  two_factor_auth: number;
  restrict_to_domain: string | null;
  home_page: string | null;
  user_count: number;
}

export interface RoleListResponse {
  success: boolean;
  data: {
    roles: Role[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
    filters_applied: {
      disabled?: boolean;
      is_custom?: boolean;
      desk_access?: boolean;
      restrict_to_domain?: string;
      search?: string;
    };
  };
}

export interface ListRolesFilters {
  disabled?: boolean;
  is_custom?: boolean;
  desk_access?: boolean;
  restrict_to_domain?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
```

---

## Integration with Role Creation

### Complete Workflow Example

```typescript
// Complete role creation with doctype discovery
const createRoleWithPermissions = async (
  roleName: string,
  moduleName: string,
  permissionTemplate: Record<string, any>
) => {
  // Step 1: Get all doctypes in the module
  const doctypesResult = await listDoctypes({ module: moduleName });
  const doctypes = doctypesResult.data.doctypes;

  // Step 2: Filter relevant doctypes (e.g., only submittable)
  const relevantDoctypes = doctypes.filter(dt => dt.is_submittable);

  // Step 3: Get details for each doctype to understand permissions
  const doctypeDetailsPromises = relevantDoctypes.map(dt => 
    getDoctypeDetails(dt.name)
  );
  const detailsResults = await Promise.all(doctypeDetailsPromises);

  // Step 4: Create the role
  const roleResult = await createRole(roleName, {
    desk_access: true,
    is_custom: true
  });

  // Step 5: Assign permissions based on template
  const permissionPromises = relevantDoctypes.map(async (doctype, index) => {
    const details = detailsResults[index].data;
    
    // Use template or default permissions
    const permissions = {
      read: 1,
      write: permissionTemplate.write || 0,
      create: permissionTemplate.create || 0,
      submit: doctype.is_submittable && permissionTemplate.submit ? 1 : 0,
      delete: permissionTemplate.delete || 0,
      ...permissionTemplate
    };

    return assignPermissionsToRole(roleName, doctype.name, permissions);
  });

  await Promise.all(permissionPromises);

  return {
    role: roleResult.data,
    doctypes: relevantDoctypes.map(dt => dt.name),
    permissionsAssigned: relevantDoctypes.length
  };
};

// Usage
const result = await createRoleWithPermissions(
  'Stock Counter',
  'Stock',
  {
    write: 1,
    create: 1,
    submit: 0, // No submit permission
    delete: 1
  }
);
```

### Permission Analysis Helper

```typescript
// Analyze existing permissions to understand patterns
const analyzeDoctypePermissions = async (doctype: string) => {
  const details = await getDoctypeDetails(doctype);
  
  // Group permissions by type
  const permissionAnalysis = {
    read: details.data.permissions.standard.filter(p => p.read).length,
    write: details.data.permissions.standard.filter(p => p.write).length,
    create: details.data.permissions.standard.filter(p => p.create).length,
    submit: details.data.permissions.standard.filter(p => p.submit).length,
    delete: details.data.permissions.standard.filter(p => p.delete).length,
    roles: details.data.roles_with_permissions
  };

  return {
    doctype: doctype,
    analysis: permissionAnalysis,
    recommendation: {
      // Recommend permissions based on common patterns
      read: permissionAnalysis.read > 0,
      write: permissionAnalysis.write > permissionAnalysis.read * 0.5,
      create: permissionAnalysis.create > permissionAnalysis.read * 0.3,
      submit: details.data.is_submittable && permissionAnalysis.submit > 0
    }
  };
};
```

---

## Error Handling

### Error Response Format

All endpoints return errors in a consistent format:

```typescript
{
  success: false;
  message: string;  // Human-readable error message
}
```

### Common HTTP Status Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 401 | Unauthorized | Not authenticated (guest access) |
| 404 | Not Found | DocType doesn't exist |
| 500 | Internal Server Error | Unexpected server error |

### Error Handling Example

```javascript
const handleApiError = (response, result) => {
  if (!response.ok) {
    switch (response.status) {
      case 401:
        throw new Error('Authentication required');
      case 404:
        throw new Error(result.message || 'Resource not found');
      default:
        throw new Error(result.message || 'Server error');
    }
  }
  
  if (result.success === false) {
    throw new Error(result.message || 'Request failed');
  }
  
  return result;
};

// Usage
try {
  const result = await listDoctypes({ module: 'Stock' });
  const validated = handleApiError(response, result);
  // Use validated.data
} catch (error) {
  console.error('Error:', error.message);
  // Show user-friendly error message
}
```

---

## Best Practices

1. **Cache Results**: Doctype lists don't change frequently - cache them client-side
2. **Pagination**: Use pagination for large lists (default 50 items)
3. **Lazy Loading**: Load doctype details only when needed
4. **Error Handling**: Always handle errors gracefully
5. **Loading States**: Show loading indicators during API calls
6. **Search Optimization**: 
   - **Debounce search inputs** to avoid excessive API calls (recommended: 300-500ms delay)
   - Combine search with filters for better results
   - Show search results count to users
   - Clear search to reset to full list

---

## Search Implementation Guide

### Debounced Search Pattern

For optimal performance, implement debounced search:

```javascript
import { useMemo, useState, useEffect } from 'react';
import { debounce } from 'lodash'; // or use a custom debounce

const useDebouncedSearch = (searchFunction, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce(async (term) => {
      if (term) {
        setLoading(true);
        try {
          const data = await searchFunction(term);
          setResults(data);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, delay),
    [searchFunction, delay]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, debouncedSearch]);

  return { searchTerm, setSearchTerm, results, loading };
};

// Usage
const DoctypeSearch = () => {
  const { searchTerm, setSearchTerm, results, loading } = useDebouncedSearch(
    async (term) => {
      const result = await listDoctypes({ search: term });
      return result.data.doctypes;
    },
    300
  );

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search doctypes..."
      />
      {loading && <span>Searching...</span>}
      {results.map(dt => <div key={dt.name}>{dt.name}</div>)}
    </div>
  );
};
```

### Combined Search and Filters

```javascript
const useAdvancedSearch = () => {
  const [filters, setFilters] = useState({
    module: '',
    is_submittable: null,
    search: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });
      
      const result = await listDoctypes(params);
      setResults(result.data.doctypes);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce the search
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 300),
    [filters]
  );

  useEffect(() => {
    debouncedSearch();
    return () => debouncedSearch.cancel();
  }, [filters, debouncedSearch]);

  return { filters, setFilters, results, loading };
};
```

## Integration Checklist

When integrating these APIs with role creation:

- [ ] Load modules on component mount
- [ ] Allow users to filter doctypes by module
- [ ] **Implement debounced search** for doctypes and roles
- [ ] Show doctype metadata (submittable, custom, etc.)
- [ ] Display existing permissions for reference
- [ ] **Check if role exists** using `list_roles` with search before creating
- [ ] Allow selection of multiple doctypes
- [ ] Show permission recommendations based on doctype type
- [ ] Validate role name before creation
- [ ] Handle errors gracefully
- [ ] Provide feedback on successful role creation
- [ ] **Show search results count** and pagination controls

---

**Last Updated:** January 2025  
**API Version:** 1.0  
**Module:** techsavanna_pos.api.system_api

