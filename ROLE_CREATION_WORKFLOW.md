# Role Creation Workflow Guide

Quick reference guide showing how to use System APIs in the role creation process.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│              ROLE CREATION WORKFLOW                     │
└─────────────────────────────────────────────────────────────┘

    Step 1: Discover Available Doctypes
    ┌─────────────────────────────────────┐
    │ list_modules()                      │
    │ → Get all modules                   │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ list_doctypes(module="Stock")       │
    │ → Get doctypes in module            │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    Step 2: Understand Permission Structure
    ┌─────────────────────────────────────┐
    │ get_doctype_details("Stock Entry")   │
    │ → See existing permissions          │
    │ → Understand permission patterns     │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    Step 3: Create Role
    ┌─────────────────────────────────────┐
    │ create_role("Stock Counter")        │
    │ → Create the role                  │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    Step 4: Assign Permissions
    ┌─────────────────────────────────────┐
    │ assign_permissions_to_role(         │
    │   "Stock Counter",                  │
    │   "Stock Entry",                    │
    │   { read: 1, write: 1, ... }        │
    │ )                                   │
    │ → Assign permissions                │
    └─────────────────────────────────────┘
```

## API Usage by Scenario

### Scenario 1: Create "Stock Counter" Role

```javascript
// 1. Find Stock-related doctypes
const stockDoctypes = await listDoctypes({ 
  module: 'Stock',
  is_submittable: true 
});

// 2. Get details for Stock Reconciliation
const stockReconDetails = await getDoctypeDetails('Stock Reconciliation');

// 3. Create role
const role = await createRole('Stock Counter', {
  desk_access: true,
  is_custom: true
});

// 4. Assign permissions (Level 1 from analysis)
await assignPermissionsToRole('Stock Counter', 'Stock Reconciliation', {
  read: 1,
  write: 1,
  create: 1,
  submit: 0,  // Cannot submit
  delete: 1
});
```

### Scenario 2: Create "Transfer Requester" Role

```javascript
// 1. Search for Material Request
const materialRequests = await listDoctypes({ 
  search: 'Material Request' 
});

// 2. Get details
const mrDetails = await getDoctypeDetails('Material Request');

// 3. Check existing permissions pattern
console.log('Roles with permissions:', mrDetails.data.roles_with_permissions);
// Output: ["Purchase Manager", "Stock Manager", "Stock User", "Purchase User"]

// 4. Create role
const role = await createRole('Transfer Requester', {
  desk_access: true,
  is_custom: true
});

// 5. Assign permissions (Level 1 from analysis)
await assignPermissionsToRole('Transfer Requester', 'Material Request', {
  read: 1,
  write: 1,
  create: 1,
  submit: 1,  // Can submit requests
  delete: 1
});
```

### Scenario 3: Create "Transfer Approver" Role

```javascript
// 1. Get Material Request details
const mrDetails = await getDoctypeDetails('Material Request');

// 2. Analyze permission patterns
const hasSubmitPermission = mrDetails.data.permissions.standard.some(
  p => p.submit === 1
);

// 3. Create role
const role = await createRole('Transfer Approver', {
  desk_access: true,
  is_custom: true
});

// 4. Assign permissions (Level 2 from analysis)
await assignPermissionsToRole('Transfer Approver', 'Material Request', {
  read: 1,
  write: 1,
  create: 1,
  submit: 1,
  cancel: 1,
  delete: 1
});
```

### Scenario 4: Create "Dispatcher" Role

```javascript
// 1. Find Stock Entry doctype
const stockEntries = await listDoctypes({ 
  search: 'Stock Entry' 
});

// 2. Get details
const seDetails = await getDoctypeDetails('Stock Entry');

// 3. Create role
const role = await createRole('Dispatcher', {
  desk_access: true,
  is_custom: true
});

// 4. Assign permissions (Level 3 from analysis)
await assignPermissionsToRole('Dispatcher', 'Stock Entry', {
  read: 1,
  write: 1,
  create: 1,
  submit: 1,  // Can submit dispatch entries
  delete: 1
});

// Also need Material Request read/write for updating dispatched quantities
await assignPermissionsToRole('Dispatcher', 'Material Request', {
  read: 1,
  write: 1,
  create: 0,
  submit: 0,
  delete: 0
});
```

## Permission Level Mapping

Based on the Stock Operations Permissions Analysis:

| Permission Level | System API Usage | Role API Usage |
|-----------------|------------------|----------------|
| **Level 1 (Counter/Requester)** | `list_doctypes(module="Stock")` → Find doctypes | `create_role()` → `assign_permissions_to_role()` with limited permissions |
| **Level 2 (Verifier/Approver)** | `get_doctype_details()` → Check existing permissions | `assign_permissions_to_role()` with approval permissions |
| **Level 3 (Dispatcher)** | `list_doctypes(search="Stock Entry")` → Find Stock Entry | `assign_permissions_to_role()` with submit permission |
| **Level 4 (Receiver)** | `get_doctype_details("Stock Entry")` → Understand structure | `assign_permissions_to_role()` with submit permission |
| **Level 5 (Manager)** | `list_doctypes()` → Get all relevant doctypes | `assign_permissions_to_role()` with full permissions |

## Quick Reference: API Endpoints

### System APIs (Discovery)
- `list_modules()` - Get all modules
- `list_doctypes(filters)` - Find doctypes with search
- `get_doctype_details(doctype)` - Get permission details

### Role APIs (Creation & Management)
- `list_roles(filters, search, page, page_size)` - List roles with search and pagination
- `create_role(name, options)` - Create role
- `assign_permissions_to_role(role, doctype, permissions)` - Assign permissions
- `get_role_permissions(role, doctype?)` - View assigned permissions

## Common Patterns

### Pattern 1: Discover and Create
```javascript
// Discover → Analyze → Create → Assign
const modules = await listModules();
const doctypes = await listDoctypes({ module: 'Stock' });
const details = await getDoctypeDetails('Stock Entry');
const role = await createRole('New Role');
await assignPermissionsToRole('New Role', 'Stock Entry', {...});
```

### Pattern 2: Permission Template
```javascript
// Use existing permissions as template
const details = await getDoctypeDetails('Stock Entry');
const template = details.data.permissions.standard[0]; // Use first role as template
const role = await createRole('Similar Role');
await assignPermissionsToRole('Similar Role', 'Stock Entry', {
  read: template.read,
  write: template.write,
  // ... modify as needed
});
```

### Pattern 3: Bulk Permission Assignment
```javascript
// Assign permissions to multiple doctypes
const doctypes = ['Stock Entry', 'Stock Reconciliation', 'Material Request'];
const role = await createRole('Stock Manager');

for (const doctype of doctypes) {
  await assignPermissionsToRole(role.data.name, doctype, {
    read: 1,
    write: 1,
    create: 1,
    submit: 1,
    delete: 1
  });
}
```

## Search Functionality

### Searching Doctypes

The `list_doctypes` endpoint supports search functionality:

```javascript
// Search for doctypes containing "Stock"
const results = await listDoctypes({ 
  search: 'Stock',
  page: 1,
  page_size: 20
});

// Combined search with filters
const submittableStock = await listDoctypes({
  module: 'Stock',
  search: 'Entry',
  is_submittable: true
});
```

**Search Tips:**
- Search is case-insensitive and supports partial matching
- Can be combined with other filters (module, is_submittable, etc.)
- Use debouncing (300-500ms) to avoid excessive API calls
- Clear search to show full list

### Searching Roles

The `list_roles` endpoint supports search functionality:

```javascript
// Search for roles containing "Stock"
const stockRoles = await listRoles({ 
  search: 'Stock',
  page: 1,
  page_size: 20
});

// Search with filters
const customStockRoles = await listRoles({
  search: 'Stock',
  is_custom: true,
  disabled: false
});
```

**Example: Find existing roles before creating**
```javascript
// Check if role name already exists
const existingRoles = await listRoles({ search: 'Stock Counter' });
if (existingRoles.data.roles.length > 0) {
  console.log('Role already exists:', existingRoles.data.roles[0]);
  // Show warning to user
} else {
  // Safe to create new role
  await createRole('Stock Counter');
}
```

## Integration Tips

1. **Use System APIs First**: Always discover doctypes before creating roles
2. **Check Existing Permissions**: Use `get_doctype_details` to understand permission patterns
3. **Follow Permission Levels**: Reference the Stock Operations Permissions Analysis for guidance
4. **Validate Before Creating**: Use `list_roles` with search to check if role already exists
5. **Provide User Feedback**: Show which doctypes will have permissions assigned
6. **Use Search Effectively**: Implement debounced search for better UX

## Example: Complete Role Creation Component

```javascript
const CreateRoleWithDoctypes = () => {
  const [modules, setModules] = useState([]);
  const [doctypes, setDoctypes] = useState([]);
  const [selectedDoctypes, setSelectedDoctypes] = useState([]);
  const [roleName, setRoleName] = useState('');

  // Load modules on mount
  useEffect(() => {
    listModules().then(result => setModules(result.data.modules));
  }, []);

  // Load doctypes when module selected
  const handleModuleSelect = async (moduleName) => {
    const result = await listDoctypes({ module: moduleName });
    setDoctypes(result.data.doctypes);
  };

  // Create role with selected doctypes
  const handleCreate = async () => {
    // Create role
    const role = await createRole(roleName);
    
    // Assign permissions to each selected doctype
    for (const doctype of selectedDoctypes) {
      const details = await getDoctypeDetails(doctype);
      
      // Determine permissions based on doctype type
      const permissions = {
        read: 1,
        write: 1,
        create: 1,
        submit: details.data.is_submittable ? 1 : 0,
        delete: 1
      };
      
      await assignPermissionsToRole(role.data.name, doctype, permissions);
    }
    
    alert('Role created successfully!');
  };

  return (
    <div>
      {/* Module selection */}
      <select onChange={(e) => handleModuleSelect(e.target.value)}>
        {modules.map(m => <option key={m.name} value={m.name}>{m.module_name}</option>)}
      </select>
      
      {/* Doctype selection */}
      {doctypes.map(dt => (
        <div key={dt.name}>
          <input
            type="checkbox"
            checked={selectedDoctypes.includes(dt.name)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedDoctypes([...selectedDoctypes, dt.name]);
              } else {
                setSelectedDoctypes(selectedDoctypes.filter(d => d !== dt.name));
              }
            }}
          />
          <label>{dt.name} {dt.is_submittable && '(Submittable)'}</label>
        </div>
      ))}
      
      {/* Role name */}
      <input
        type="text"
        value={roleName}
        onChange={(e) => setRoleName(e.target.value)}
        placeholder="Role name"
      />
      
      <button onClick={handleCreate}>Create Role</button>
    </div>
  );
};
```

---

**See Also:**
- [System API Documentation](./SYSTEM_API_DOCUMENTATION.md) - Complete API reference
- [Stock Operations Permissions Analysis](../../../../STOCK_OPERATIONS_PERMISSIONS_ANALYSIS.md) - Permission level guidance
- [Role API Documentation](../role_api.py) - Role creation endpoints

