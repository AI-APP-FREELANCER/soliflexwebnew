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
  return XLSX.readFile(EXCEL_FILE);
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
  const { user_id } = req.body;
  const wb = loadWorkbook();
  const ws = wb.Sheets['user_details'];
  let users = XLSX.utils.sheet_to_json(ws);
  const user = users.find(u => u.id == user_id);
  if (!user || (user.role !== 'admin' && user.role !== 'purchase' && user.role !== 'purchase_team')) {
    return res.status(403).json({ error: 'Not authorized to place orders' });
  }
  req.user = user;
  next();
}

// Create new order (RFQ)
app.post('/api/orders', isPurchaseOrAdmin, (req, res) => {
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
  
  if (!material_type || !material_weight || !weight_unit) {
    return res.status(400).json({ error: 'Material type, weight, and unit are required fields' });
  }

  const wb = loadWorkbook();
  const ws = wb.Sheets['order_details'];
  let orders = XLSX.utils.sheet_to_json(ws);
  const id = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
  const order_number = `RFQ_ID#${(id).toString().padStart(4, '0')}`;
  const created_by = req.user.id;
  const created_at = new Date().toISOString();

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
  
  const newWs = XLSX.utils.json_to_sheet(orders, { 
    header: ['id', 'order_number', 'material_type', 'material_weight', 'weight_unit', 'invoice_amount', 'sgst', 'cgst', 'tariff_hsn', 'vehicle_height', 'vehicle_height_option', 'toll', 'halting_days', 'halting_charge', 'extra_point_pickup', 'po_rate', 'actual_payable', 'debit_note', 'created_by', 'created_at', 'stages', 'status', 'trucks', 'transport_type', 'source_factory', 'dest_factories', 'trip_stages', 'eta_time_unit', 'eta_value'] 
  });
  wb.Sheets['order_details'] = newWs;
  saveWorkbook(wb);
  res.json({ success: true, order_number });
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
  const wb = loadWorkbook();
  const ws = wb.Sheets['vendor_places'];
  if (!ws) return res.status(404).json({ error: 'vendor_places worksheet not found' });
  const places = XLSX.utils.sheet_to_json(ws);
  res.json(places);
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

// Get all vendor places
app.get('/api/vendor-places', (req, res) => {
  const wb = loadWorkbook();
  const ws = wb.Sheets['vendor_places'];
  if (!ws) return res.status(404).json({ error: 'vendor_places worksheet not found' });
  const places = XLSX.utils.sheet_to_json(ws);
  res.json(places);
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
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  
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

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} and accessible from all interfaces`)); 