import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box, Chip, Divider, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RouteIcon from '@mui/icons-material/Route';

const OrderCard = ({ order, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
        return { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
      case 'in_progress':
        return { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' };
      default:
        return { bg: '#fef3c7', color: '#d97706', border: '#fed7aa' };
    }
  };

  const getTransportTypeColor = (type) => {
    switch (type) {
      case 'multiple':
        return { bg: '#f3e8ff', color: '#7c3aed', border: '#ddd6fe' };
      default:
        return { bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
    }
  };

  const statusStyle = getStatusColor(order.status);
  const transportStyle = getTransportTypeColor(order.transport_type);

  // Parse trip stages for display
  const getTripStagesInfo = () => {
    if (order.transport_type === 'single') {
      return {
        type: 'Single Trip',
        route: order.source_factory && order.dest_factories ? 
          `${order.source_factory} → ${order.dest_factories.split(',')[0]}` : 
          'Route not specified'
      };
    } else if (order.transport_type === 'multiple' && order.trip_stages) {
      try {
        const stages = JSON.parse(order.trip_stages);
        if (stages.length === 0) return { type: 'Multiple Trip', route: 'No stages defined' };
        
        const routeText = stages.map(stage => 
          `${stage.source} → ${stage.destination}`
        ).join(', ');
        
        return {
          type: 'Multiple Trip',
          route: routeText,
          stageCount: stages.length
        };
      } catch (e) {
        return { type: 'Multiple Trip', route: 'Invalid stage data' };
      }
    }
    return { type: 'Unknown', route: 'Route not specified' };
  };

  const tripInfo = getTripStagesInfo();

  return (
    <Card 
      sx={{
        height: 200,
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1.5px solid #e2e8f0',
        cursor: 'pointer',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        transition: 'border-color 0.2s cubic-bezier(.4,0,.2,1)',
        p: 2,
        gap: 1.2,
        '&:hover': {
          border: '1.5px solid #2563eb',
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontSize: '0.95rem',
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {order.order_number}
        </Typography>
        <Chip
          label={order.status.replace('_', ' ')}
          size="small"
          sx={{
            fontSize: '0.7rem',
            height: 22,
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
            fontWeight: 600,
            mr: 0.5,
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        />
        <Chip
          label={order.trip_type || order.tripType || 'Single Trip'}
          size="small"
          sx={{
            fontSize: '0.7rem',
            height: 22,
            backgroundColor: '#d1fae5',
            color: '#047857',
            fontWeight: 600,
            maxWidth: 90,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        />
      </Box>
      <Divider sx={{ mb: 1, mt: 0.5 }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}
          >
            MATERIAL TYPE
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.82rem',
              color: '#1e293b',
              fontWeight: 500,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {order.material_type}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.72rem', minWidth: 80 }}
          >
            WEIGHT
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.82rem',
              color: '#1e293b',
              fontWeight: 500,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {order.material_weight} {order.weight_unit}
          </Typography>
        </Box>
        {/* Add similar ellipsis and alignment for other fields as needed */}
      </Box>
    </Card>
  );
};

export default OrderCard; 