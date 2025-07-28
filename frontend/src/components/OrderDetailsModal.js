import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Chip, 
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  Security as SecurityIcon,
  Inventory as StoresIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';

const OrderDetailsModal = ({ open, onClose, order, user }) => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStage, setCurrentStage] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [availableTrucks, setAvailableTrucks] = useState([]);

  // Always fetch stages and set truck when modal opens or order changes
  useEffect(() => {
    if (open && order) {
      // Extract trucks from order
      let trucks = [];
      if (order.trucks) {
        if (Array.isArray(order.trucks)) {
          trucks = order.trucks;
        } else if (typeof order.trucks === 'string') {
          trucks = order.trucks.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      setAvailableTrucks(trucks);
      if (trucks.length > 0) {
        setSelectedTruck(trucks[0]);
      } else {
        setSelectedTruck('');
      }
      // Fetch approval stages
      loadStages(order.id);
    }
  }, [open, order]);

  // Fetch approval stages for the order
  const loadStages = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/stages`);
      setStages(response.data);
    } catch (err) {
      setError('Failed to load approval stages');
      console.error('Error loading stages:', err);
    }
  };

  // Get stages for the selected truck, or fallback to all stages if only one truck or no truck_number
  const getStagesForTruck = (truckNumber) => {
    if (!truckNumber) return stages;
    const filtered = stages.filter(stage => stage.truck_number === truckNumber);
    // Fallback: if only one truck, or if filtering returns nothing, show all stages
    if (
      filtered.length === 0 &&
      stages.length > 0 &&
      (!stages[0].truck_number || availableTrucks.length <= 1)
    ) {
      return stages;
    }
    return filtered;
  };

  // Approval logic
  const canUserApproveStage = (stage, stageIndex) => {
    if (!user || !stage) return false;
    if (stage.status !== 'pending') return false;
    const truckStages = getStagesForTruck(selectedTruck);
    for (let i = 0; i < stageIndex; i++) {
      if (truckStages[i] && truckStages[i].status !== 'completed') {
        return false;
      }
    }
    const stageName = stage.name;
    
    // Order Approved - only admin and purchase_team can approve
    if (stageName === 'Order Approved') {
      return user.role === 'admin' || user.role === 'purchase_team';
    }
    
    // Vehicle Entry/Exit - only security and admin can approve
    if (stageName.includes('Vehicle Entry') || stageName.includes('Vehicle Exit')) {
      return user.role === 'security' || user.role === 'admin';
    }
    
    // Consignment Verification - only stores and admin can approve
    if (stageName.includes('Consignment Verification')) {
      return user.role === 'stores' || user.role === 'admin';
    }
    
    // Admin can approve any stage
    if (user.role === 'admin') return true;
    
    return false;
  };

  const canUserRevokeReject = (stage) => {
    if (!user || !stage || stage.status !== 'rejected') return false;
    const stageName = stage.name;
    
    // Order Approved - only admin and purchase_team can revoke/reject
    if (stageName === 'Order Approved') {
      return user.role === 'admin' || user.role === 'purchase_team';
    }
    
    // Vehicle Entry/Exit - only security and admin can revoke/reject
    if (stageName.includes('Vehicle Entry') || stageName.includes('Vehicle Exit')) {
      return user.role === 'security' || user.role === 'admin';
    }
    
    // Consignment Verification - only stores and admin can revoke/reject
    if (stageName.includes('Consignment Verification')) {
      return user.role === 'stores' || user.role === 'admin';
    }
    
    // Admin can revoke/reject any stage
    if (user.role === 'admin') return true;
    
    return false;
  };

  const getStageIcon = (stageName) => {
    if (stageName.includes('Vehicle Entry') || stageName.includes('Vehicle Exit')) return <SecurityIcon />;
    if (stageName.includes('Consignment')) return <StoresIcon />;
    return <TruckIcon />;
  };

  const getStageColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'rejected': return 'error';
      case 'delayed': return 'warning';
      default: return 'default';
    }
  };

  // Approve/reject logic
  const handleApproveStage = async (stageName, action = 'approve') => {
    if (!notes.trim() && action === 'reached_with_comments') {
      setError('Comments are required for this action');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // Check if the stage exists for the selected truck
      const truckStages = getStagesForTruck(selectedTruck);
      const stageExistsForTruck = truckStages.some(s => s.name === stageName && s.status === 'pending');
      
      // If stage doesn't exist for selected truck, try without truck number
      const requestData = {
        user_id: user.id,
        stage_name: stageName,
        action,
        comments: notes
      };
      
      if (stageExistsForTruck && selectedTruck) {
        requestData.truck_number = selectedTruck;
      }
      
      const response = await axios.post(`/api/orders/${order.id}/approve-stage`, requestData);
      setStages(response.data.stages);
      setSuccess(`Stage ${action} successfully`);
      setNotes('');
      setCurrentStage(null);
      setTimeout(() => { setSuccess(''); }, 3000);
      if (typeof onClose === 'function') {
        onClose('refresh');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve stage');
      console.error('Error approving stage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeReject = async (stageName) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/orders/${order.id}/revoke-reject`, {
        user_id: user.id,
        stage_name: stageName,
        truck_number: selectedTruck
      });
      setStages(response.data.stages);
      setSuccess('Rejection revoked successfully');
      setTimeout(() => { setSuccess(''); }, 3000);
      if (typeof onClose === 'function') {
        onClose('refresh');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke rejection');
      console.error('Error revoking rejection:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          maxWidth: '1000px',
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        px: 4,
        py: 3,
        backgroundColor: '#ffffff',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            fontSize: 24
          }}>
            <TruckIcon fontSize="large" />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Order #{order.order_number}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ 
            color: '#64748b',
            p: 1,
            '&:hover': {
              backgroundColor: '#f1f5f9',
              color: '#2563eb'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, backgroundColor: '#f8fafc' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {success}
          </Alert>
        )}
        
        {/* Truck Selection */}
        {availableTrucks.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem', color: '#64748b' }}>Select Truck</InputLabel>
              <Select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                label="Select Truck"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: '0.875rem',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem',
                    color: '#64748b',
                  },
                }}
              >
                {availableTrucks.map((truck) => (
                  <MenuItem key={truck} value={truck}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TruckIcon fontSize="small" />
                      {truck}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        
        {/* Order Information */}
        <Card sx={{ mb: 4, borderRadius: 2, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" sx={{ mb: 3, color: '#1e293b', fontWeight: 600 }}>
                  Order Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                      Material:
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                      {order.material_type}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                      Weight:
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                      {order.material_weight} {order.weight_unit}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                      Status:
                    </Typography>
                    <Chip 
                      label={order.status || 'open'} 
                      color={order.status === 'closed' ? 'success' : 'primary'} 
                      sx={{ 
                        height: 24, 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        backgroundColor: order.status === 'closed' ? '#d1fae5' : '#dbeafe',
                        color: order.status === 'closed' ? '#059669' : '#2563eb'
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h5" sx={{ mb: 3, color: '#1e293b', fontWeight: 600 }}>
                  Route Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {order.transport_type === 'single' ? (
                    <>
                      {order.source_factory && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                            Source:
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                            {order.source_factory}
                          </Typography>
                        </Box>
                      )}
                      {order.dest_factories && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                            Destination:
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                            {Array.isArray(order.dest_factories) ? order.dest_factories.join(', ') : order.dest_factories}
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 80 }}>
                          Trip Type:
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                          Multiple Stages
                        </Typography>
                      </Box>
                      {order.trip_stages && (
                        <Box sx={{ mt: 2 }}>
                          {(() => {
                            try {
                              const stages = JSON.parse(order.trip_stages);
                              return stages.map((stage, index) => (
                                <Box key={stage.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2, mb: 1 }}>
                                  <Typography variant="body1" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', minWidth: 60 }}>
                                    Stage {stage.sequence}:
                                  </Typography>
                                  <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                                    {stage.source} → {stage.destination}
                                  </Typography>
                                </Box>
                              ));
                            } catch (e) {
                              return (
                                <Typography variant="body1" sx={{ fontSize: '0.875rem', color: '#ef4444' }}>
                                  Invalid stage data
                                </Typography>
                              );
                            }
                          })()}
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* Truck Information */}
        {selectedTruck && (
          <Card sx={{ mb: 4, borderRadius: 2, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TruckIcon sx={{ color: '#0369a1', fontSize: 24 }} />
                <Typography variant="h6" sx={{ color: '#0369a1', fontWeight: 600 }}>
                  Truck: {selectedTruck}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
        
        {/* Stage Progress */}
        <Typography variant="h5" sx={{ mb: 3, color: '#1e293b', fontWeight: 600 }}>
          Stage Progress {selectedTruck && `- ${selectedTruck}`}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {getStagesForTruck(selectedTruck).map((stage, idx) => {
            const canApprove = canUserApproveStage(stage, idx);
            const canRevoke = canUserRevokeReject(stage);
            const isCurrentStage = stage.status === 'pending';
            const isRejected = stage.status === 'rejected';
            const isBlocked = stage.status === 'pending' && !canApprove;
            return (
              <Card 
                key={`${stage.id || idx}-${stage.name}-${stage.truck_number || 'default'}`} 
                sx={{ 
                  borderRadius: 2,
                  border: isCurrentStage ? '2px solid #2563eb' : 
                           isRejected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  backgroundColor: isCurrentStage ? '#f8fafc' : 
                                  isRejected ? '#fef2f2' : '#ffffff',
                  opacity: isBlocked ? 0.6 : 1,
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: stage.status === 'completed' ? '#10b981' : 
                                        stage.status === 'rejected' ? '#ef4444' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}>
                        {stage.status === 'completed' ? 
                          <CheckIcon sx={{ fontSize: 18, color: 'white' }} /> : 
                          stage.status === 'rejected' ?
                          <span style={{ fontSize: '1rem', color: 'white' }}>✕</span> :
                          <span style={{ fontSize: '1rem', color: '#64748b' }}>{idx + 1}</span>
                        }
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {getStageIcon(stage.name)}
                        <Typography variant="body1" sx={{ 
                          fontWeight: 600, 
                          fontSize: '0.875rem',
                          color: isCurrentStage ? '#2563eb' : 
                                 isRejected ? '#ef4444' : '#1e293b',
                          lineHeight: 1.4
                        }}>
                          {stage.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip 
                        label={stage.status} 
                        size="small"
                        sx={{ 
                          height: 24, 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: stage.status === 'completed' ? '#d1fae5' : 
                                          stage.status === 'rejected' ? '#fef2f2' : '#f1f5f9',
                          color: stage.status === 'completed' ? '#059669' : 
                                 stage.status === 'rejected' ? '#ef4444' : '#64748b'
                        }}
                      />
                      {canApprove && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => {
                              if (stage.name.includes('Consignment Verification')) {
                                setCurrentStage(stage.name);
                              } else {
                                handleApproveStage(stage.name);
                              }
                            }}
                            disabled={loading}
                            sx={{ 
                              borderRadius: 1.5,
                              fontSize: '0.75rem',
                              height: 28,
                              px: 1.5,
                              minWidth: '60px',
                              backgroundColor: '#10b981',
                              '&:hover': {
                                backgroundColor: '#059669',
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleApproveStage(stage.name, 'reject')}
                            disabled={loading}
                            sx={{ 
                              borderRadius: 1.5,
                              fontSize: '0.75rem',
                              height: 28,
                              px: 1.5,
                              minWidth: '60px',
                              backgroundColor: '#ef4444',
                              '&:hover': {
                                backgroundColor: '#dc2626',
                              }
                            }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                      {canRevoke && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleRevokeReject(stage.name)}
                          disabled={loading}
                          sx={{ 
                            borderRadius: 1.5, 
                            fontSize: '0.75rem', 
                            height: 28, 
                            px: 1.5, 
                            minWidth: '60px',
                            borderColor: '#f59e0b',
                            color: '#f59e0b',
                            '&:hover': {
                              borderColor: '#d97706',
                              backgroundColor: '#fef3c7',
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Comments for current stage */}
                  {isCurrentStage && canApprove && stage.name.includes('Consignment Verification') && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        label="Comments"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            fontSize: '0.875rem',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.875rem',
                            color: '#64748b',
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleApproveStage(stage.name, 'reached_with_comments')}
                        disabled={loading || !notes.trim()}
                        sx={{ 
                          borderRadius: 1.5, 
                          fontSize: '0.75rem', 
                          height: 40, 
                          px: 2, 
                          minWidth: '60px',
                          backgroundColor: '#2563eb',
                          '&:hover': {
                            backgroundColor: '#1d4ed8',
                          }
                        }}
                      >
                        Approve with Comments
                      </Button>
                    </Box>
                  )}
                  
                  {/* Comments and history */}
                  {stage.comments && (
                    <Typography variant="body2" sx={{ mt: 2, color: '#64748b', fontSize: '0.875rem' }}>
                      {stage.comments}
                    </Typography>
                  )}
                  {(stage.approver && stage.timestamp) && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
                      {stage.status === 'completed' ? 'Approved' : stage.status === 'rejected' ? 'Rejected' : 'Actioned'} by {stage.approver}
                      {stage.department_name ? ` (${stage.department_name})` : ''}
                      {' at ' + new Date(stage.timestamp).toLocaleString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </DialogContent>
      
      {/* Close button */}
      <DialogActions sx={{ p: 4, pt: 0, backgroundColor: '#ffffff' }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          sx={{ 
            borderRadius: 2,
            fontSize: '0.875rem',
            px: 3,
            py: 1.5,
            fontWeight: 600,
            borderColor: '#d1d5db',
            color: '#374151',
            '&:hover': {
              borderColor: '#2563eb',
              color: '#2563eb',
              backgroundColor: '#f8fafc',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailsModal; 