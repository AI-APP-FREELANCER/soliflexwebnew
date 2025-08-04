import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  MenuItem,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const Register = ({ onRegisterSuccess }) => {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    employee_name: '',
    password: '',
    confirm_password: '',
    department_id: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(() => setError('Failed to load departments'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.employee_name || !formData.password || !formData.department_id) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_name: formData.employee_name,
          password: formData.password,
          department_id: formData.department_id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onRegisterSuccess(data);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box sx={{ 
      height: 'auto',
      minHeight: 'auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      px: 0.3,
      pt: 1,
      pb: 1
    }}>
      <Paper sx={{ 
        p: 3, 
        maxWidth: 500, 
        width: '100%',
        borderRadius: 3,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0'
      }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Register Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Employee Name"
            name="employee_name"
            value={formData.employee_name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                  borderWidth: '2px',
                },
              }
            }}
            InputLabelProps={{
              sx: {
                fontSize: '0.875rem',
                color: '#64748b',
                '&.Mui-focused': {
                  color: '#2563eb',
                }
              }
            }}
          />

          <TextField
            select
            fullWidth
            label="Department"
            name="department_id"
            value={formData.department_id}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              sx: {
                borderRadius: 2,
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                  borderWidth: '2px',
                },
              }
            }}
            InputLabelProps={{
              sx: {
                fontSize: '0.875rem',
                color: '#64748b',
                '&.Mui-focused': {
                  color: '#2563eb',
                }
              }
            }}
          >
            {departments.sort((a, b) => a.department_name.localeCompare(b.department_name)).map(dep => (
              <MenuItem key={dep.id} value={dep.id}>
                {dep.department_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#64748b' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                  borderWidth: '2px',
                },
              }
            }}
            InputLabelProps={{
              sx: {
                fontSize: '0.875rem',
                color: '#64748b',
                '&.Mui-focused': {
                  color: '#2563eb',
                }
              }
            }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirm_password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirm_password}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{ color: '#64748b' }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                fontSize: '0.875rem',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2563eb',
                  borderWidth: '2px',
                },
              }
            }}
            InputLabelProps={{
              sx: {
                fontSize: '0.875rem',
                color: '#64748b',
                '&.Mui-focused': {
                  color: '#2563eb',
                }
              }
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: '#2563eb',
              '&:hover': {
                backgroundColor: '#1d4ed8',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              },
              '&:disabled': {
                backgroundColor: '#cbd5e1',
                color: '#64748b',
                boxShadow: 'none',
              }
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Register; 