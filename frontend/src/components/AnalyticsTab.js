import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Paper, Chip, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import axios from 'axios';

const columns = [
  { field: 'order_number', headerName: 'Order #', width: 120 },
  { field: 'material_type', headerName: 'Material Type', width: 200 },
  { field: 'material_weight', headerName: 'Weight', width: 100 },
  { field: 'weight_unit', headerName: 'Unit', width: 80 },
  { field: 'invoice_amount', headerName: 'Invoice Amount', width: 120 },
  { 
    field: 'transport_type', 
    headerName: 'Trip Type', 
    width: 120,
    renderCell: (params) => (
      <Chip 
        label={params.value === 'single' ? 'Single' : 'Multiple'} 
        color={params.value === 'single' ? 'primary' : 'secondary'}
        size="small"
      />
    )
  },
  { 
    field: 'trip_stages', 
    headerName: 'Trip Stages', 
    width: 200,
    renderCell: (params) => {
      if (!params.value) return '-';
      try {
        const stages = JSON.parse(params.value);
        if (stages.length === 0) return '-';
        
        const stageText = stages.map(stage => 
          `${stage.sequence}: ${stage.source} → ${stage.destination}`
        ).join(', ');
        
        return (
          <Tooltip title={stageText} placement="top">
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {stages.length} stage{stages.length > 1 ? 's' : ''}
            </Typography>
          </Tooltip>
        );
      } catch (e) {
        return '-';
      }
    }
  },
  { field: 'created_at', headerName: 'Created At', width: 180 },
];

const AnalyticsTab = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day'));
  const [endDate, setEndDate] = useState(dayjs());

  useEffect(() => {
    setLoading(true);
    axios.get('/api/orders')
      .then(res => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load orders');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Filter orders by date range
    const filtered = orders.filter(order => {
      const date = dayjs(order.created_at);
      return date.isAfter(startDate.subtract(1, 'day')) && date.isBefore(endDate.add(1, 'day'));
    });
    setFilteredOrders(filtered);
  }, [orders, startDate, endDate]);

  // Prepare chart data: count orders per day
  const chartData = (() => {
    const counts = {};
    filteredOrders.forEach(order => {
      const day = dayjs(order.created_at).format('YYYY-MM-DD');
      counts[day] = (counts[day] || 0) + 1;
    });
    return Object.keys(counts).sort().map(day => ({ date: day, orders: counts[day] }));
  })();

  // Prepare transport type distribution data
  const transportTypeData = (() => {
    const counts = { single: 0, multiple: 0 };
    filteredOrders.forEach(order => {
      const type = order.transport_type || 'single';
      counts[type] = (counts[type] || 0) + 1;
    });
    return [
      { name: 'Single Trip', value: counts.single, color: '#1976d2' },
      { name: 'Multiple Trip', value: counts.multiple, color: '#dc004e' }
    ].filter(item => item.value > 0);
  })();

  // Prepare trip stages analysis
  const tripStagesAnalysis = (() => {
    const stageCounts = {};
    const sourceDestinations = {};
    
    filteredOrders.forEach(order => {
      if (order.transport_type === 'multiple' && order.trip_stages) {
        try {
          const stages = JSON.parse(order.trip_stages);
          const stageCount = stages.length;
          stageCounts[stageCount] = (stageCounts[stageCount] || 0) + 1;
          
          stages.forEach(stage => {
            const route = `${stage.source} → ${stage.destination}`;
            sourceDestinations[route] = (sourceDestinations[route] || 0) + 1;
          });
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
    
    return { stageCounts, sourceDestinations };
  })();

  return (
    <Box>
      <Typography variant="h6" mb={2}>Order Analytics</Typography>
      <Box display="flex" gap={2} mb={2}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          maxDate={endDate}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={setEndDate}
          minDate={startDate}
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Box display="flex" gap={2} mb={3}>
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle1" mb={1}>Orders per Day</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="orders" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
            
            <Paper sx={{ p: 2, flex: 1 }}>
              <Typography variant="subtitle1" mb={1}>Transport Type Distribution</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={transportTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {transportTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          {/* Trip Stages Analysis */}
          {Object.keys(tripStagesAnalysis.stageCounts).length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" mb={1}>Multi-Stage Trip Analysis</Typography>
              <Box display="flex" gap={2}>
                <Box flex={1}>
                  <Typography variant="body2" mb={1} fontWeight="bold">Stage Count Distribution:</Typography>
                  {Object.entries(tripStagesAnalysis.stageCounts).map(([count, frequency]) => (
                    <Typography key={count} variant="body2">
                      {count} stage{count > 1 ? 's' : ''}: {frequency} order{frequency > 1 ? 's' : ''}
                    </Typography>
                  ))}
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" mb={1} fontWeight="bold">Most Common Routes:</Typography>
                  {Object.entries(tripStagesAnalysis.sourceDestinations)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([route, frequency]) => (
                      <Typography key={route} variant="body2">
                        {route}: {frequency} time{frequency > 1 ? 's' : ''}
                      </Typography>
                    ))}
                </Box>
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" mb={1}>Orders Table</Typography>
            <div style={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={filteredOrders.map((o, i) => ({ id: o.id || i, ...o }))}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5, 10, 20]}
                disableSelectionOnClick
                autoHeight={false}
              />
            </div>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AnalyticsTab; 