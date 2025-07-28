import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Avatar, IconButton, Tooltip, Box, Alert, Badge, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddIcon from '@mui/icons-material/Add';

const TopBar = ({ showNewRFQButton, onNewRFQClick, userName, notAuthorizedMsg, notificationCount, onBellClick, onLogout }) => {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  return (
    <>
      <AppBar 
        position="static" 
        color="default" 
        elevation={0}
        sx={{ 
          mb: 3,
          background: '#ffffff',
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          mx: 3,
          mt: 1.5
        }}
      >
        <Toolbar sx={{ px: 3, py: 1.5, minHeight: '60px' }}>
          {showNewRFQButton && (
            <Button
              variant="contained"
              onClick={onNewRFQClick} 
              startIcon={<AddIcon />}
              size="medium"
              sx={{ 
                mr: 2,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                fontSize: '0.875rem',
                backgroundColor: '#2563eb',
                '&:hover': {
                  backgroundColor: '#1d4ed8',
                }
              }}
            >
              New RFQ
            </Button>
          )}
          {!showNewRFQButton && notAuthorizedMsg && (
            <Box sx={{ mr: 2 }}>
              <Alert 
                severity="info" 
                sx={{ 
                  py: 0.5, 
                  px: 2, 
                  fontSize: '0.875rem',
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    color: '#2563eb'
                  }
                }}
              >
                {notAuthorizedMsg}
              </Alert>
            </Box>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Notifications" arrow>
            <IconButton 
              color="inherit" 
              onClick={onBellClick}
              size="medium"
              sx={{ 
                mr: 2,
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                '&:hover': {
                  backgroundColor: '#e2e8f0',
                  color: '#2563eb'
                }
              }}
            >
              <Badge 
                badgeContent={notificationCount} 
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    height: '20px',
                    minWidth: '20px'
                  }
                }}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {userName}
              </Typography>
            </Box>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40,
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.875rem',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
            >
              {userName ? userName[0].toUpperCase() : '?'}
            </Avatar>
            {onLogout && (
              <Button
                onClick={handleLogoutClick}
                variant="outlined"
                size="medium"
                sx={{
                  ml: 1,
                  borderRadius: 2,
                  borderColor: '#d1d5db',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  px: 2,
                  py: 1,
                  '&:hover': {
                    borderColor: '#2563eb',
                    color: '#2563eb',
                    backgroundColor: '#f8fafc',
                  }
                }}
              >
                Sign Out
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        maxWidth="xs"
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
          pb: 2,
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#1e293b'
        }}>
          Confirm Sign Out
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body1" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
            Are you sure you want to sign out? Any unsaved changes will be lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleLogoutCancel}
            variant="outlined"
            size="medium"
            sx={{
              borderRadius: 2,
              borderColor: '#d1d5db',
              color: '#64748b',
              '&:hover': {
                borderColor: '#2563eb',
                color: '#2563eb',
                backgroundColor: '#f8fafc',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            size="medium"
            sx={{
              borderRadius: 2,
              backgroundColor: '#ef4444',
              '&:hover': {
                backgroundColor: '#dc2626',
              }
            }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TopBar; 