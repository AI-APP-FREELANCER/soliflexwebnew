import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';

const Landing = ({ employeeName, departmentName, onLogout }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        p: 3
      }}
    >
      <Card sx={{ 
        maxWidth: 500, 
        width: '100%',
        borderRadius: 3,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff'
      }}>
        <CardContent sx={{ p: 6, textAlign: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            fontSize: 32,
            mx: 'auto',
            mb: 3
          }}>
            <PersonIcon fontSize="large" />
          </Box>
          
          <Typography variant="h4" sx={{ 
            mb: 2, 
            fontWeight: 700,
            color: '#1e293b'
          }}>
            Welcome, {employeeName}!
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 1,
            mb: 4,
            p: 2,
            backgroundColor: '#f8fafc',
            borderRadius: 2,
            border: '1px solid #e2e8f0'
          }}>
            <BusinessIcon sx={{ color: '#64748b', fontSize: 20 }} />
            <Typography variant="h6" sx={{ 
              color: '#64748b',
              fontWeight: 500,
              fontSize: '1rem'
            }}>
              Department: {departmentName}
            </Typography>
          </Box>
          
          <Button 
            variant="outlined" 
            onClick={onLogout} 
            size="large"
            sx={{
              borderRadius: 2,
              fontSize: '0.875rem',
              px: 4,
              py: 1.5,
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': {
                borderColor: '#2563eb',
                color: '#2563eb',
                backgroundColor: '#f8fafc',
              }
            }}
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Landing; 