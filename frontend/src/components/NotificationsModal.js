import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';

const NotificationsModal = ({ open, onClose, notifications, onSelectOrder }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
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
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            fontSize: 20
          }}>
            <NotificationsIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Pending Approvals
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
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 4, backgroundColor: '#f8fafc' }}>
        {notifications && notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((n, idx) => (
              <ListItem 
                button 
                key={idx} 
                onClick={() => onSelectOrder(n.order_id)}
                sx={{ 
                  mb: 1,
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  '&:hover': {
                    backgroundColor: '#f8fafc',
                    borderColor: '#2563eb',
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                      Order: {n.order_number}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Stage: {n.stage} ({n.required_role})
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: '#64748b', fontSize: '0.875rem' }}>
              No pending approvals.
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 4, pt: 0, backgroundColor: '#ffffff' }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{
            borderRadius: 2,
            fontSize: '0.875rem',
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

export default NotificationsModal; 