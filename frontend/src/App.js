import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Grid, ThemeProvider, createTheme } from '@mui/material';

import React, { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Landing from './components/Landing';

import NewRFQDialog from './components/NewRFQDialog';
import AnalyticsTab from './components/AnalyticsTab';
import AdminTab from './components/AdminTab';
import NotificationsModal from './components/NotificationsModal';
import OrderDetailsModal from './components/OrderDetailsModal';
import OrderCard from './components/OrderCard';
import axios from 'axios';
import { CssBaseline, Box, Tabs, Tab, Typography, Paper, TextField, MenuItem, Alert, Button, Tooltip, IconButton, Badge, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';

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

// Helper function to calculate ETA between locations
const calculateETA = (sourceLocation, destinationLocation) => {
  // This would typically call a mapping API or use predefined distances
  // For now, return a placeholder calculation
  const baseTime = 2; // hours
  const distance = 100; // km (placeholder)
  return Math.round(baseTime + (distance / 50)); // Rough estimate: 2 hours + distance/50
};

// Clean, modern theme with consistent design system
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Modern blue
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b', // Slate gray
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    action: {
      hover: '#f1f5f9',
      selected: '#dbeafe',
      disabled: '#cbd5e1',
      disabledBackground: '#f1f5f9',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    success: {
      main: '#10b981',
    },
    info: {
      main: '#06b6d4',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2,
      color: '#1e293b',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
      lineHeight: 1.3,
      color: '#1e293b',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#1e293b',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#64748b',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: 0.025,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '0.875rem',
          minHeight: '40px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
        contained: {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1d4ed8',
          },
        },
        outlined: {
          borderColor: '#d1d5db',
          color: '#374151',
          '&:hover': {
            borderColor: '#2563eb',
            color: '#2563eb',
            backgroundColor: '#f8fafc',
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.75rem',
          minHeight: '32px',
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1rem',
          minHeight: '48px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 48,
          padding: '12px 16px',
          borderRadius: 6,
          margin: '0 4px',
          color: '#64748b',
          '&.Mui-selected': {
            color: '#2563eb',
            backgroundColor: '#dbeafe',
          },
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '2px',
          backgroundColor: '#2563eb',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            fontSize: '0.875rem',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2563eb',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem',
            color: '#64748b',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.75rem',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [departmentName, setDepartmentName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [showNotAuthAlert, setShowNotAuthAlert] = useState(false);

  // Check if user is admin (only admin team can see admin tab)
  const isAdmin = user && user.role === 'admin';

  const tabLabels = isAdmin ? ['Dashboard', 'Analytics', 'Admin'] : ['Dashboard', 'Analytics'];

  // Check if user can create RFQ
  const canCreateRFQ = user && ['admin', 'logistics', 'purchase', 'purchase_team'].includes(user.role);

  // Check if user can approve stages (this is now handled per-stage in OrderDetailsModal)
  const canApprove = user && ['admin', 'security', 'stores', 'purchase_team'].includes(user.role);

  // Filter orders by status
  const inProgressOrders = orders.filter(o => o.status === 'in_progress');
  const openOrders = orders.filter(o => o.status === 'open');
  const completedOrders = orders.filter(o => o.status === 'closed');

  const fetchDepartmentName = async (departmentId) => {
    try {
      const response = await axios.get(`/api/departments/${departmentId}`);
      setDepartmentName(response.data.name);
    } catch (err) {
      console.error('Error fetching department name:', err);
    }
  };

  const handleRegisterSuccess = () => {
    setTab(1); // Switch to login tab
  };

  const handleLoginSuccess = (userInfo) => {
    setUser(userInfo);
    setTab(0);
    if (userInfo.department_id) {
      fetchDepartmentName(userInfo.department_id);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setOrders([]);
    setSelectedOrder(null);
    setNotifications([]);
    setDepartmentName('');
    setTab(0);
  };

  const handleLogoutConfirm = () => {
    handleLogout();
    setShowLogoutConfirmation(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirmation(false);
  };

  const fetchNotifications = () => {
    if (!user) return;
    
    axios.get('/api/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      setNotifications(res.data);
    })
    .catch(err => {
      console.error('Error fetching notifications:', err);
    });
  };

  const handleStageApproved = () => {
    fetchOrders();
    fetchNotifications();
  };

  const fetchOrders = () => {
    if (!user) return;
    
    setLoading(true);
    axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      setOrders(res.data);
    })
    .catch(err => {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const handleNewRFQClick = () => {
    if (!canCreateRFQ) {
      setShowNotAuthAlert(true);
      setTimeout(() => setShowNotAuthAlert(false), 3000);
      return;
    }
    setShowRFQDialog(true);
  };



  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        if (res.data.department_id) {
          fetchDepartmentName(res.data.department_id);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, []);

  // Fetch data when user changes
  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchNotifications();
    }
  }, [user]);

  if (user) {
    return (
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          <Box sx={{ 
            minHeight: '100vh', 
            backgroundColor: '#f8fafc',
            pb: 4
          }}>
            {/* Header */}
            <Box sx={{ 
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              py: 3,
              px: 4,
              mb: 4
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                maxWidth: 1200,
                mx: 'auto'
              }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                    Soliflex
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Logistics Management System
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {canCreateRFQ && (
                    <Button 
                      variant="contained" 
                      onClick={handleNewRFQClick} 
                      startIcon={<AddIcon />}
                      sx={{ 
                        backgroundColor: '#2563eb',
                        '&:hover': { backgroundColor: '#1d4ed8' }
                      }}
                    >
                      New RFQ
                    </Button>
                  )}
                  
                  <Tooltip title="Notifications" arrow>
                    <IconButton 
                      onClick={() => setShowNotifications(true)}
                      sx={{ 
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        '&:hover': {
                          backgroundColor: '#dbeafe',
                          color: '#2563eb'
                        }
                      }}
                    >
                      <Badge 
                        badgeContent={notifications.length} 
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }
                        }}
                      >
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    pl: 2,
                    borderLeft: '1px solid #e2e8f0'
                  }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {user.employee_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {departmentName}
                      </Typography>
                    </Box>
                    <Avatar 
                      sx={{ 
                        width: 40, 
                        height: 40,
                        backgroundColor: '#2563eb',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}
                    >
                      {user.employee_name ? user.employee_name[0].toUpperCase() : '?'}
                    </Avatar>
                    <Button
                      onClick={() => setShowLogoutConfirmation(true)}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: '#d1d5db',
                        color: '#374151',
                        '&:hover': {
                          borderColor: '#2563eb',
                          color: '#2563eb',
                          backgroundColor: '#f8fafc',
                        }
                      }}
                    >
                      Sign Out
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            {/* Navigation */}
            <Box sx={{ px: 4, mb: 4 }}>
              <Paper sx={{ 
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                border: '1px solid #e2e8f0'
              }}>
                <Tabs 
                  value={tab} 
                  onChange={(_, v) => setTab(v)} 
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#2563eb',
                      height: 3,
                    },
                    '& .MuiTab-root.Mui-selected': {
                      color: '#2563eb',
                      backgroundColor: '#dbeafe',
                    },
                  }}
                >
                  {tabLabels.map((label, idx) => (
                    <Tab 
                      key={label} 
                      label={label}
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        minHeight: 48,
                        borderRadius: 1,
                        mx: 0.5,
                        '&:hover': {
                          backgroundColor: '#f1f5f9',
                        }
                      }}
                    />
                  ))}
                </Tabs>
              </Paper>
            </Box>
            
            {/* New RFQ Dialog */}
            <NewRFQDialog
              open={showRFQDialog}
              onClose={() => setShowRFQDialog(false)}
              onSubmit={() => {
                setShowRFQDialog(false);
                fetchOrders();
              }}
              userId={user.id}
            />
            
            {/* Notifications Modal */}
            <NotificationsModal
              open={showNotifications}
              onClose={() => setShowNotifications(false)}
              notifications={notifications}
              onSelectOrder={orderId => {
                setShowNotifications(false);
                const order = orders.find(o => String(o.id) === String(orderId));
                if (order) setSelectedOrder(order);
              }}
            />
            
            {/* Main Content */}
            <Box sx={{ px: 4, maxWidth: 1200, mx: 'auto' }}>
              <Paper sx={{ 
                p: 4, 
                minHeight: 400,
                borderRadius: 2,
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                border: '1px solid #e2e8f0'
              }}>
                {tab === 0 && (
                  <>
                    
                    {/* In-Progress Orders Section */}
                    {inProgressOrders.length > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 3,
                          pb: 2,
                          borderBottom: '2px solid #2563eb'
                        }}>
                          <Box sx={{ 
                            width: 4, 
                            height: 20, 
                            backgroundColor: '#2563eb', 
                            borderRadius: '2px',
                            mr: 2
                          }} />
                          <Typography variant="h5" sx={{ 
                            color: '#1e293b',
                            fontWeight: 600
                          }}>
                            Active Orders
                          </Typography>
                          <Box sx={{ 
                            ml: 2,
                            backgroundColor: '#dbeafe',
                            color: '#2563eb',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}>
                            {inProgressOrders.length} {inProgressOrders.length === 1 ? 'order' : 'orders'}
                          </Box>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {inProgressOrders.map(order => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                              <OrderCard order={order} onClick={() => setSelectedOrder(order)} />
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                    
                    {/* Open Orders Section */}
                    {openOrders.length > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          mb: 3,
                          pb: 2,
                          borderBottom: '2px solid #f59e0b'
                        }}>
                          <Box sx={{ 
                            width: 4, 
                            height: 20, 
                            backgroundColor: '#f59e0b', 
                            borderRadius: '2px',
                            mr: 2
                          }} />
                          <Typography variant="h5" sx={{ 
                            color: '#1e293b',
                            fontWeight: 600
                          }}>
                            Open Orders
                          </Typography>
                          <Box sx={{ 
                            ml: 2,
                            backgroundColor: '#fef3c7',
                            color: '#d97706',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontWeight: 600,
                            fontSize: '0.875rem'
                          }}>
                            {openOrders.length} {openOrders.length === 1 ? 'order' : 'orders'}
                          </Box>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {openOrders.map(order => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                              <OrderCard order={order} onClick={() => setSelectedOrder(order)} />
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                    
                    {/* Completed Orders Section */}
                    {completedOrders.length > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          mb: 3,
                          pb: 2,
                          borderBottom: '2px solid #10b981'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ 
                              width: 4, 
                              height: 20, 
                              backgroundColor: '#10b981', 
                              borderRadius: '2px',
                              mr: 2
                            }} />
                            <Typography variant="h5" sx={{ 
                              color: '#1e293b',
                              fontWeight: 600
                            }}>
                              Completed Orders
                            </Typography>
                            <Box sx={{ 
                              ml: 2,
                              backgroundColor: '#d1fae5',
                              color: '#059669',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}>
                              {completedOrders.length} {completedOrders.length === 1 ? 'order' : 'orders'}
                            </Box>
                          </Box>
                          
                          {/* Show/Hide button */}
                          {(inProgressOrders.length > 0 || openOrders.length > 0) && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setShowCompletedOrders(!showCompletedOrders)}
                              sx={{
                                borderColor: '#10b981',
                                color: '#10b981',
                                '&:hover': {
                                  borderColor: '#059669',
                                  backgroundColor: '#f0fdf4',
                                }
                              }}
                            >
                              {showCompletedOrders ? 'Hide Completed' : 'Show Completed'}
                            </Button>
                          )}
                        </Box>
                        
                        {/* Show completed orders if no active orders, or if showCompletedOrders is true */}
                        {((inProgressOrders.length === 0 && openOrders.length === 0) || showCompletedOrders) && (
                          <Grid container spacing={2}>
                            {completedOrders.map(order => (
                              <Grid item xs={12} sm={6} md={4} lg={3} key={order.id}>
                                <OrderCard order={order} onClick={() => setSelectedOrder(order)} />
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                    
                    {/* No Orders State */}
                    {inProgressOrders.length === 0 && openOrders.length === 0 && completedOrders.length === 0 && (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 8,
                        color: '#64748b'
                      }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          No orders found
                        </Typography>
                        <Typography variant="body2">
                          Orders will appear here once they are created
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                {tab === 1 && (
                  <>
                    <AnalyticsTab />
                  </>
                )}
                {tab === 2 && isAdmin && (
                  <>
                    <AdminTab adminId={user.id} />
                  </>
                )}
              </Paper>
            </Box>
            
            {/* Order Details Modal */}
            <OrderDetailsModal 
              open={!!selectedOrder} 
              onClose={(action) => {
                if (action === 'refresh') {
                  fetchOrders();
                } else {
                  setSelectedOrder(null);
                }
              }} 
              order={selectedOrder} 
              user={user} 
            />
            
            {showNotAuthAlert && (
              <Alert 
                severity="warning" 
                sx={{ 
                  position: 'fixed', 
                  top: 100, 
                  right: 24, 
                  zIndex: 1500,
                  borderRadius: 2,
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              >
                You are not authorized to place new orders.
              </Alert>
            )}
            

          </Box>
          
          {/* Logout Confirmation Dialog */}
          <Dialog
            open={showLogoutConfirmation}
            onClose={handleLogoutCancel}
            maxWidth="xs"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              }
            }}
          >
            <DialogTitle sx={{ 
              pb: 1,
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e293b'
            }}>
              Confirm Sign Out
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Are you sure you want to sign out? Any unsaved changes will be lost.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1 }}>
              <Button
                onClick={handleLogoutCancel}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogoutConfirm}
                variant="contained"
                size="small"
                sx={{
                  backgroundColor: '#ef4444',
                  '&:hover': { backgroundColor: '#dc2626' }
                }}
              >
                Sign Out
              </Button>
            </DialogActions>
          </Dialog>
        </LocalizationProvider>
      </ThemeProvider>
    );
  }

  // User not logged in - show login/register with tabs
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}>
          <Box maxWidth={450} width="100%">
            <Paper sx={{ 
              p: 6, 
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0'
            }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h2" sx={{ 
                  fontWeight: 700,
                  color: '#1e293b',
                  mb: 1
                }}>
                  Soliflex
                </Typography>

              </Box>

              {/* Tabs */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', borderRadius: 2, bgcolor: '#f1f5f9', p: 0.5 }}>
                  <Button
                    fullWidth
                    variant={tab === 0 ? 'contained' : 'text'}
                    onClick={() => setTab(0)}
                    sx={{
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 1.5,
                      color: tab === 0 ? '#fff' : '#64748b',
                      bgcolor: tab === 0 ? '#2563eb' : 'transparent',
                      '&:hover': {
                        bgcolor: tab === 0 ? '#1d4ed8' : 'rgba(37, 99, 235, 0.1)',
                      }
                    }}
                  >
                    Register
                  </Button>
                  <Button
                    fullWidth
                    variant={tab === 1 ? 'contained' : 'text'}
                    onClick={() => setTab(1)}
                    sx={{
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 1.5,
                      color: tab === 1 ? '#fff' : '#64748b',
                      bgcolor: tab === 1 ? '#2563eb' : 'transparent',
                      '&:hover': {
                        bgcolor: tab === 1 ? '#1d4ed8' : 'rgba(37, 99, 235, 0.1)',
                      }
                    }}
                  >
                    Login
                  </Button>
                </Box>
              </Box>

              {/* Form Content */}
              <Box>
                {tab === 0 && <Register onRegisterSuccess={handleRegisterSuccess} />}
                {tab === 1 && <Login onLoginSuccess={handleLoginSuccess} />}
              </Box>
            </Paper>
          </Box>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
