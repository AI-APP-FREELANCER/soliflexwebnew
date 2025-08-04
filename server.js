const express = require('express');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());

const EXCEL_FILE = 'backend.xlsx';

const ORDER_STAGE_FLOW = [
  // Order approval
  { name: 'Order Approved', role: 'admin', status: 'completed' },
  
  // Source factory - Gate Security
  { name: 'Vehicle Entry Approved (Source)', role: 'security', status: 'pending' },
  
  // Source factory - Stores Team
  { name: 'Consignment Verification (Source)', role: 'stores', status: 'pending' },
  
  // Source factory - Gate Security (Exit)
  { name: 'Vehicle Exit (Source)', role: 'security', status: 'pending' },
  
  // Destination factory - Gate Security
  { name: 'Vehicle Entry (Destination)', role: 'security', status: 'pending' },
  
  // Destination factory - Stores Team
  { name: 'Consignment Verification (Destination)', role: 'stores', status: 'pending' },
  
  // Destination factory - Gate Security (Exit)
  { name: 'Vehicle Exit (Destination)', role: 'security', status: 'pending' }
];

// Helper to load workbook
function loadWorkbook() {
  try {
    // Force a fresh read by clearing any potential cache
    const fs = require('fs');
    const stats = fs.statSync(EXCEL_FILE);
    console.log('Excel file stats:', {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime
    });
    
    const workbook = XLSX.readFile(EXCEL_FILE);
    console.log('Workbook loaded successfully. Available sheets:', Object.keys(workbook.Sheets));
    return workbook;
  } catch (error) {
    console.error('Error loading workbook:', error);
    throw error;
  }
}

// Helper to save workbook
function saveWorkbook(wb) {
  XLSX.writeFile(wb, EXCEL_FILE);
}

// Get departments
app.get('/api/departments', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['department_table'];
  const departments = XLSX.utils.sheet_to_json(ws);
  res.json(departments);
});

// Get department by ID
app.get('/api/departments/:id', (req, res) => {
  const { id } = req.params;
  const wb = loadWorkbook();
  const ws = wb.Sheets['department_table'];
  const departments = XLSX.utils.sheet_to_json(ws);
  const department = departments.find(d => String(d.id) === String(id));
  
  if (!department) {
    return res.status(404).json({ error: 'Department not found' });
  }
  
  res.json(department);
});

// Helper to get role from department_id
function getRoleFromDepartment(department_id) {
  const purchaseTeamDepartments = [
    'Accounts Team',
    'Stores IAF Unit-1/ Soliflex unit-1',
    'Stores Unit-IV/ soliflex unit-II',
    'Soliflex Unit-III',
    'Fabric IAF unit- 1 / Soliflex unit-1',
    'Fabric Unit-IV/ Soliflex unit-II',
    'Fabric Solifelx unit-III'
  ];
  const adminDepartment = 'Admin';
  const wb = loadWorkbook();
  const ws = wb.Sheets['department_table'];
  const departments = XLSX.utils.sheet_to_json(ws);
  const dep = departments.find(d => String(d.id) === String(department_id));
  if (!dep) return 'user';
  if (dep.department_name === adminDepartment) return 'admin';
  if (purchaseTeamDepartments.includes(dep.department_name)) return 'purchase_team';
  
  // Handle security departments
  if (dep.department_name.toLowerCase().includes('security')) {
    return 'security';
  }
  
  // Handle stores departments
  if (dep.department_name.toLowerCase().includes('stores')) {
    return 'stores';
  }
  
  // fallback: department name as role (lowercase, underscores)
  return dep.department_name.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_');
}

// Register user (role auto-assigned)
app.post('/api/register', (req, res) => {
  const { employee_name, password, department_id } = req.body;
  if (!employee_name || !password || !department_id) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 alphanumeric characters' });
  }

  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);

  if (users.some(u => u.employee_name === employee_name && u.department_id == department_id)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const password_hash = bcrypt.hashSync(password, 8);
  const userRole = getRoleFromDepartment(department_id);

  users.push({ id, employee_name, password_hash, department_id: Number(department_id), role: userRole });

  const newWs = XLSX.utils.json_to_sheet(users, { header: ['id', 'employee_name', 'password_hash', 'department_id', 'role'] });
  wb.Sheets['user_details'] = newWs;
  saveWorkbook(wb);

  res.json({ success: true });
});

// Login user
app.post('/api/login', (req, res) => {
  const { employee_name, password, department_id } = req.body;
  if (!employee_name || !password || !department_id) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);

  const user = users.find(u => u.employee_name === employee_name && u.department_id == department_id);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ success: true, employee_name, department_id, role: user.role, id: user.id });
});

// Middleware for admin check
function isAdmin(req, res, next) {
  const { user_id } = req.body;
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const user = users.find(u => u.id == user_id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  next();
}

// Middleware for purchase or admin check
function isPurchaseOrAdmin(req, res, next) {
  console.log('=== isPurchaseOrAdmin middleware ===');
  console.log('Request body:', req.body);
  console.log('user_id from body:', req.body.user_id);
  
  const { user_id } = req.body;
  if (!user_id) {
    console.log('No user_id provided in request body');
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const user = users.find(u => u.id == user_id);
  
  console.log('Found user:', user);
  
  if (!user || (user.role !== 'admin' && user.role !== 'purchase' && user.role !== 'purchase_team')) {
    console.log('User not found or not authorized. User:', user);
    return res.status(403).json({ error: 'Not authorized to place orders' });
  }
  req.user = user;
  console.log('User authorized, proceeding to endpoint');
  next();
}

// Create new order (RFQ)
app.post('/api/orders', isPurchaseOrAdmin, (req, res) => {
  try {
    console.log('=== /api/orders endpoint called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
  
  const { 
    material_type, 
    material_weight, 
    weight_unit, 
    invoice_amount, 
    sgst, 
    cgst, 
    tariff_hsn,
    vehicle_height,
    vehicle_height_option,
    toll,
    halting_days,
    halting_charge,
    extra_point_pickup,
    po_rate,
    actual_payable,
    debit_note,
    transport_type, 
    source_factory, 
    dest_factories,
    trip_stages,
    trucks,
    manual_trucks,
    use_manual_trucks,
    eta_time_unit,
    eta_value
  } = req.body;
  
  // Validate based on transport type
  console.log('Transport type:', transport_type);
  console.log('Trip stages:', trip_stages);
  
  if (transport_type === 'multiple') {
    // For multiple trips, validate each stage
    if (!trip_stages || trip_stages.length === 0) {
      console.log('Validation failed: No trip stages');
      return res.status(400).json({ error: 'At least one trip stage is required' });
    }
    
    for (let i = 0; i < trip_stages.length; i++) {
      const stage = trip_stages[i];
      console.log(`Stage ${i + 1}:`, stage);
      if (!stage.materialType || !stage.materialWeight || !stage.selectedCategories || stage.selectedCategories.length === 0) {
        console.log(`Validation failed for stage ${i + 1}:`, { materialType: stage.materialType, materialWeight: stage.materialWeight, selectedCategories: stage.selectedCategories });
        return res.status(400).json({ error: `Stage ${i + 1}: Material type, weight, and at least one category are required fields` });
      }
    }
    console.log('Multiple trip validation passed');
  } else {
    // For single trip, validate top-level fields
    console.log('Single trip validation - fields:', { material_type, material_weight, weight_unit });
    if (!material_type || !material_weight || !weight_unit) {
      console.log('Validation failed: Missing required fields for single trip');
      return res.status(400).json({ error: 'Material type, weight, and unit are required fields' });
    }
    console.log('Single trip validation passed');
  }

  console.log('Loading workbook...');
  const wb = loadWorkbook();
  console.log('Workbook loaded successfully');
  
  const ws = wb.Sheets['order_details'];
  console.log('Order details sheet found:', !!ws);
  
  let orders = XLSX.utils.sheet_to_json(ws);
  console.log('Current orders count:', orders.length);
  
  const id = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const order_number = `RFQ_ID#${(id).toString().padStart(4, '0')}`;
  const created_by = req.user.id;
  const created_at = new Date().toISOString();
  
  console.log('Generated order details:', { id, order_number, created_by, created_at });

  // Handle truck assignment
  let assignedTrucks = [];
  if (use_manual_trucks && manual_trucks) {
    // Manual truck entry
    assignedTrucks = manual_trucks.split(',').map(t => t.trim()).filter(t => t);
  } else if (trucks && trucks.length > 0) {
    // Automatic truck assignment
    assignedTrucks = trucks;
    
    // Update truck status to busy in truck_details sheet
    const truckWs = wb.Sheets['truck_details'];
    if (truckWs) {
      let truckDetails = XLSX.utils.sheet_to_json(truckWs);
      truckDetails = truckDetails.map(truck => {
        if (assignedTrucks.includes(truck.vehicle_number)) {
          return { ...truck, is_busy: true, current_order: order_number };
        }
        return truck;
      });
      const newTruckWs = XLSX.utils.json_to_sheet(truckDetails, { header: Object.keys(truckDetails[0]) });
      wb.Sheets['truck_details'] = newTruckWs;
    }
  }

  // Generate dynamic approval stages for each truck
  let allStages = [];
  
  if (transport_type === 'single') {
    // For single trip, each truck gets the same stages
    assignedTrucks.forEach(truckNumber => {
      const truckStages = [
        { name: 'Order Approved', role: 'admin', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Vehicle Entry Approved (${source_factory})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Consignment Verification (${source_factory})`, role: 'stores', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Vehicle Exit (${source_factory})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Vehicle Entry (${dest_factories[0]})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Consignment Verification (${dest_factories[0]})`, role: 'stores', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber },
        { name: `Vehicle Exit (${dest_factories[0]})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber }
      ];
      allStages.push(...truckStages);
    });
  } else if (transport_type === 'multiple') {
    // For multiple trips: Order Approved happens only once per order, but vehicle/consignment stages happen for each trip
    // First, add Order Approved stage once for each truck
    assignedTrucks.forEach(truckNumber => {
      allStages.push({
        name: 'Order Approved', 
        role: 'admin', 
        status: 'pending', 
        approver: null, 
        timestamp: null, 
        comments: null, 
        action: null, 
        truck_number: truckNumber
      });
    });
    
    // Then add vehicle entry/exit and consignment verification for each trip stage
    assignedTrucks.forEach(truckNumber => {
      trip_stages.forEach((stage, stageIndex) => {
        const truckStages = [
          { name: `Vehicle Entry Approved (${stage.source})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence },
          { name: `Consignment Verification (${stage.source})`, role: 'stores', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence },
          { name: `Vehicle Exit (${stage.source})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence },
          { name: `Vehicle Entry (${stage.destination})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence },
          { name: `Consignment Verification (${stage.destination})`, role: 'stores', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence },
          { name: `Vehicle Exit (${stage.destination})`, role: 'security', status: 'pending', approver: null, timestamp: null, comments: null, action: null, truck_number: truckNumber, stage_id: stage.id, stage_sequence: stage.sequence }
        ];
        allStages.push(...truckStages);
      });
    });
  }

  orders.push({ 
    id, 
    order_number, 
    material_type, 
    material_weight, 
    weight_unit, 
    invoice_amount, 
    sgst, 
    cgst, 
    tariff_hsn,
    vehicle_height,
    vehicle_height_option,
    toll,
    halting_days,
    halting_charge,
    extra_point_pickup,
    po_rate,
    actual_payable,
    debit_note,
    created_by, 
    created_at,
    stages: JSON.stringify(allStages),
    status: 'open',
    trucks: assignedTrucks.join(','),
    transport_type,
    source_factory,
    dest_factories: dest_factories ? dest_factories.join(',') : '',
    trip_stages: trip_stages ? JSON.stringify(trip_stages) : '',
    eta_time_unit,
    eta_value
  });
  
  console.log('Creating new worksheet...');
  const newWs = XLSX.utils.json_to_sheet(orders, { 
    header: ['id', 'order_number', 'material_type', 'material_weight', 'weight_unit', 'invoice_amount', 'sgst', 'cgst', 'tariff_hsn', 'vehicle_height', 'vehicle_height_option', 'toll', 'halting_days', 'halting_charge', 'extra_point_pickup', 'po_rate', 'actual_payable', 'debit_note', 'created_by', 'created_at', 'stages', 'status', 'trucks', 'transport_type', 'source_factory', 'dest_factories', 'trip_stages', 'eta_time_unit', 'eta_value'] 
  });
  console.log('Worksheet created successfully');
  
  wb.Sheets['order_details'] = newWs;
  console.log('Saving workbook...');
  saveWorkbook(wb);
  console.log('Workbook saved successfully');
  
  console.log('Sending success response');
  res.json({ success: true, order_number });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all orders
app.get('/api/orders', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  let orders = XLSX.utils.sheet_to_json(ws);
  
  // Ensure all orders have stages initialized
  orders = orders.map(order => {
    if (!order.stages) {
      order.stages = JSON.stringify(getInitialStages());
    }
    if (!order.status) {
      order.status = 'open';
    }
    return order;
  });
  
  res.json(orders);
});

// Admin: Get all users
app.get('/api/users', (req, res) => {
  const { user_id } = req.query;
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const user = users.find(u => u.id == user_id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json(users);
});

// Admin: Delete user
app.delete('/api/users/:id', (req, res) => {
  const { user_id } = req.body;
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const admin = users.find(u => u.id == user_id);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const idToDelete = parseInt(req.params.id);
  users = users.filter(u => u.id !== idToDelete);
  const newWs = XLSX.utils.json_to_sheet(users, { header: ['id', 'employee_name', 'password_hash', 'department_id', 'role'] });
  wb.Sheets['user_details'] = newWs;
  saveWorkbook(wb);
  res.json({ success: true });
});

// Admin: Reset password
app.post('/api/users/reset-password', (req, res) => {
  const { user_id, target_id, new_password } = req.body;
  if (!user_id || !target_id || !new_password) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const admin = users.find(u => u.id == user_id);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const user = users.find(u => u.id == target_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.password_hash = bcrypt.hashSync(new_password, 8);
  const newWs = XLSX.utils.json_to_sheet(users, { header: ['id', 'employee_name', 'password_hash', 'department_id', 'role'] });
  wb.Sheets['user_details'] = newWs;
  saveWorkbook(wb);
  res.json({ success: true });
});

// Get all vendor places
app.get('/api/vendor-places', (req, res) => {
  try {
    const wb = loadWorkbook();
    
    // Read from vendor_places sheet and specifically look for "Vendor Place" column
    const ws = wb.Sheets['vendor_places'];
    let vendors = [];
    
    if (ws) {
      // Get raw data to access specific columns
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rawData && rawData.length > 1) {
        const headers = rawData[0];
        const vendorPlaceColumnIndex = headers.findIndex(header => 
          header && header.toString().toLowerCase().includes('vendor place')
        );
        
        console.log('Headers found:', headers);
        console.log('Vendor Place column index:', vendorPlaceColumnIndex);
        
        if (vendorPlaceColumnIndex !== -1) {
          // Extract vendor names from the "Vendor Place" column
          vendors = rawData.slice(1) // Skip header row
            .filter(row => row && row[vendorPlaceColumnIndex] && row[vendorPlaceColumnIndex].toString().trim() !== '')
            .map((row, index) => ({
              id: `vendor_${index + 1}`,
              vendor_place_name: row[vendorPlaceColumnIndex].toString().trim()
            }));
        } else {
          console.log('Vendor Place column not found, trying fallback...');
          // Fallback to sheet_to_json method
          const places = XLSX.utils.sheet_to_json(ws);
          vendors = places.map((place, index) => ({
            id: place.id || `place_${index + 1}`,
            vendor_place_name: place['Vendor Place'] || place.vendor_place_name || place.vendor_name || place.name || Object.values(place)[0] || `Place ${index + 1}`
          }));
        }
      }
    }
    
    // Add custom factories to the list
    const customFactories = [
      "IndAutoFilters-1", "IndAutoFilters-2", "IndAutoFilters-3", "IndAutoFilters-4",
      "Soliflex Packaging-1", "Soliflex Packaging-2", "Soliflex Packaging-3", "Soliflex Packaging-4"
    ];
    
    const customFactoryVendors = customFactories.map((factory, index) => ({
      id: `custom_${index + 1}`,
      vendor_place_name: factory
    }));
    
    // Combine vendors and custom factories
    const allVendors = [...vendors, ...customFactoryVendors];
    
    console.log('Vendor places API response:', {
      totalVendors: vendors.length,
      totalCustomFactories: customFactoryVendors.length,
      totalCombined: allVendors.length,
      sampleVendors: allVendors.slice(0, 5)
    });
    
    res.json(allVendors);
  } catch (error) {
    console.error('Error fetching vendor places:', error);
    res.status(500).json({ error: 'Failed to fetch vendor places' });
  }
});

// Debug endpoint to see all columns in vendor_places
app.get('/api/vendor-places/debug', (req, res) => {
  try {
    const wb = loadWorkbook();
    const ws = wb.Sheets['vendor_places'];
    if (!ws) return res.status(404).json({ error: 'vendor_places worksheet not found' });
    
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length < 1) {
      return res.status(404).json({ error: 'No data found in vendor_places worksheet' });
    }
    
    const headerRow = data[0];
    const firstDataRow = data[1];
    
    res.json({
      headers: headerRow,
      firstRow: firstDataRow,
      totalRows: data.length,
      totalColumns: headerRow.length
    });
  } catch (error) {
    console.error('Error reading vendor_places debug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new vendor
app.post('/api/vendor-places', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['vendor_places'];
  let vendors = XLSX.utils.sheet_to_json(ws);
  const newVendor = req.body;
  newVendor['S/no'] = vendors.length ? Math.max(...vendors.map(v => Number(v['S/no']))) + 1 : 1;
  vendors.push(newVendor);
  const newWs = XLSX.utils.json_to_sheet(vendors, { header: Object.keys(newVendor) });
  wb.Sheets['vendor_places'] = newWs;
  saveWorkbook(wb);
  res.json(vendors);
});

// Edit vendor
app.put('/api/vendor-places/:id', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['vendor_places'];
  let vendors = XLSX.utils.sheet_to_json(ws);
  const idx = vendors.findIndex(v => String(v['S/no']) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });
  vendors[idx] = { ...vendors[idx], ...req.body, 'S/no': vendors[idx]['S/no'] };
  const newWs = XLSX.utils.json_to_sheet(vendors, { header: Object.keys(vendors[0]) });
  wb.Sheets['vendor_places'] = newWs;
  saveWorkbook(wb);
  res.json(vendors);
});

// Delete vendor
app.delete('/api/vendor-places/:id', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['vendor_places'];
  let vendors = XLSX.utils.sheet_to_json(ws);
  const idx = vendors.findIndex(v => String(v['S/no']) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Vendor not found' });
  vendors.splice(idx, 1);
  const newWs = XLSX.utils.json_to_sheet(vendors, { header: Object.keys(vendors[0] || { 'S/no': '', vendor_place_name: '', approx_km: '', time_approx_hr: '' }) });
  wb.Sheets['vendor_places'] = newWs;
  saveWorkbook(wb);
  res.json(vendors);
});

// Get available sheets in Excel file
app.get('/api/sheets', (req, res) => {
  try {
    const wb = loadWorkbook();
    res.json({ sheets: wb.SheetNames });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to inspect all sheets in Excel
app.get('/api/debug/excel-sheets', (req, res) => {
  try {
    const wb = loadWorkbook();
    const sheetNames = Object.keys(wb.Sheets);
    
    const sheetInfo = {};
    for (const sheetName of sheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data && data.length > 0) {
        sheetInfo[sheetName] = {
          headerRow: data[0],
          totalRows: data.length,
          sampleData: data.slice(1, 3) // First 2 data rows
        };
      }
    }
    
    res.json({
      availableSheets: sheetNames,
      sheetInfo
    });
  } catch (error) {
    console.error('Error debugging Excel sheets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to inspect vendor_places structure with comprehensive analysis
app.get('/api/debug/vendor-places', (req, res) => {
  try {
    const wb = loadWorkbook();
    const ws = wb.Sheets['vendor_places'];
    if (!ws) {
      return res.status(404).json({ error: 'vendor_places worksheet not found' });
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length < 2) {
      return res.status(404).json({ error: 'No data found in vendor_places worksheet' });
    }

    const headerRow = data[0];
    const firstDataRow = data[1];
    
    // Helper function to find column index with robust matching
    const findColumnIndex = (targetColumn, headerRow) => {
      // Try exact match first
      let index = headerRow.findIndex(col => col === targetColumn);
      if (index !== -1) return { index, method: 'exact', found: true };
      
      // Try case-insensitive match
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && col.toLowerCase().trim() === targetColumn.toLowerCase().trim()
      );
      if (index !== -1) return { index, method: 'case-insensitive', found: true };
      
      // Try partial match (in case there are extra spaces or characters)
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && col.toLowerCase().includes(targetColumn.toLowerCase())
      );
      if (index !== -1) return { index, method: 'partial', found: true };
      
      // Try reverse partial match (target contains column)
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && targetColumn.toLowerCase().includes(col.toLowerCase())
      );
      if (index !== -1) return { index, method: 'reverse-partial', found: true };
      
      return { index: -1, method: 'not-found', found: false };
    };
    
    // Check for expected rate columns with robust matching
    const expectedColumns = ['Drop 03', 'Pick 03', 'Drop 36', 'Pick 36', 'Drop 60', 'Pick 60', 'Toll charges'];
    const columnAnalysis = expectedColumns.map(col => {
      const result = findColumnIndex(col, headerRow);
      return {
        expectedColumn: col,
        found: result.found,
        method: result.method,
        actualColumn: result.found ? headerRow[result.index] : null,
        index: result.index
      };
    });
    
    const foundColumns = columnAnalysis.filter(col => col.found);
    const missingColumns = columnAnalysis.filter(col => !col.found);
    
    // Find any similar columns for debugging
    const similarDropColumns = headerRow.filter(col => 
      col && typeof col === 'string' && col.toLowerCase().includes('drop')
    );
    const similarPickColumns = headerRow.filter(col => 
      col && typeof col === 'string' && col.toLowerCase().includes('pick')
    );
    const similarTollColumns = headerRow.filter(col => 
      col && typeof col === 'string' && col.toLowerCase().includes('toll')
    );
    
    // Additional debugging: Check if there are any hidden characters or encoding issues
    const columnAnalysisWithDetails = headerRow.map((col, index) => {
      const colStr = col ? String(col) : '';
      return {
        index,
        column: col,
        trimmed: colStr.trim(),
        length: colStr.length,
        charCodes: colStr.split('').map(char => char.charCodeAt(0)),
        containsDrop: colStr.toLowerCase().includes('drop'),
        containsPick: colStr.toLowerCase().includes('pick'),
        containsToll: colStr.toLowerCase().includes('toll'),
        contains03: colStr.includes('03'),
        contains36: colStr.includes('36'),
        contains60: colStr.includes('60')
      };
    });

    res.json({
      headerRow,
      firstDataRow,
      totalRows: data.length,
      availableColumns: headerRow,
      sampleVendor: firstDataRow[0],
      expectedColumns,
      columnAnalysis,
      foundColumns,
      missingColumns,
      similarDropColumns,
      similarPickColumns,
      similarTollColumns,
      columnDetails: columnAnalysisWithDetails,
      // Show first few rows for better debugging
      sampleRows: data.slice(0, 5).map((row, index) => ({
        rowIndex: index,
        data: row,
        vendorName: row[0]
      }))
    });
  } catch (error) {
    console.error('Error debugging vendor_places:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor rates based on weight and shipping type
app.post('/api/vendor-rates', (req, res) => {
  const { vendorName, weight, isShippedByVendor } = req.body;
  
  console.log('=== VENDOR RATES DEBUG ===');
  console.log('Request body:', { vendorName, weight, isShippedByVendor });
  
  // Validate required parameters
  if (!vendorName || vendorName.trim() === '') {
    console.log('Validation failed: vendorName is missing or empty');
    return res.status(400).json({ error: 'Valid vendor name required' });
  }
  
  if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
    console.log('Validation failed: weight is missing, invalid, or <= 0', { weight, type: typeof weight });
    return res.status(400).json({ error: 'Valid weight required (must be a positive number)' });
  }
  
  // Ensure isShippedByVendor is a boolean
  const isShippedByVendorBoolean = Boolean(isShippedByVendor);
  
  console.log('Validation passed:', { vendorName, weight: parseFloat(weight), isShippedByVendor: isShippedByVendorBoolean });

  try {
    const wb = loadWorkbook();
    const ws = wb.Sheets['vendor_places'];
    if (!ws) {
      console.log('vendor_places worksheet not found');
      return res.status(404).json({ error: 'vendor_places worksheet not found' });
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('Excel data loaded, rows:', data.length);
    console.log('Header row:', data[0]);
    
    if (!data || data.length < 2) {
      console.log('No data found in vendor_places worksheet');
      return res.status(404).json({ error: 'No data found in vendor_places worksheet' });
    }

    const headerRow = data[0];
    console.log('Looking for vendor:', vendorName);
    console.log('Available vendors (second column):', data.slice(1).map(row => row[1]).filter(Boolean));
    
    const vendorRow = data.find(row => row[1] === vendorName);
    
    if (!vendorRow) {
      console.log('Vendor not found:', vendorName);
      return res.status(404).json({ error: 'Vendor not found in vendor_places table' });
    }
    
    console.log('Found vendor row:', vendorRow);

    // Parse weight as float for calculations
    const weightValue = parseFloat(weight);
    
    // Determine the correct rate column based on weight and shipping type
    let rateColumn = '';
    if (weightValue < 3000) {
      rateColumn = isShippedByVendorBoolean ? 'Drop 03' : 'Pick 03';
    } else if (weightValue >= 3000 && weightValue < 6000) {
      rateColumn = isShippedByVendorBoolean ? 'Drop 36' : 'Pick 36';
    } else {
      rateColumn = isShippedByVendorBoolean ? 'Drop 60' : 'Pick 60';
    }
    
    console.log('Weight category:', weightValue < 3000 ? 'Below 3000' : weightValue >= 3000 && weightValue < 6000 ? '3000-6000' : 'Above 6000');
    console.log('Shipping type:', isShippedByVendorBoolean ? 'Shipped by vendor' : 'Not shipped by vendor');
    console.log('Selected rate column:', rateColumn);

    // Helper function to find column index with robust matching
    const findColumnIndex = (targetColumn, headerRow) => {
      // Try exact match first
      let index = headerRow.findIndex(col => col === targetColumn);
      if (index !== -1) return { index, method: 'exact', found: true };
      
      // Try case-insensitive match
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && col.toLowerCase().trim() === targetColumn.toLowerCase().trim()
      );
      if (index !== -1) return { index, method: 'case-insensitive', found: true };
      
      // Try partial match (in case there are extra spaces or characters)
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && col.toLowerCase().includes(targetColumn.toLowerCase())
      );
      if (index !== -1) return { index, method: 'partial', found: true };
      
      // Try reverse partial match (target contains column)
      index = headerRow.findIndex(col => 
        col && typeof col === 'string' && targetColumn.toLowerCase().includes(col.toLowerCase())
      );
      if (index !== -1) return { index, method: 'reverse-partial', found: true };
      
      // Try common variations and abbreviations
      const variations = {
        'Drop 03': ['Drop03', 'Drop 0-3', 'Drop 0 to 3', 'Drop 0-3000', 'Drop 0 to 3000', 'Drop 0-3 tons', 'Drop 0 to 3 tons'],
        'Pick 03': ['Pick03', 'Pick 0-3', 'Pick 0 to 3', 'Pick 0-3000', 'Pick 0 to 3000', 'Pick 0-3 tons', 'Pick 0 to 3 tons'],
        'Drop 36': ['Drop36', 'Drop 3-6', 'Drop 3 to 6', 'Drop 3000-6000', 'Drop 3000 to 6000', 'Drop 3-6 tons', 'Drop 3 to 6 tons'],
        'Pick 36': ['Pick36', 'Pick 3-6', 'Pick 3 to 6', 'Pick 3000-6000', 'Pick 3000 to 6000', 'Pick 3-6 tons', 'Pick 3 to 6 tons'],
        'Drop 60': ['Drop60', 'Drop 6+', 'Drop 6 and above', 'Drop 6000+', 'Drop above 6000', 'Drop above 6 tons'],
        'Pick 60': ['Pick60', 'Pick 6+', 'Pick 6 and above', 'Pick 6000+', 'Pick above 6000', 'Pick above 6 tons'],
        'Toll charges': ['Toll', 'Toll Charges', 'Toll charges', 'Toll_charges', 'TollCharges', 'Toll charges (Rs)', 'Toll Charges (Rs)']
      };
      
      const variationsForTarget = variations[targetColumn] || [];
      for (const variation of variationsForTarget) {
        index = headerRow.findIndex(col => 
          col && typeof col === 'string' && col.toLowerCase().trim() === variation.toLowerCase().trim()
        );
        if (index !== -1) return { index, method: `variation: ${variation}`, found: true };
      }
      
      return { index: -1, method: 'not-found', found: false };
    };

    // Find the rate column index with robust matching
    const rateColumnResult = findColumnIndex(rateColumn, headerRow);
    console.log('Rate column result:', rateColumnResult);
    console.log('Looking for rate column:', rateColumn);
    console.log('Available columns:', headerRow);
    
    if (!rateColumnResult.found) {
      console.log('Rate column not found:', rateColumn);
      console.log('Available columns in vendor_places sheet:', headerRow);
      
      // Try to find any similar columns for debugging
      const similarColumns = headerRow.filter(col => 
        col && typeof col === 'string' && 
        (col.toLowerCase().includes('drop') || col.toLowerCase().includes('pick'))
      );
      console.log('Similar columns found:', similarColumns);
      
      return res.status(404).json({ 
        error: `Rate column '${rateColumn}' not found`,
        allowManualEntry: true,
        message: `Auto-population not available: The Excel file's vendor_places sheet is missing the required rate columns (Drop 03, Pick 03, Drop 36, Pick 36, Drop 60, Pick 60, Toll charges). Please add these columns to the vendor_places sheet or enter the invoice amount manually.`
      });
    }

    const rateColumnIndex = rateColumnResult.index;
    console.log('Rate column found at index:', rateColumnIndex, 'using method:', rateColumnResult.method);

    // Find the toll charges column index with robust matching
    const tollColumnResult = findColumnIndex('Toll charges', headerRow);
    console.log('Toll charges column result:', tollColumnResult);
    console.log('Looking for toll charges column: Toll charges');
    
    if (!tollColumnResult.found) {
      console.log('Toll charges column not found');
      console.log('Available columns in vendor_places sheet:', headerRow);
      
      // Try to find any similar columns for debugging
      const similarColumns = headerRow.filter(col => 
        col && typeof col === 'string' && 
        col.toLowerCase().includes('toll')
      );
      console.log('Similar toll columns found:', similarColumns);
      
      return res.status(404).json({ 
        error: 'Toll charges column not found',
        allowManualEntry: true,
        message: 'Auto-population not available: The Excel file\'s vendor_places sheet is missing the required "Toll charges" column. Please add this column to the vendor_places sheet or enter the toll charges manually.'
      });
    }

    const tollColumnIndex = tollColumnResult.index;
    console.log('Toll charges column found at index:', tollColumnIndex, 'using method:', tollColumnResult.method);

    // Get the rate and toll values from the vendor row
    const rateValue = vendorRow[rateColumnIndex];
    const tollValue = vendorRow[tollColumnIndex];
    
    console.log('Rate value from Excel:', rateValue, 'Type:', typeof rateValue);
    console.log('Toll value from Excel:', tollValue, 'Type:', typeof tollValue);

    // Parse the rate value
    let rate = 0;
    if (rateValue !== undefined && rateValue !== null && rateValue !== '') {
      rate = parseFloat(rateValue);
      console.log('Parsed rate:', rate);
      if (isNaN(rate)) {
        console.log('Invalid rate value:', rateValue);
        return res.status(404).json({ 
          error: 'Invalid rate value in Excel',
          allowManualEntry: true,
          message: 'Auto-population not available: Invalid rate value found in the Excel file. Please enter the invoice amount manually.'
        });
      }
    } else {
      // Rate is blank/empty, meaning trip is not agreed with vendor
      console.log('Rate is blank/empty');
      return res.status(404).json({ 
        error: 'Rate not available for this vendor and weight category',
        allowManualEntry: true,
        message: 'Auto-population not available: No rate agreement found for this vendor and weight category. Please enter the invoice amount manually.'
      });
    }

    // Parse the toll charges value
    let tollCharges = 0;
    if (tollValue !== undefined && tollValue !== null && tollValue !== '') {
      tollCharges = parseFloat(tollValue);
      console.log('Parsed toll charges:', tollCharges);
      if (isNaN(tollCharges)) {
        tollCharges = 0; // Default to 0 if invalid
        console.log('Invalid toll charges, defaulting to 0');
      }
    } else {
      console.log('Toll charges is blank/empty, defaulting to 0');
    }

    // Calculate total amount (rate + toll charges)
    const totalAmount = rate + tollCharges;
    console.log('Calculated total amount:', totalAmount);

    const response = {
      rate,
      tollCharges,
      totalAmount,
      vendorName,
      weight,
      isShippedByVendor: isShippedByVendorBoolean,
      allowManualEntry: false
    };
    
    console.log('Sending response:', response);
    console.log('=== END VENDOR RATES DEBUG ===');

    res.json(response);

  } catch (error) {
    console.error('Error calculating vendor rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get truck suggestions based on weight and utilization requirements
app.post('/api/trucks/suggest', (req, res) => {
  const { weight } = req.body;
  if (!weight || isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: 'Valid weight required' });
  }

  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  if (!ws) return res.status(404).json({ error: 'truck_details worksheet not found' });

  const allTrucks = XLSX.utils.sheet_to_json(ws);
  const availableTrucks = allTrucks.filter(truck => !truck.is_busy);

  let suggestions = [];

  // Try all combinations up to 3 trucks
  for (let n = 1; n <= 3; n++) {
    const combos = getCombinations(availableTrucks, n);
    for (const combo of combos) {
      const totalCap = combo.reduce((sum, t) => sum + (t.capacity_kg || 0), 0);
      const util = weight / totalCap;
      
      // Accept suggestions with utilization between 70% and 110% (allow slight overcapacity)
      if (util >= 0.7 && util <= 1.1) {
        suggestions.push({
          type: n === 1 ? 'single' : 'combination',
          trucks: combo,
          utilization: util * 100,
          total_capacity: totalCap,
          remaining_capacity: totalCap - weight,
          is_optimal: util >= 0.85 && util <= 1.0,
          is_under_capacity: util > 1.0
        });
      }
    }
  }

  // Sort by priority: optimal utilization first, then by utilization descending
  suggestions.sort((a, b) => {
    if (a.is_optimal && !b.is_optimal) return -1;
    if (!a.is_optimal && b.is_optimal) return 1;
    return b.utilization - a.utilization;
  });

  // Return top 8 suggestions (more options for user)
  const topSuggestions = suggestions.slice(0, 8);

  // Check if we have any optimal suggestions
  const optimalSuggestions = topSuggestions.filter(s => s.is_optimal);
  const allowManualEntry = optimalSuggestions.length === 0 || topSuggestions.every(s => s.utilization < 70);

  res.json({
    suggestions: topSuggestions,
    utilization: topSuggestions.length > 0 ? topSuggestions[0].utilization : 0,
    allow_manual_entry: allowManualEntry,
    has_optimal_suggestions: optimalSuggestions.length > 0,
    message: topSuggestions.length > 0 ? 'Truck suggestions found' : 'No suitable truck combinations found for target utilization'
  });
});

// Get truck suggestions for wastage (closest match without utilization restriction)
app.post('/api/trucks/suggest-wastage', (req, res) => {
  const { weight } = req.body;
  
  if (!weight || weight <= 0) {
    return res.status(400).json({ error: 'Valid weight required' });
  }
  
  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  if (!ws) {
    return res.status(404).json({ error: 'Truck details not found' });
  }
  
  let trucks = XLSX.utils.sheet_to_json(ws);
  
  // Filter available trucks (not busy)
  trucks = trucks.filter(truck => !truck.is_busy);
  
  if (trucks.length === 0) {
    return res.json({ suggestions: [] });
  }
  
  // Calculate capacity difference for each truck
  trucks.forEach(truck => {
    if (truck.capacity_kg) {
      truck.capacity_diff = Math.abs(truck.capacity_kg - weight);
      truck.utilization = weight / truck.capacity_kg;
    } else {
      truck.capacity_diff = Infinity;
      truck.utilization = 0;
    }
  });
  
  // Filter trucks that can carry the weight (utilization <= 100%)
  const suitableTrucks = trucks.filter(truck => truck.utilization <= 1);
  
  if (suitableTrucks.length === 0) {
    return res.json({ suggestions: [] });
  }
  
  // Sort by capacity difference (closest match first)
  suitableTrucks.sort((a, b) => a.capacity_diff - b.capacity_diff);
  
  // Group trucks by type and find closest matches
  const suggestions = [];
  const truckTypes = [...new Set(suitableTrucks.map(t => t.type))];
  
  for (const type of truckTypes) {
    const typeTrucks = suitableTrucks.filter(t => t.type === type);
    
    // Single truck suggestion (closest match)
    if (typeTrucks.length > 0) {
      suggestions.push({
        trucks: [typeTrucks[0]],
        utilization: typeTrucks[0].utilization,
        type: 'single',
        capacity_diff: typeTrucks[0].capacity_diff
      });
    }
    
    // Multiple truck combinations (if needed)
    if (typeTrucks.length > 1) {
      const combinations = getCombinations(typeTrucks, 2);
      for (const combo of combinations) {
        const totalCapacity = combo.reduce((sum, t) => sum + (t.capacity_kg || 0), 0);
        const comboUtilization = weight / totalCapacity;
        const comboCapacityDiff = Math.abs(totalCapacity - weight);
        
        if (comboUtilization <= 1) {
          suggestions.push({
            trucks: combo,
            utilization: comboUtilization,
            type: 'multiple',
            capacity_diff: comboCapacityDiff
          });
        }
      }
    }
  }
  
  // Sort suggestions by capacity difference (closest match first)
  suggestions.sort((a, b) => a.capacity_diff - b.capacity_diff);
  
  res.json({ suggestions: suggestions.slice(0, 5) }); // Return top 5 suggestions
});

// Suggest truck combinations
app.post('/api/trucks/suggest-combination', (req, res) => {
  const { weight, weight_unit, min_utilization = 70, max_utilization = 100 } = req.body;
  if (!weight || isNaN(weight)) {
    return res.status(400).json({ error: 'Valid weight required' });
  }

  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  const trucks = XLSX.utils.sheet_to_json(ws);

  // Get available trucks
  const availableTrucks = trucks.filter(truck => !truck.is_busy);

  // Generate combinations of 2 trucks
  const combinations = [];
  for (let i = 0; i < availableTrucks.length; i++) {
    for (let j = i + 1; j < availableTrucks.length; j++) {
      const truck1 = availableTrucks[i];
      const truck2 = availableTrucks[j];
      const totalCapacity = truck1.capacity_kg + truck2.capacity_kg;
      const utilization = Math.round((weight / totalCapacity) * 100);

      if (utilization >= min_utilization && utilization <= max_utilization) {
        combinations.push({
          trucks: [truck1, truck2],
          totalCapacity,
          utilization,
          vehicle_numbers: [truck1.vehicle_number, truck2.vehicle_number],
          capacities: [truck1.capacity_kg, truck2.capacity_kg],
          vehicle_types: [truck1.vehicle_type, truck2.vehicle_type],
          vendor_vehicles: [truck1.vendor_vehicle, truck2.vendor_vehicle],
          is_rented: [truck1.is_rented, truck2.is_rented],
          ids: [truck1.id, truck2.id]
        });
      }
    }
  }

  // Sort by utilization (highest first)
  combinations.sort((a, b) => b.utilization - a.utilization);

  const suggestions = combinations.slice(0, 10).map(combo => ({
    vehicle_number: combo.vehicle_numbers.join(' + '),
    capacity_kg: combo.totalCapacity,
    vehicle_type: combo.vehicle_types.join(' + '),
    vendor_vehicle: combo.vendor_vehicles.join(' + '),
    is_rented: combo.is_rented.some(r => r),
    utilization: combo.utilization,
    total_utilization: combo.utilization,
    utilization_percentage: combo.utilization,
    is_combination: true,
    trucks: combo.trucks,
    ids: combo.ids
  }));

  res.json({ suggestions });
});

// Helper to get all combinations of n trucks
function getCombinations(arr, n) {
  if (n === 1) return arr.map(x => [x]);
  let result = [];
  arr.forEach((item, i) => {
    getCombinations(arr.slice(i + 1), n - 1).forEach(next => {
      result.push([item, ...next]);
    });
  });
  return result;
}

function getInitialStages() {
  return ORDER_STAGE_FLOW.map(stage => {
    return {
      name: stage.name,
      status: 'pending',
      approver: null,
      timestamp: null,
      comments: null,
      action: null
    };
  });
}

function getUserStageRoles(user, departmentTable) {
  // Map department_id to department_name
  const dep = departmentTable.find(d => String(d.id) === String(user.department_id));
  if (!dep) return [];
  const depName = dep.department_name;
  
  // Admin has access to all roles
  if (user.role === 'admin') return ['security', 'stores'];
  
  // Purchase team can approve admin stages (like Order Approved)
  if (user.role === 'purchase_team') return ['admin'];
  
  // Security roles
  if (user.role.includes('security') || depName.toLowerCase().includes('security')) {
    return ['security'];
  }
  
  // Stores roles
  if (user.role.includes('stores') || user.role.includes('fabric') || 
      depName.toLowerCase().includes('stores') || depName.toLowerCase().includes('fabric')) {
    return ['stores'];
  }
  
  return [];
}

// Get all stages for an order
app.get('/api/orders/:id/stages', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  let orders = XLSX.utils.sheet_to_json(ws);
  const order = orders.find(o => String(o.id) === String(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const stages = order.stages ? JSON.parse(order.stages) : [];
  res.json(stages);
});

// Approve a stage with comprehensive workflow
app.post('/api/orders/:id/approve-stage', (req, res) => {
  const { user_id, stage_name, action, comments, truck_number } = req.body;
  if (!user_id || !stage_name) return res.status(400).json({ error: 'user_id and stage_name required' });
  
  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  let orders = XLSX.utils.sheet_to_json(ws);
  const orderIdx = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (orderIdx === -1) return res.status(404).json({ error: 'Order not found' });
  
  let order = orders[orderIdx];
  let stages = order.stages ? JSON.parse(order.stages) : getInitialStages();
  
  // Find the stage to approve (considering truck_number if provided)
  let stageIdx = -1;
  
  // Debug logging
  console.log('Looking for stage:', stage_name);
  console.log('Truck number:', truck_number);
  console.log('Available stages:', stages.map(s => ({ name: s.name, status: s.status, truck_number: s.truck_number })));
  
  if (truck_number) {
    // First try exact match
    stageIdx = stages.findIndex(s => 
      s.name === stage_name && 
      s.status === 'pending' && 
      s.truck_number === truck_number
    );
    console.log('Found stage with exact truck number match:', stageIdx);
    
    // If no exact match, try without truck number constraint
    if (stageIdx === -1) {
      stageIdx = stages.findIndex(s => s.name === stage_name && s.status === 'pending');
      console.log('Found stage without truck number constraint:', stageIdx);
    }
  } else {
    stageIdx = stages.findIndex(s => s.name === stage_name && s.status === 'pending');
    console.log('Found stage without truck number:', stageIdx);
  }
  
      if (stageIdx === -1) {
      // Provide more detailed error message
      const pendingStages = stages.filter(s => s.status === 'pending');
      const matchingStages = stages.filter(s => s.name === stage_name);
      
      let errorMsg = 'Stage not pending or not found. ';
      if (matchingStages.length === 0) {
        errorMsg += `No stages found with name: "${stage_name}". Available stage names: ${stages.map(s => s.name).join(', ')}`;
      } else if (matchingStages.every(s => s.status !== 'pending')) {
        errorMsg += `Stage "${stage_name}" exists but is not pending. Current status: ${matchingStages.map(s => s.status).join(', ')}`;
      } else if (truck_number) {
        const pendingMatchingStages = matchingStages.filter(s => s.status === 'pending');
        errorMsg += `Stage "${stage_name}" exists and is pending, but truck number "${truck_number}" doesn't match. Available truck numbers: ${pendingMatchingStages.map(s => s.truck_number || 'none').join(', ')}`;
      }
      
      console.log('Error details:', {
        stageName,
        truckNumber: truck_number,
        totalStages: stages.length,
        pendingStages: pendingStages.length,
        matchingStages: matchingStages.length,
        pendingMatchingStages: matchingStages.filter(s => s.status === 'pending').length
      });
      
      return res.status(400).json({ error: errorMsg });
    }
  
  // Check user eligibility
  const userWs = wb.Sheets['user_details'];
  const departmentWs = wb.Sheets['department_table'];
  const users = XLSX.utils.sheet_to_json(userWs);
  const departments = XLSX.utils.sheet_to_json(departmentWs);
  const user = users.find(u => String(u.id) === String(user_id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const allowedRoles = getUserStageRoles(user, departments);
  
  // Find the stage configuration from ORDER_STAGE_FLOW
  // Handle dynamic stage names with factory names
  let stageConfig = ORDER_STAGE_FLOW.find(s => s.name === stage_name);
  if (!stageConfig) {
    // Try to match by stage type (e.g., "Vehicle Entry Approved" regardless of factory name)
    const stageType = stage_name.replace(/\([^)]+\)/g, '').trim();
    stageConfig = ORDER_STAGE_FLOW.find(s => s.name.replace(/\([^)]+\)/g, '').trim() === stageType);
  }
  // If still no match, create a default config based on stage name patterns
  if (!stageConfig) {
    if (stage_name.includes('Vehicle Entry') || stage_name.includes('Vehicle Exit')) {
      stageConfig = { role: 'security' };
    } else if (stage_name.includes('Consignment Verification')) {
      stageConfig = { role: 'stores' };
    } else if (stage_name.includes('Order Approved')) {
      stageConfig = { role: 'admin' };
    }
  }
  const requiredRole = stageConfig ? stageConfig.role : null;
  
  // Role-based access control
  if (requiredRole && requiredRole !== 'admin' && !allowedRoles.includes(requiredRole)) {
    return res.status(403).json({ error: 'User not authorized to approve this stage' });
  }
  
  // Handle different actions
  let stageStatus = 'completed';
  let stageComments = comments || '';
  
  switch (action) {
    case 'reject':
      stageStatus = 'rejected';
      stageComments = `Stage rejected. ${comments || 'No comments provided'}`;
      break;
    case 'approve':
    case 'approved':
      stageStatus = 'completed';
      stageComments = comments || 'Stage approved';
      break;
    case 'waiting_beyond_eta':
      stageStatus = 'delayed';
      stageComments = `Vehicle waiting beyond ETA. ${comments || ''}`;
      break;
    case 'vehicle_not_reached':
      stageStatus = 'pending';
      stageComments = `Vehicle not reached. ${comments || ''}`;
      break;
    case 'reached_with_comments':
      if (!comments || comments.trim() === '') {
        return res.status(400).json({ error: 'Comments required for reached_with_comments action' });
      }
      stageStatus = 'completed';
      stageComments = `Vehicle reached with comments: ${comments}`;
      break;

    case 'verified':
      stageStatus = 'completed';
      stageComments = `Consignment verified. ${comments || ''}`;
      break;
    default:
      stageStatus = 'completed';
      stageComments = comments || '';
      break;
  }
  
  // Update the stage
  const department = departments.find(d => String(d.id) === String(user.department_id));
  const departmentName = department ? department.department_name : '';
  stages[stageIdx] = {
    ...stages[stageIdx],
    status: stageStatus,
    approver: user.employee_name,
    department_name: departmentName,
    timestamp: new Date().toISOString(),
    action: action,
    comments: stageComments
  };
  
  // Update order status
  let newStatus = 'in_progress';
  if (stages.every(s => s.status === 'completed')) {
    newStatus = 'completed';
  } else if (stages.some(s => s.status === 'rejected')) {
    newStatus = 'rejected';
  } else if (stages.some(s => s.status === 'delayed')) {
    newStatus = 'delayed';
  }
  
  orders[orderIdx] = { ...order, stages: JSON.stringify(stages), status: newStatus };
  
  // Write back to Excel
  const newWs = XLSX.utils.json_to_sheet(orders, { header: Object.keys(orders[0]) });
  wb.Sheets['order_details'] = newWs;
  saveWorkbook(wb);
  
  res.json({ 
    success: true, 
    stages, 
    status: newStatus,
    message: `Stage ${action || 'approved'} successfully`
  });
});

// Revoke a rejected stage
app.post('/api/orders/:id/revoke-reject', (req, res) => {
  const { user_id, stage_name } = req.body;
  if (!user_id || !stage_name) return res.status(400).json({ error: 'user_id and stage_name required' });
  
  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  let orders = XLSX.utils.sheet_to_json(ws);
  const orderIdx = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (orderIdx === -1) return res.status(404).json({ error: 'Order not found' });
  
  let order = orders[orderIdx];
  let stages = order.stages ? JSON.parse(order.stages) : getInitialStages();
  
  // Find the rejected stage
  const stageIdx = stages.findIndex(s => s.name === stage_name && s.status === 'rejected');
  if (stageIdx === -1) return res.status(400).json({ error: 'Rejected stage not found' });
  
  // Check user eligibility (same as approve)
  const userWs = wb.Sheets['user_details'];
  const departmentWs = wb.Sheets['department_table'];
  const users = XLSX.utils.sheet_to_json(userWs);
  const departments = XLSX.utils.sheet_to_json(departmentWs);
  const user = users.find(u => String(u.id) === String(user_id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const allowedRoles = getUserStageRoles(user, departments);
  
  // Find the stage configuration from ORDER_STAGE_FLOW
  // Handle dynamic stage names with factory names
  let stageConfig = ORDER_STAGE_FLOW.find(s => s.name === stage_name);
  if (!stageConfig) {
    // Try to match by stage type (e.g., "Vehicle Entry Approved" regardless of factory name)
    const stageType = stage_name.replace(/\([^)]+\)/g, '').trim();
    stageConfig = ORDER_STAGE_FLOW.find(s => s.name.replace(/\([^)]+\)/g, '').trim() === stageType);
  }
  const requiredRole = stageConfig ? stageConfig.role : null;
  
  // Role-based access control
  if (requiredRole && requiredRole !== 'admin' && !allowedRoles.includes(requiredRole)) {
    return res.status(403).json({ error: 'User not authorized to revoke this stage' });
  }
  
  // Revoke the rejection - set back to pending
  stages[stageIdx] = {
    ...stages[stageIdx],
    status: 'pending',
    approver: null,
    timestamp: null,
    action: null,
    comments: null
  };
  
  // Update order status
  let newStatus = 'in_progress';
  if (stages.every(s => s.status === 'completed')) {
    newStatus = 'completed';
  } else if (stages.some(s => s.status === 'delayed')) {
    newStatus = 'delayed';
  }
  
  orders[orderIdx] = { ...order, stages: JSON.stringify(stages), status: newStatus };
  
  // Write back to Excel
  const newWs = XLSX.utils.json_to_sheet(orders, { header: Object.keys(orders[0]) });
  wb.Sheets['order_details'] = newWs;
  saveWorkbook(wb);
  
  res.json({ 
    success: true, 
    stages, 
    status: newStatus,
    message: 'Stage rejection revoked successfully'
  });
});

// Get pending approvals for a user (notifications)
app.get('/api/notifications', (req, res) => {
  // For now, return empty notifications since we don't have token-based user extraction
  // TODO: Implement proper token-based authentication
  res.json([]);
  
  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  const userWs = wb.Sheets['user_details'];
  const departmentWs = wb.Sheets['department_table'];
  const orders = XLSX.utils.sheet_to_json(ws);
  const users = XLSX.utils.sheet_to_json(userWs);
  const departments = XLSX.utils.sheet_to_json(departmentWs);
  
  const user = users.find(u => String(u.id) === String(user_id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const allowedRoles = getUserStageRoles(user, departments);
  
  // Find all orders with a pending stage that matches user's allowedRoles
  const notifications = [];
  for (const order of orders) {
    const stages = order.stages ? JSON.parse(order.stages) : [];
    
    // Check for pending stages that user can approve
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageConfig = ORDER_STAGE_FLOW.find(s => s.name === stage.name);
      
      if (stage.status === 'pending' && 
          stageConfig && stageConfig.role && 
          allowedRoles.includes(stageConfig.role)) {
        
        notifications.push({
          order_id: order.id,
          order_number: order.order_number,
          stage: stage.name,
          required_role: stageConfig.role,
          stage_index: i,
          order_status: order.status,
          material_type: order.material_type,
          source_factory: order.source_factory,
          dest_factories: order.dest_factories
        });
      }
    }
    
    // Also check for ETA notifications if user is security
    if (allowedRoles.includes('security')) {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageConfig = ORDER_STAGE_FLOW.find(s => s.name === stage.name);
        
        if (stage.name.includes('ETA Notification') && stage.status === 'pending') {
          notifications.push({
            order_id: order.id,
            order_number: order.order_number,
            stage: stage.name,
            required_role: 'security',
            stage_index: i,
            type: 'eta_notification',
            order_status: order.status,
            material_type: order.material_type,
            source_factory: order.source_factory,
            dest_factories: order.dest_factories
          });
        }
      }
    }
  }
  
  res.json(notifications);
});

// Get all trucks
app.get('/api/trucks', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  if (!ws) return res.status(404).json({ error: 'truck_details worksheet not found' });
  const trucks = XLSX.utils.sheet_to_json(ws);
  res.json(trucks);
});

// Add new truck
app.post('/api/trucks', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  let trucks = XLSX.utils.sheet_to_json(ws);
  const newTruck = req.body;
  newTruck.id = trucks.length ? Math.max(...trucks.map(t => Number(t.id))) + 1 : 1;
  trucks.push(newTruck);
  const newWs = XLSX.utils.json_to_sheet(trucks, { header: Object.keys(newTruck) });
  wb.Sheets['truck_details'] = newWs;
  saveWorkbook(wb);
  res.json(trucks);
});

// Edit truck
app.put('/api/trucks/:id', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  let trucks = XLSX.utils.sheet_to_json(ws);
  const idx = trucks.findIndex(t => String(t.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Truck not found' });
  trucks[idx] = { ...trucks[idx], ...req.body, id: trucks[idx].id };
  const newWs = XLSX.utils.json_to_sheet(trucks, { header: Object.keys(trucks[0]) });
  wb.Sheets['truck_details'] = newWs;
  saveWorkbook(wb);
  res.json(trucks);
});

// Delete truck
app.delete('/api/trucks/:id', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['truck_details'];
  let trucks = XLSX.utils.sheet_to_json(ws);
  const idx = trucks.findIndex(t => String(t.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Truck not found' });
  trucks.splice(idx, 1);
  const newWs = XLSX.utils.json_to_sheet(trucks, { header: Object.keys(trucks[0] || { id: '', vehicle_number: '', type: '', capacity_kg: '', vehicle_type: '', vendor_vehicle: '', is_rented: '', is_busy: '', current_order: '' }) });
  wb.Sheets['truck_details'] = newWs;
  saveWorkbook(wb);
  res.json(trucks);
});

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from all interfaces`)); 