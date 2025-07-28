import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Alert, Box, Radio, RadioGroup, FormControlLabel, IconButton, Typography, Divider, Checkbox, FormControlLabel as MuiFormControlLabel, Card, CardContent, Grid, Tooltip, Chip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FactoryIcon from '@mui/icons-material/Factory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ScaleIcon from '@mui/icons-material/Scale';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import axios from 'axios';



const NewRFQDialog = ({ open, onClose, onSubmit, userId }) => {
  const [materialType, setMaterialType] = useState('');
  const [materialWeight, setMaterialWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('Number of items');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [sgst, setSgst] = useState('');
  const [cgst, setCgst] = useState('');
  const [tariffHsn, setTariffHsn] = useState('');
  const [vehicleHeight, setVehicleHeight] = useState('');
  const [vehicleHeightOption, setVehicleHeightOption] = useState('');
  const [toll, setToll] = useState('');
  const [haltingDays, setHaltingDays] = useState('');
  const [haltingCharge, setHaltingCharge] = useState('');
  const [extraPointPickup, setExtraPointPickup] = useState('');
  const [poRate, setPoRate] = useState('');
  const [actualPayable, setActualPayable] = useState('');
  const [debitNote, setDebitNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorPlaces, setVendorPlaces] = useState([]);
  const [transportType, setTransportType] = useState('single');
  
  // Single trip state
  const [sourceFactory, setSourceFactory] = useState('');
  const [destFactories, setDestFactories] = useState(['']);
  
  // Multiple trip state - stages
  const [tripStages, setTripStages] = useState([
    { id: 1, source: '', destination: '', sequence: 1 }
  ]);
  
  const [truckSuggestions, setTruckSuggestions] = useState([]);
  const [selectedTruckSuggestion, setSelectedTruckSuggestion] = useState(null);
  const [useManualTrucks, setUseManualTrucks] = useState(false);
  const [manualTrucks, setManualTrucks] = useState('');
  const [truckLoading, setTruckLoading] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [allowManualEntry, setAllowManualEntry] = useState(false);
  const [useCombinedTrucks, setUseCombinedTrucks] = useState(false);
  const [additionalManualTrucks, setAdditionalManualTrucks] = useState('');
  const [etaTimeUnit, setEtaTimeUnit] = useState('hours');
  const [etaValue, setEtaValue] = useState('');

  // Custom factory options
  const customFactories = [
    "IndAutoFilters-1", "IndAutoFilters-2", "IndAutoFilters-3", "IndAutoFilters-4",
    "Soliflex Packaging-1", "Soliflex Packaging-2", "Soliflex Packaging-3", "Soliflex Packaging-4"
  ];

  // Vehicle height options
  const vehicleHeightOptions = ['> 6 MT', '> 10 MT'];

  // Calculate SGST and CGST when invoice amount changes
  useEffect(() => {
    if (invoiceAmount && !isNaN(invoiceAmount)) {
      const amount = parseFloat(invoiceAmount);
      const taxAmount = amount * 0.025; // 2.5%
      setSgst(taxAmount.toFixed(2));
      setCgst(taxAmount.toFixed(2));
    } else {
      setSgst('');
      setCgst('');
    }
  }, [invoiceAmount]);

  // Calculate Actual Payable when relevant fields change
  useEffect(() => {
    let total = 0;
    
    // Vehicle height base amount
    if (vehicleHeight && parseFloat(vehicleHeight) >= 19) {
      total += 300; // Default amount for 19 & above
    }
    
    // Vehicle height option amounts
    if (vehicleHeightOption === '>6 MT') {
      total += 1000;
    } else if (vehicleHeightOption === '>10 MT') {
      total += 1500;
    }
    
    // Add other amounts
    if (toll && !isNaN(toll)) total += parseFloat(toll);
    if (haltingDays && haltingCharge && !isNaN(haltingDays) && !isNaN(haltingCharge)) {
      total += parseFloat(haltingDays) * parseFloat(haltingCharge);
    }
    if (extraPointPickup && !isNaN(extraPointPickup)) total += parseFloat(extraPointPickup);
    if (poRate && !isNaN(poRate)) total += parseFloat(poRate);
    
    setActualPayable(total.toFixed(2));
  }, [vehicleHeight, vehicleHeightOption, toll, haltingDays, haltingCharge, extraPointPickup, poRate]);

  // Calculate Debit Note when invoice amount or actual payable changes
  useEffect(() => {
    if (invoiceAmount && actualPayable && !isNaN(invoiceAmount) && !isNaN(actualPayable)) {
      const difference = parseFloat(invoiceAmount) - parseFloat(actualPayable);
      setDebitNote(difference.toFixed(2));
    } else {
      setDebitNote('');
    }
  }, [invoiceAmount, actualPayable]);

  useEffect(() => {
    if (open) {
      // Get vendor places from API and combine with custom factories
      axios.get('/api/vendor-places')
        .then(res => {
          const apiVendors = res.data || [];
          const allVendors = [
            ...apiVendors,
            ...customFactories.map((factory, index) => ({
              vendor_place_name: factory,
              id: `custom_${index + 1}`
            }))
          ];
          setVendorPlaces(allVendors);
        })
        .catch(() => {
          // Fallback to just custom factories if API fails
          setVendorPlaces(customFactories.map((factory, index) => ({
            vendor_place_name: factory,
            id: `custom_${index + 1}`
          })));
        });
    }
  }, [open]);

  useEffect(() => {
    // Get truck suggestions when materialWeight changes
    if (materialWeight && !isNaN(materialWeight) && Number(materialWeight) > 0 && !useManualTrucks) {
      const weight = Number(materialWeight);
      setTruckLoading(true);
      
      // For wastage, use different logic - find closest vehicle without utilization restriction
      if (weightUnit === 'Wastage') {
        axios.post('/api/trucks/suggest-wastage', { weight })
          .then(res => {
            setTruckSuggestions(res.data.suggestions || []);
            setSelectedTruckSuggestion(res.data.suggestions && res.data.suggestions.length > 0 ? res.data.suggestions[0] : null);
          })
          .catch(err => {
            console.error('Error fetching truck suggestions for wastage:', err);
            setTruckSuggestions([]);
            setSelectedTruckSuggestion(null);
          })
          .finally(() => {
            setTruckLoading(false);
          });
      } else {
        // Enhanced auto-selection logic with proper utilization constraints
        const getTruckSuggestions = async () => {
          try {
            // First try: Find single vehicle with 100% utilization (exact match)
            let response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 100,
              max_utilization: 100
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Second try: Find single vehicle with 95-99% utilization
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 95,
              max_utilization: 99
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Third try: Find single vehicle with 90-94% utilization
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 90,
              max_utilization: 94
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Fourth try: Find single vehicle with 85-89% utilization
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 85,
              max_utilization: 89
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Fifth try: Find single vehicle with 80-84% utilization
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 80,
              max_utilization: 84
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Sixth try: Find single vehicle with 75-79% utilization
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 75,
              max_utilization: 79
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // Seventh try: Find single vehicle with 70-74% utilization (minimum acceptable)
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 70,
              max_utilization: 74
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              setTruckSuggestions(response.data.suggestions);
              setSelectedTruckSuggestion(response.data.suggestions[0]);
              setTruckLoading(false);
              return;
            }
            
            // If no single vehicle found with 70%+ utilization, try combination approach
            response = await axios.post('/api/trucks/suggest-combination', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 70,
              max_utilization: 100
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              // Filter out combinations with utilization > 100%
              let filtered = response.data.suggestions.filter(s => {
                let util = s.utilization || s.utilization_percentage || s.total_utilization;
                return util <= 100;
              });
              // Sort by utilization descending (closest to 100%)
              filtered = filtered.sort((a, b) => {
                let utilA = a.utilization || a.utilization_percentage || a.total_utilization;
                let utilB = b.utilization || b.utilization_percentage || b.total_utilization;
                return utilB - utilA;
              });
              if (filtered.length > 0) {
                setTruckSuggestions(filtered);
                setSelectedTruckSuggestion(filtered[0]);
                setTruckLoading(false);
                return;
              }
            }
            
            // If no combination found, find the best single vehicle (even if below 70%)
            response = await axios.post('/api/trucks/suggest', { 
              weight, 
              weight_unit: weightUnit,
              min_utilization: 0,
              max_utilization: 100
            });
            
            if (response.data.suggestions && response.data.suggestions.length > 0) {
              // Mark this as requiring additional manual vehicle
              const suggestionsWithManualFlag = response.data.suggestions.map(suggestion => ({
                ...suggestion,
                requiresAdditionalVehicle: true,
                note: 'Additional vehicle may be required'
              }));
              setTruckSuggestions(suggestionsWithManualFlag);
              setSelectedTruckSuggestion(suggestionsWithManualFlag[0]);
              setTruckLoading(false);
              return;
            }
            
            // No trucks found at all
            setTruckSuggestions([]);
            setSelectedTruckSuggestion(null);
            setTruckLoading(false);
            
          } catch (err) {
            console.error('Error fetching truck suggestions:', err);
            setTruckSuggestions([]);
            setSelectedTruckSuggestion(null);
            setTruckLoading(false);
          }
        };
        
        getTruckSuggestions();
      }
    } else {
      setTruckSuggestions([]);
      setSelectedTruckSuggestion(null);
    }
  }, [materialWeight, weightUnit, useManualTrucks]);

  const resetForm = () => {
    setMaterialType('');
    setMaterialWeight('');
    setWeightUnit('Number of items');
    setInvoiceAmount('');
    setSgst('');
    setCgst('');
    setTariffHsn('');
    setVehicleHeight('');
    setVehicleHeightOption('');
    setToll('');
    setHaltingDays('');
    setHaltingCharge('');
    setExtraPointPickup('');
    setPoRate('');
    setActualPayable('');
    setDebitNote('');
    setSourceFactory('');
    setDestFactories(['']);
    setTripStages([{ id: 1, source: '', destination: '', sequence: 1 }]);
    setTransportType('single');
    setTruckSuggestions([]);
    setSelectedTruckSuggestion(null);
    setUseManualTrucks(false);
    setManualTrucks('');
    setUseCombinedTrucks(false);
    setAdditionalManualTrucks('');
    setEtaTimeUnit('hours');
    setEtaValue('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddDestination = () => {
    setDestFactories([...destFactories, '']);
  };

  const handleDestChange = (idx, value) => {
    const newDestFactories = [...destFactories];
    newDestFactories[idx] = value;
    setDestFactories(newDestFactories);
  };

  const addTripStage = () => {
    const newId = Math.max(...tripStages.map(s => s.id)) + 1;
    setTripStages([...tripStages, { 
      id: newId, 
      source: '', 
      destination: '', 
      sequence: tripStages.length + 1 
    }]);
  };

  const removeTripStage = (stageId) => {
    const filteredStages = tripStages.filter(stage => stage.id !== stageId);
    // Reorder sequence numbers
    const reorderedStages = filteredStages.map((stage, index) => ({
      ...stage,
      sequence: index + 1
    }));
    setTripStages(reorderedStages);
  };

  const updateTripStage = (stageId, field, value) => {
    setTripStages(tripStages.map(stage => 
      stage.id === stageId ? { ...stage, [field]: value } : stage
    ));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!materialType || !materialWeight || !weightUnit) {
      setError('Material type, weight, and unit are required fields');
      return;
    }
    
    if (materialType.length > 500) {
      setError('Material type must be 500 characters or less');
      return;
    }
    
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    // Validate trip stages
    if (transportType === 'multiple') {
      const invalidStages = tripStages.filter(stage => !stage.source || !stage.destination);
      if (invalidStages.length > 0) {
        setError('All trip stages must have both source and destination selected');
        return;
      }
    } else {
      if (!sourceFactory || !destFactories[0]) {
        setError('Source and destination are required for single trip');
        return;
      }
    }
    
    // Validate truck assignment
    if (useManualTrucks) {
      if (!manualTrucks.trim()) {
        setError('Please enter manual truck details');
        return;
      }
    } else if (useCombinedTrucks) {
      if (!selectedTruckSuggestion) {
        setError('Please select a truck suggestion for combined entry');
        return;
      }
    } else {
      if (!selectedTruckSuggestion) {
        setError('Please select a truck suggestion or enable manual truck entry');
        return;
      }
    }
    
    setLoading(true);
    try {
      const orderData = {
        user_id: userId,
        material_type: materialType,
        material_weight: materialWeight,
        weight_unit: weightUnit,
        invoice_amount: invoiceAmount,
        sgst,
        cgst,
        tariff_hsn: tariffHsn,
        vehicle_height: vehicleHeight,
        vehicle_height_option: vehicleHeightOption,
        toll,
        halting_days: haltingDays,
        halting_charge: haltingCharge,
        extra_point_pickup: extraPointPickup,
        po_rate: poRate,
        actual_payable: actualPayable,
        debit_note: debitNote,
        transport_type: transportType,
        use_manual_trucks: useManualTrucks,
        eta_time_unit: etaTimeUnit,
        eta_value: etaValue
      };

      // Add trip data based on transport type
      if (transportType === 'single') {
        orderData.source_factory = sourceFactory;
        orderData.dest_factories = destFactories;
      } else {
        orderData.trip_stages = tripStages;
      }
      
      if (useManualTrucks) {
        orderData.manual_trucks = manualTrucks;
      } else if (useCombinedTrucks) {
        // Combine recommended trucks with additional manual trucks
        let recommendedTrucks = [];
        if (selectedTruckSuggestion.trucks && selectedTruckSuggestion.trucks.length > 0) {
          recommendedTrucks = selectedTruckSuggestion.trucks.map(t => t.vehicle_number || t.vehicleNumber || t.truck_number);
        } else if (selectedTruckSuggestion.vehicle_number) {
          recommendedTrucks = [selectedTruckSuggestion.vehicle_number];
        } else if (selectedTruckSuggestion.vehicleNumber) {
          recommendedTrucks = [selectedTruckSuggestion.vehicleNumber];
        } else if (selectedTruckSuggestion.truck_number) {
          recommendedTrucks = [selectedTruckSuggestion.truck_number];
        }
        
        const additionalTrucks = additionalManualTrucks.split('\n').map(t => t.trim()).filter(Boolean);
        orderData.trucks = [...recommendedTrucks, ...additionalTrucks];
        orderData.is_combination = true;
      } else {
        // Handle single truck or combination
        if (selectedTruckSuggestion.trucks && selectedTruckSuggestion.trucks.length > 0) {
          orderData.trucks = selectedTruckSuggestion.trucks.map(t => t.vehicle_number || t.vehicleNumber || t.truck_number);
          orderData.is_combination = true;
        } else if (selectedTruckSuggestion.vehicle_number) {
          orderData.trucks = [selectedTruckSuggestion.vehicle_number];
        } else if (selectedTruckSuggestion.vehicleNumber) {
          orderData.trucks = [selectedTruckSuggestion.vehicleNumber];
        } else if (selectedTruckSuggestion.truck_number) {
          orderData.trucks = [selectedTruckSuggestion.truck_number];
        }
        
        // If additional vehicle is required, add it to the order
        if (selectedTruckSuggestion.requiresAdditionalVehicle && additionalManualTrucks.trim()) {
          const additionalTrucks = additionalManualTrucks.split('\n').map(t => t.trim()).filter(Boolean);
          orderData.trucks = [...orderData.trucks, ...additionalTrucks];
          orderData.is_combination = true;
        }
      }
      
      const res = await axios.post('/api/orders', orderData);
      setSuccess(`RFQ created! RFQ Number: ${res.data.order_number}`);
      if (onSubmit) onSubmit();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create RFQ');
    }
    setLoading(false);
  };



  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e2e8f0',
          maxWidth: '1000px',
          width: '100%',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '1.5rem',
        minHeight: 0,
        padding: '24px 32px',
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
            <AddCircleOutlineIcon fontSize="large" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Create New RFQ
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose}
          sx={{ 
            color: '#64748b',
            padding: 1,
            '&:hover': {
              backgroundColor: '#f1f5f9',
              color: '#2563eb'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-message': {
                color: '#dc2626'
              }
            }}
          >
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-message': {
                color: '#059669'
              }
            }}
          >
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Transport Type Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Trip Type
            </Typography>
            <RadioGroup 
              row 
              value={transportType} 
              onChange={e => setTransportType(e.target.value)}
            >
              <FormControlLabel 
                value="single" 
                control={<Radio />} 
                label={
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    Single Trip
                  </Typography>
                } 
              />
              <FormControlLabel 
                value="multiple" 
                control={<Radio />} 
                label={
                  <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>
                    Multiple Trip
                  </Typography>
                } 
              />
            </RadioGroup>
          </Box>

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* Factory Selection */}
          {transportType === 'single' ? (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Route Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                  <TextField
                    select
                    label="Source Factory"
                    value={sourceFactory}
                    onChange={e => setSourceFactory(e.target.value)}
                    fullWidth
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        minHeight: '56px',
                        minWidth: '200px',
                        width: '100%',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem',
                        color: '#64748b',
                      },
                      '& .MuiSelect-select': {
                        minWidth: '180px',
                        width: '100%',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      },
                    }}
                  >
                    {vendorPlaces.map(place => (
                      <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                        {place.vendor_place_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                  <TextField
                    select
                    label="Destination"
                    value={destFactories[0] || ''}
                    onChange={e => handleDestChange(0, e.target.value)}
                    fullWidth
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        minHeight: '56px',
                        minWidth: '200px',
                        width: '100%',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem',
                        color: '#64748b',
                      },
                      '& .MuiSelect-select': {
                        minWidth: '180px',
                        width: '100%',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      },
                    }}
                  >
                    {customFactories.map(factory => (
                      <MenuItem key={factory} value={factory}>
                        {factory}
                      </MenuItem>
                    ))}
                    {vendorPlaces.filter(place => !customFactories.includes(place.vendor_place_name)).map(place => (
                      <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                        {place.vendor_place_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Trip Stages
              </Typography>
              {tripStages.map((stage, index) => (
                <Card key={stage.id} sx={{ mb: 1, borderRadius: 2, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e293b', minWidth: 80 }}>
                        Stage {stage.sequence}
                      </Typography>
                      {tripStages.length > 1 && (
                        <IconButton 
                          onClick={() => removeTripStage(stage.id)}
                          sx={{ 
                            color: '#ef4444', 
                            p: 1,
                            '&:hover': {
                              backgroundColor: '#fef2f2'
                            }
                          }}
                        >
                          <RemoveCircleOutlineIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                        <TextField
                          select
                          label="Source"
                          value={stage.source}
                          onChange={e => updateTripStage(stage.id, 'source', e.target.value)}
                          fullWidth
                          required
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              fontSize: '0.875rem',
                              minHeight: '56px',
                              minWidth: '200px',
                              width: '100%',
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '0.875rem',
                              color: '#64748b',
                            },
                            '& .MuiSelect-select': {
                              minWidth: '180px',
                              width: '100%',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            },
                          }}
                        >
                          {vendorPlaces.map(place => (
                            <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                              {place.vendor_place_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                        <TextField
                          select
                          label="Destination"
                          value={stage.destination}
                          onChange={e => updateTripStage(stage.id, 'destination', e.target.value)}
                          fullWidth
                          required
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              fontSize: '0.875rem',
                              minHeight: '56px',
                              minWidth: '200px',
                              width: '100%',
                            },
                            '& .MuiInputLabel-root': {
                              fontSize: '0.875rem',
                              color: '#64748b',
                            },
                            '& .MuiSelect-select': {
                              minWidth: '180px',
                              width: '100%',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            },
                          }}
                        >
                          {customFactories.map(factory => (
                            <MenuItem key={factory} value={factory}>
                              {factory}
                            </MenuItem>
                          ))}
                          {vendorPlaces.filter(place => !customFactories.includes(place.vendor_place_name)).map(place => (
                            <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                              {place.vendor_place_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={addTripStage}
                variant="outlined"
                sx={{ 
                  mt: 1,
                  fontSize: '0.875rem',
                  borderColor: '#2563eb',
                  color: '#2563eb',
                  '&:hover': {
                    borderColor: '#1d4ed8',
                    backgroundColor: '#f8fafc',
                  }
                }}
              >
                Add Stage
              </Button>
            </Box>
          )}

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* Material Details */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Material Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <TextField
                  label="Weight *"
                  type="number"
                  value={materialWeight}
                  onChange={e => setMaterialWeight(e.target.value)}
                  fullWidth
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      minHeight: '56px',
                      minWidth: '200px',
                      width: '100%',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                      color: '#64748b',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <TextField
                  select
                  label="Unit"
                  value={weightUnit}
                  onChange={e => setWeightUnit(e.target.value)}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      minHeight: '56px',
                      minWidth: '200px',
                      width: '100%',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                      color: '#64748b',
                    },
                    '& .MuiSelect-select': {
                      minWidth: '180px',
                      width: '100%',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    },
                  }}
                >
                  <MenuItem value="Number of items">Number of items</MenuItem>
                  <MenuItem value="Kilograms">Kilograms</MenuItem>
                  <MenuItem value="Rolls">Rolls</MenuItem>
                  <MenuItem value="Wastage">Wastage</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <TextField
                  label="Material Type *"
                  value={materialType}
                  onChange={e => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setMaterialType(value);
                    }
                  }}
                  fullWidth
                  required
                  inputProps={{
                    maxLength: 500
                  }}
                  helperText={`${materialType.length}/500 characters`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      minHeight: '56px',
                      minWidth: '200px',
                      width: '100%',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                      color: '#64748b',
                    },
                    '& .MuiFormHelperText-root': {
                      fontSize: '0.75rem',
                      color: materialType.length >= 450 ? '#f59e0b' : '#64748b',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <Box sx={{ height: '56px' }} />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4, opacity: 0.3 }} />

          {/* Cost Details */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Cost Breakdown
            </Typography>
            
            <Grid container spacing={3}>
              {/* Left Column */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Invoice Amount"
                      type="number"
                      value={invoiceAmount}
                      onChange={e => setInvoiceAmount(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Tariff / HSN Code"
                      value={tariffHsn}
                      onChange={e => setTariffHsn(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      label="Vehicle Height"
                      value={vehicleHeightOption}
                                              onChange={e => setVehicleHeightOption(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '215px',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem'
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    >
                      {vehicleHeightOptions.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>

                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Toll Charges"
                      type="number"
                      value={toll}
                      onChange={e => setToll(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="PO Rate"
                      type="number"
                      value={poRate}
                      onChange={e => setPoRate(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Halting Days"
                      type="number"
                      value={haltingDays}
                      onChange={e => setHaltingDays(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Halting Charge per Day"
                      type="number"
                      value={haltingCharge}
                      onChange={e => setHaltingCharge(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Extra Point Pickup"
                      type="number"
                      value={extraPointPickup}
                      onChange={e => setExtraPointPickup(e.target.value)}
                      sx={{
                        width: '100%',
                        minWidth: '100%',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          width: '100%',
                        },
                        '& .MuiInputBase-root': {
                          width: '100%',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Right Column */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="SGST (2.5%)"
                      value={sgst}
                      fullWidth
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          backgroundColor: '#f1f5f9',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="CGST (2.5%)"
                      value={cgst}
                      fullWidth
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          backgroundColor: '#f1f5f9',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Actual Payable"
                      value={actualPayable}
                      fullWidth
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          backgroundColor: '#f0fdf4',
                          color: '#059669',
                          fontWeight: 600,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Debit Note"
                      value={debitNote}
                      fullWidth
                      disabled
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '0.875rem',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 600,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* Truck Assignment */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Truck Assignment
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <MuiFormControlLabel
                  control={
                    <Checkbox
                      checked={useManualTrucks}
                      onChange={e => setUseManualTrucks(e.target.checked)}
                    />
                  }
                  label="Use Manual Truck Entry"
                />
              </Grid>
              
              {useManualTrucks ? (
                <Grid item xs={12}>
                  <TextField
                    label="Manual Truck Details"
                    value={manualTrucks}
                    onChange={e => setManualTrucks(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    required
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
                  />
                </Grid>
              ) : (
                <>
                  {truckSuggestions.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ mb: 2, color: '#64748b', fontWeight: 500 }}>
                        Recommended Trucks:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {truckSuggestions.map((suggestion, index) => {
                          // Handle different possible data structures
                          let vehicleNumber = '';
                          let utilization = '';
                          let isCombination = false;
                          let requiresAdditional = false;
                          
                          if (suggestion.vehicle_number) {
                            vehicleNumber = suggestion.vehicle_number;
                          } else if (suggestion.vehicleNumber) {
                            vehicleNumber = suggestion.vehicleNumber;
                          } else if (suggestion.truck_number) {
                            vehicleNumber = suggestion.truck_number;
                          } else if (suggestion.trucks && suggestion.trucks.length > 0) {
                            vehicleNumber = suggestion.trucks.map(t => t.vehicle_number || t.vehicleNumber || t.truck_number).join(', ');
                            isCombination = true;
                          } else {
                            vehicleNumber = 'Unknown Truck';
                          }
                          
                          if (suggestion.utilization !== undefined) {
                            utilization = Math.round(suggestion.utilization * 100) / 100;
                          } else if (suggestion.utilization_percentage !== undefined) {
                            utilization = Math.round(suggestion.utilization_percentage * 100) / 100;
                          } else if (suggestion.trucks && suggestion.trucks.length > 0) {
                            utilization = Math.round(suggestion.total_utilization * 100) / 100;
                          } else {
                            utilization = 'N/A';
                          }
                          
                          // Check if this suggestion requires additional vehicle
                          requiresAdditional = suggestion.requiresAdditionalVehicle || false;
                          
                          // Create appropriate label
                          let label = `${vehicleNumber} (${utilization}% utilized)`;
                          if (isCombination) {
                            label = `${vehicleNumber} (Combination: ${utilization}% utilized)`;
                          }
                          if (requiresAdditional) {
                            label = `${vehicleNumber} (${utilization}% utilized) + Additional Required`;
                          }
                          
                          return (
                            <Chip
                              key={index}
                              label={label}
                              onClick={() => setSelectedTruckSuggestion(suggestion)}
                              sx={{
                                backgroundColor: selectedTruckSuggestion === suggestion ? '#dbeafe' : '#f1f5f9',
                                color: selectedTruckSuggestion === suggestion ? '#2563eb' : '#64748b',
                                border: selectedTruckSuggestion === suggestion ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: '#dbeafe',
                                  color: '#2563eb',
                                },
                                ...(requiresAdditional && {
                                  borderColor: '#f59e0b',
                                  backgroundColor: selectedTruckSuggestion === suggestion ? '#fef3c7' : '#fffbeb',
                                  color: '#92400e'
                                }),
                                ...(isCombination && {
                                  borderColor: '#10b981',
                                  backgroundColor: selectedTruckSuggestion === suggestion ? '#d1fae5' : '#ecfdf5',
                                  color: '#065f46'
                                })
                              }}
                            />
                          );
                        })}
                      </Box>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <MuiFormControlLabel
                      control={
                        <Checkbox
                          checked={useCombinedTrucks}
                          onChange={e => setUseCombinedTrucks(e.target.checked)}
                        />
                      }
                      label="Add Additional Manual Trucks"
                    />
                  </Grid>
                  
                  {(useCombinedTrucks || (selectedTruckSuggestion && selectedTruckSuggestion.requiresAdditionalVehicle)) && (
                    <Grid item xs={12}>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <WarningIcon fontSize="small" />
                          {selectedTruckSuggestion && selectedTruckSuggestion.requiresAdditionalVehicle 
                            ? 'Additional vehicle required to meet capacity needs'
                            : 'Add additional vehicles to the selected combination'
                          }
                        </Typography>
                      </Box>
                      <TextField
                        label="Additional Manual Trucks"
                        value={additionalManualTrucks}
                        onChange={e => setAdditionalManualTrucks(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Enter additional truck numbers, one per line"
                        required={selectedTruckSuggestion && selectedTruckSuggestion.requiresAdditionalVehicle}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            fontSize: '0.875rem',
                            borderColor: selectedTruckSuggestion && selectedTruckSuggestion.requiresAdditionalVehicle ? '#f59e0b' : '#d1d5db',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.875rem',
                            color: '#64748b',
                          },
                        }}
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* ETA Information */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Estimated Time of Arrival
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="ETA Value"
                  type="number"
                  value={etaValue}
                  onChange={e => setEtaValue(e.target.value)}
                  fullWidth
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
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="ETA Time Unit"
                  value={etaTimeUnit}
                  onChange={e => setEtaTimeUnit(e.target.value)}
                  fullWidth
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
                  <MenuItem value="hours">Hours</MenuItem>
                  <MenuItem value="days">Days</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>


        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, backgroundColor: '#ffffff' }}>
        <Button
          onClick={handleClose}
          variant="outlined"
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
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            backgroundColor: '#2563eb',
            '&:hover': {
              backgroundColor: '#1d4ed8',
            },
            '&:disabled': {
              backgroundColor: '#cbd5e1',
              color: '#64748b',
            }
          }}
        >
          {loading ? 'Creating...' : 'Create RFQ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewRFQDialog; 