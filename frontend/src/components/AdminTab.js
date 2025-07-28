import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tabs, Tab, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';

const AdminTab = ({ adminId }) => {
  const [tab, setTab] = useState(0);
  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [resetDialog, setResetDialog] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  // Trucks
  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [truckError, setTruckError] = useState('');
  const [truckDialog, setTruckDialog] = useState({ open: false, truck: null, mode: 'add' });
  const [deleteTruckDialog, setDeleteTruckDialog] = useState({ open: false, truck: null });
  // Vendors
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendorError, setVendorError] = useState('');
  const [vendorDialog, setVendorDialog] = useState({ open: false, vendor: null, mode: 'add' });
  const [deleteVendorDialog, setDeleteVendorDialog] = useState({ open: false, vendor: null });

  // Fetchers
  const fetchUsers = () => {
    setLoadingUsers(true);
    setUserError('');
    axios.get('/api/users', { params: { user_id: adminId } })
      .then(res => { setUsers(res.data); setLoadingUsers(false); })
      .catch(() => { setUserError('Failed to load users'); setLoadingUsers(false); });
  };
  const fetchTrucks = () => {
    setLoadingTrucks(true);
    setTruckError('');
    axios.get('/api/trucks')
      .then(res => { setTrucks(res.data); setLoadingTrucks(false); })
      .catch(() => { setTruckError('Failed to load trucks'); setLoadingTrucks(false); });
  };
  const fetchVendors = () => {
    setLoadingVendors(true);
    setVendorError('');
    axios.get('/api/vendor-places')
      .then(res => { setVendors(res.data); setLoadingVendors(false); })
      .catch(() => { setVendorError('Failed to load vendors'); setLoadingVendors(false); });
  };

  useEffect(() => { if (adminId) fetchUsers(); }, [adminId]);
  useEffect(() => { fetchTrucks(); }, []);
  useEffect(() => { fetchVendors(); }, []);

  // User actions (same as before)
  const handleDelete = () => {
    if (!deleteDialog.user) return;
    setUserSuccess('');
    setUserError('');
    axios.delete(`/api/users/${deleteDialog.user.id}`, { data: { user_id: adminId } })
      .then(() => {
        setUserSuccess('User deleted');
        setDeleteDialog({ open: false, user: null });
        fetchUsers();
      })
      .catch(() => setUserError('Failed to delete user'));
  };

  const handleResetPassword = () => {
    setResetError('');
    setResetSuccess('');
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    axios.post('/api/users/reset-password', {
      user_id: adminId,
      target_id: resetDialog.user.id,
      new_password: newPassword
    })
      .then(() => {
        setResetSuccess('Password reset successfully');
        setTimeout(() => {
          setResetDialog({ open: false, user: null });
          setNewPassword('');
          setResetSuccess('');
        }, 1200);
      })
      .catch(() => setResetError('Failed to reset password'));
  };

  // Truck actions
  const handleAddTruck = () => setTruckDialog({ open: true, truck: null, mode: 'add' });
  const handleEditTruck = (truck) => setTruckDialog({ open: true, truck, mode: 'edit' });
  const handleDeleteTruck = (truck) => setDeleteTruckDialog({ open: true, truck });
  const handleTruckDialogSave = (truck) => {
    const api = truckDialog.mode === 'add' ? axios.post : axios.put;
    const url = truckDialog.mode === 'add' ? '/api/trucks' : `/api/trucks/${truck.id}`;
    api(url, truck).then(() => { setTruckDialog({ open: false, truck: null, mode: 'add' }); fetchTrucks(); });
  };
  const handleTruckDeleteConfirm = () => {
    axios.delete(`/api/trucks/${deleteTruckDialog.truck.id}`).then(() => { setDeleteTruckDialog({ open: false, truck: null }); fetchTrucks(); });
  };

  // Vendor actions
  const handleAddVendor = () => setVendorDialog({ open: true, vendor: null, mode: 'add' });
  const handleEditVendor = (vendor) => setVendorDialog({ open: true, vendor, mode: 'edit' });
  const handleDeleteVendor = (vendor) => setDeleteVendorDialog({ open: true, vendor });
  const handleVendorDialogSave = (vendor) => {
    const api = vendorDialog.mode === 'add' ? axios.post : axios.put;
    const url = vendorDialog.mode === 'add' ? '/api/vendor-places' : `/api/vendor-places/${vendor['S/no']}`;
    api(url, vendor).then(() => { setVendorDialog({ open: false, vendor: null, mode: 'add' }); fetchVendors(); });
  };
  const handleVendorDeleteConfirm = () => {
    axios.delete(`/api/vendor-places/${deleteVendorDialog.vendor['S/no']}`).then(() => { setDeleteVendorDialog({ open: false, vendor: null }); fetchVendors(); });
  };

  // Columns
  const userColumns = [
    { field: 'employee_name', headerName: 'Name', width: 140 },
    { field: 'department_id', headerName: 'Dept. ID', width: 80 },
    { field: 'role', headerName: 'Role', width: 100 },
    {
      field: 'actions', headerName: 'Actions', width: 120, renderCell: (params) => (
        <>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, user: params.row })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reset Password"><IconButton size="small" color="primary" onClick={() => setResetDialog({ open: true, user: params.row })}><LockResetIcon fontSize="small" /></IconButton></Tooltip>
        </>
      )
    }
  ];
  const truckColumns = [
    { field: 'vehicle_number', headerName: 'Number', width: 120 },
    { field: 'type', headerName: 'Type', width: 80 },
    { field: 'capacity_kg', headerName: 'Capacity', width: 80 },
    { field: 'vehicle_type', headerName: 'Size', width: 80 },
    { field: 'vendor_vehicle', headerName: 'Vendor', width: 100 },
    { field: 'is_rented', headerName: 'Rented', width: 70 },
    { field: 'is_busy', headerName: 'Busy', width: 60 },
    { field: 'current_order', headerName: 'Order', width: 120 },
    {
      field: 'actions', headerName: 'Actions', width: 100, renderCell: (params) => (
        <>
          <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEditTruck(params.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteTruck(params.row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </>
      )
    }
  ];
  const vendorColumns = [
    { field: 'vendor_place_name', headerName: 'Name', width: 160 },
    { field: 'approx_km', headerName: 'Km', width: 60 },
    { field: 'time_approx_hr', headerName: 'Time(hr)', width: 70 },
    {
      field: 'actions', headerName: 'Actions', width: 100, renderCell: (params) => (
        <>
          <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => handleEditVendor(params.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteVendor(params.row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </>
      )
    }
  ];

  // Dialog forms (trucks/vendors)
  const TruckDialog = () => {
    const [form, setForm] = useState(truckDialog.truck || { vehicle_number: '', type: '', capacity_kg: '', vehicle_type: '', vendor_vehicle: '', is_rented: false, is_busy: false, current_order: '' });
    return (
      <Dialog open={truckDialog.open} onClose={() => setTruckDialog({ open: false, truck: null, mode: 'add' })} maxWidth="xs" fullWidth>
        <DialogTitle>{truckDialog.mode === 'add' ? 'Add Truck' : 'Edit Truck'}</DialogTitle>
        <DialogContent>
          <TextField label="Vehicle Number" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Capacity (kg)" value={form.capacity_kg} onChange={e => setForm({ ...form, capacity_kg: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Vehicle Size" value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Vendor" value={form.vendor_vehicle} onChange={e => setForm({ ...form, vendor_vehicle: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Rented" value={form.is_rented} onChange={e => setForm({ ...form, is_rented: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Busy" value={form.is_busy} onChange={e => setForm({ ...form, is_busy: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Current Order" value={form.current_order} onChange={e => setForm({ ...form, current_order: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTruckDialog({ open: false, truck: null, mode: 'add' })} size="small">Cancel</Button>
          <Button onClick={() => handleTruckDialogSave(form)} size="small" variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    );
  };
  const VendorDialog = () => {
    const [form, setForm] = useState(vendorDialog.vendor || { vendor_place_name: '', approx_km: '', time_approx_hr: '' });
    return (
      <Dialog open={vendorDialog.open} onClose={() => setVendorDialog({ open: false, vendor: null, mode: 'add' })} maxWidth="xs" fullWidth>
        <DialogTitle>{vendorDialog.mode === 'add' ? 'Add Vendor' : 'Edit Vendor'}</DialogTitle>
        <DialogContent>
          <TextField label="Name" value={form.vendor_place_name} onChange={e => setForm({ ...form, vendor_place_name: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Approx Km" value={form.approx_km} onChange={e => setForm({ ...form, approx_km: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
          <TextField label="Time (hr)" value={form.time_approx_hr} onChange={e => setForm({ ...form, time_approx_hr: e.target.value })} size="small" fullWidth sx={{ mb: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVendorDialog({ open: false, vendor: null, mode: 'add' })} size="small">Cancel</Button>
          <Button onClick={() => handleVendorDialogSave(form)} size="small" variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 32 }} textColor="primary" indicatorColor="primary">
        <Tab label="Users" sx={{ fontSize: '0.95rem', minHeight: 32 }} />
        <Tab label="Trucks" sx={{ fontSize: '0.95rem', minHeight: 32 }} />
        <Tab label="Vendors" sx={{ fontSize: '0.95rem', minHeight: 32 }} />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Typography variant="subtitle1" mb={1} sx={{ fontWeight: 600, fontSize: '1.05rem' }}>User Management</Typography>
          {loadingUsers ? <CircularProgress size={20} /> : userError ? <Alert severity="error">{userError}</Alert> : (
            <Box>
              {userSuccess && <Alert severity="success" sx={{ mb: 2 }}>{userSuccess}</Alert>}
              <div style={{ height: 340, width: '100%' }}>
            <DataGrid
              rows={users.map((u, i) => ({ id: u.id || i, ...u }))}
                  columns={userColumns}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                  disableSelectionOnClick
                  autoHeight={false}
                  density="compact"
                  sx={{ fontSize: '0.95rem' }}
                />
              </div>
            </Box>
          )}
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>Truck Management</Typography>
            <Button onClick={handleAddTruck} size="small" startIcon={<AddIcon fontSize="small" />} variant="contained">Add Truck</Button>
          </Box>
          {loadingTrucks ? <CircularProgress size={20} /> : truckError ? <Alert severity="error">{truckError}</Alert> : (
            <Box>
              <div style={{ height: 340, width: '100%' }}>
                <DataGrid
                  rows={trucks.map((t, i) => ({ id: t.id || i, ...t }))}
                  columns={truckColumns}
                  pageSize={5}
                  rowsPerPageOptions={[5, 10, 20]}
                  disableSelectionOnClick
                  autoHeight={false}
                  density="compact"
                  sx={{ fontSize: '0.95rem' }}
                />
              </div>
            </Box>
          )}
          <TruckDialog />
          <Dialog open={deleteTruckDialog.open} onClose={() => setDeleteTruckDialog({ open: false, truck: null })}>
            <DialogTitle>Delete Truck</DialogTitle>
            <DialogContent>
              <Typography>Are you sure you want to delete truck <b>{deleteTruckDialog.truck?.vehicle_number}</b>?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteTruckDialog({ open: false, truck: null })} size="small">Cancel</Button>
              <Button onClick={handleTruckDeleteConfirm} color="error" variant="contained" size="small">Delete</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>Vendor Management</Typography>
            <Button onClick={handleAddVendor} size="small" startIcon={<AddIcon fontSize="small" />} variant="contained">Add Vendor</Button>
          </Box>
          {loadingVendors ? <CircularProgress size={20} /> : vendorError ? <Alert severity="error">{vendorError}</Alert> : (
            <Box>
              <div style={{ height: 340, width: '100%' }}>
                <DataGrid
                  rows={vendors.map((v, i) => ({ id: v['S/no'] || i, ...v }))}
                  columns={vendorColumns}
              pageSize={5}
              rowsPerPageOptions={[5, 10, 20]}
              disableSelectionOnClick
              autoHeight={false}
                  density="compact"
                  sx={{ fontSize: '0.95rem' }}
            />
          </div>
            </Box>
          )}
          <VendorDialog />
          <Dialog open={deleteVendorDialog.open} onClose={() => setDeleteVendorDialog({ open: false, vendor: null })}>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogContent>
              <Typography>Are you sure you want to delete vendor <b>{deleteVendorDialog.vendor?.vendor_place_name}</b>?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteVendorDialog({ open: false, vendor: null })} size="small">Cancel</Button>
              <Button onClick={handleVendorDeleteConfirm} color="error" variant="contained" size="small">Delete</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      {/* User Delete/Reset dialogs (unchanged) */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete user <b>{deleteDialog.user?.employee_name}</b>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })} size="small">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" size="small">Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, user: null })}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography mb={2}>Set a new password for <b>{resetDialog.user?.employee_name}</b>:</Typography>
          {resetError && <Alert severity="error" sx={{ mb: 1 }}>{resetError}</Alert>}
          {resetSuccess && <Alert severity="success" sx={{ mb: 1 }}>{resetSuccess}</Alert>}
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            fullWidth
            margin="normal"
            required
            helperText="At least 8 characters"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, user: null })} size="small">Cancel</Button>
          <Button onClick={handleResetPassword} color="primary" variant="contained" size="small">Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTab; 