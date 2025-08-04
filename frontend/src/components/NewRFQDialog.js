import React, { useState, useEffect, useRef } from 'react';
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
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [vehicleHeight, setVehicleHeight] = useState('');
  const [vehicleHeightOption, setVehicleHeightOption] = useState('');
  const [toll, setToll] = useState('');
  const [actualPayable, setActualPayable] = useState('');
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
    { 
      id: 1, 
      source: '', 
      destination: '', 
      sequence: 1,
      // Material Details for each stage
      materialType: '',
      materialWeight: '',
      selectedCategories: [],
      // Cost Breakdown for each stage
      invoiceAmount: '',
      vehicleHeightOption: '',
      toll: '',
      totalAmount: '',
      shippedByVendor: false,
      autoPopulationMessage: ''
    }
  ]);
  
  // Multiple trip totals
  const [multipleTripTotals, setMultipleTripTotals] = useState({
    totalInvoiceValue: 0,
    totalToll: 0,
    finalTotalAmount: 0
  });
  
  // Ref to track last weight values to prevent unnecessary API calls
  const lastWeightValues = useRef({});
  const lastRateCall = useRef({});
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
  const [shippedByVendor, setShippedByVendor] = useState(false);
  const [autoPopulationMessage, setAutoPopulationMessage] = useState('');
  const [loadingStages, setLoadingStages] = useState(new Set());
  const [requiresSecondVehicle, setRequiresSecondVehicle] = useState(false);
  const [remainingWeight, setRemainingWeight] = useState(0);

  // Custom factory options
  const customFactories = [
    "IndAutoFilters-1", "IndAutoFilters-2", "IndAutoFilters-3", "IndAutoFilters-4",
    "Soliflex Packaging-1", "Soliflex Packaging-2", "Soliflex Packaging-3", "Soliflex Packaging-4"
  ];

  // Vehicle capacity options
  const vehicleCapacityOptions = ['0 -> 3 tons', '3 -> 6 tons', 'Above 6 tons'];

  // Category options
  const categoryOptions = ['Rolls', 'Wastage', 'Raw Materials'];

  // Function to get vendor rates from backend
  const getVendorRates = async (vendorName, weight, isShippedByVendor) => {
    try {
      console.log('Sending vendor rates request:', { vendorName, weight, isShippedByVendor });
      const response = await axios.post('/api/vendor-rates', {
        vendorName,
        weight,
        isShippedByVendor
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching vendor rates:', error);
      console.error('Error response data:', error.response?.data);
      // If the error response contains allowManualEntry data, return it
      if (error.response && error.response.data) {
        return error.response.data;
      }
      // Otherwise return a default error response
      return { 
        allowManualEntry: true, 
        message: 'Failed to fetch vendor rates. Please enter the invoice amount manually.',
        rate: 0, 
        tollCharges: 0 
      };
    }
  };



  // Total Amount is calculated by backend as Invoice Amount + Toll Charges
  // No frontend calculation needed - backend provides the correct total

  // Auto-populate vehicle capacity based on weight
  useEffect(() => {
    if (materialWeight && !isNaN(materialWeight)) {
      const weight = parseFloat(materialWeight);
      
      if (weight < 3000) {
        setVehicleHeightOption('0 -> 3 tons');
      } else if (weight >= 3000 && weight < 6000) {
        setVehicleHeightOption('3 -> 6 tons');
      } else if (weight >= 6000) {
        setVehicleHeightOption('Above 6 tons');
      }
    }
  }, [materialWeight]);

  // Auto-populate invoice amount and toll charges based on vendor rates
  useEffect(() => {
    const populateRates = async () => {
      if (sourceFactory && materialWeight && !isNaN(materialWeight)) {
        const weight = parseFloat(materialWeight);
        try {
          const response = await getVendorRates(sourceFactory, weight, shippedByVendor);
          
          if (response.allowManualEntry) {
            // Show message that auto-population is not available
            setInvoiceAmount('');
            setToll('');
            setActualPayable('');
            setAutoPopulationMessage(response.message);
          } else {
            // Safely convert values to strings, handling undefined/null values
            setInvoiceAmount(response.rate ? response.rate.toString() : '');
            setToll(response.tollCharges ? response.tollCharges.toString() : '');
            setActualPayable(response.totalAmount ? response.totalAmount.toString() : '');
            setAutoPopulationMessage('');
          }
        } catch (error) {
          console.error('Error populating rates:', error);
          setInvoiceAmount('');
          setToll('');
          setActualPayable('');
          setAutoPopulationMessage('Error fetching vendor rates. Please enter values manually.');
        }
      }
    };
    
    populateRates();
  }, [sourceFactory, materialWeight, shippedByVendor]);

  // Handle category selection
  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
    } else {
        return [...prev, category];
    }
    });
  };

  useEffect(() => {
    if (open) {
      // Get vendor places from API (now includes custom factories from backend)
      axios.get('/api/vendor-places')
        .then(res => {
          const allVendors = res.data || [];
          console.log('Vendor places loaded:', allVendors.length, 'vendors');
          console.log('Sample vendor data:', allVendors.slice(0, 3));
          setVendorPlaces(allVendors);
        })
        .catch((error) => {
          console.error('Error fetching vendor places:', error);
          // Fallback to just custom factories if API fails
          setVendorPlaces(customFactories.map((factory, index) => ({
            vendor_place_name: factory,
            id: `custom_${index + 1}`
          })));
        });
    }
  }, [open]);

  // Single trip truck suggestions with proper debouncing
  useEffect(() => {
    if (transportType === 'single' && materialWeight && !isNaN(materialWeight) && Number(materialWeight) > 0 && !useManualTrucks) {
      const weight = Number(materialWeight);
      const weightKey = `${weight}-${selectedCategories.join(',')}`;
      
      // Check if we already have suggestions for this weight/category combination
      if (lastWeightValues.current.single === weightKey) {
        return;
      }
      
      setTruckLoading(true);
      lastWeightValues.current.single = weightKey;
      
      // For wastage, use different logic - find closest vehicle without utilization restriction
      if (selectedCategories.includes('Wastage')) {
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
              weight_unit: selectedCategories.join(', '),
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
    } else if (transportType === 'single') {
      setTruckSuggestions([]);
      setSelectedTruckSuggestion(null);
    }
  }, [materialWeight, selectedCategories, useManualTrucks, transportType]);

  // Multiple trip truck suggestions with proper debouncing
  useEffect(() => {
    if (transportType === 'multiple' && !useManualTrucks) {
      // Calculate total weight from all stages
      const totalWeight = calculateTotalWeight();
      
      if (totalWeight > 0) {
        // Get all categories from all stages
        const allCategories = new Set();
        tripStages.forEach(stage => {
          if (stage.selectedCategories && stage.selectedCategories.length > 0) {
            stage.selectedCategories.forEach(cat => allCategories.add(cat));
          }
        });
        const categories = Array.from(allCategories);
        
        const weightKey = `multiple-total-${totalWeight}-${categories.join(',')}`;
        
        console.log('Multiple trip truck suggestions - Total weight:', totalWeight, 'Categories:', categories);
        
        // Check if we already have suggestions for this weight/category combination
        if (lastWeightValues.current.multiple === weightKey) {
          return;
        }
        
        setTruckLoading(true);
        lastWeightValues.current.multiple = weightKey;
        
        // For wastage, use different logic - find closest vehicle without utilization restriction
        if (categories.includes('Wastage')) {
          axios.post('/api/trucks/suggest-wastage', { weight: totalWeight })
            .then(res => {
              console.log('Wastage truck suggestions:', res.data);
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
          // Use the new total weight-based truck suggestion logic
          getTruckSuggestionsForTotalWeight(totalWeight, categories)
            .then(result => {
              console.log('Total weight truck suggestions result:', result);
              setTruckSuggestions(result.suggestions);
              setSelectedTruckSuggestion(result.selected);
              
              // If second vehicle is required, show message and set states
              if (result.requiresSecondVehicle) {
                setRequiresSecondVehicle(true);
                setRemainingWeight(result.remainingWeight);
                setError(`First vehicle selected. Please manually enter details for second vehicle to handle ${result.remainingWeight.toFixed(2)} kg remaining weight.`);
              } else {
                setRequiresSecondVehicle(false);
                setRemainingWeight(0);
                setError(''); // Clear any previous error
              }
            })
            .catch(err => {
              console.error('Error fetching truck suggestions for multiple trips:', err);
              setTruckSuggestions([]);
              setSelectedTruckSuggestion(null);
            })
            .finally(() => {
              setTruckLoading(false);
            });
        }
      } else {
        setTruckSuggestions([]);
        setSelectedTruckSuggestion(null);
      }
    }
  }, [tripStages, transportType, useManualTrucks]);

  const resetForm = () => {
    setMaterialType('');
    setMaterialWeight('');
    setSelectedCategories([]);
    setInvoiceAmount('');
    setVehicleHeight('');
    setVehicleHeightOption('');
    setToll('');
    setActualPayable('');
    setSourceFactory('');
    setDestFactories(['']);
    setTripStages([{ 
      id: 1, 
      source: '', 
      destination: '', 
      sequence: 1,
      // Material Details for each stage
      materialType: '',
      materialWeight: '',
      selectedCategories: [],
      // Cost Breakdown for each stage
      invoiceAmount: '',
      vehicleHeightOption: '',
      toll: '',
      totalAmount: '',
      shippedByVendor: false,
      autoPopulationMessage: ''
    }]);
    setTransportType('single');
    setTruckSuggestions([]);
    setSelectedTruckSuggestion(null);
    setUseManualTrucks(false);
    setManualTrucks('');
    setUseCombinedTrucks(false);
    setAdditionalManualTrucks('');
    setEtaTimeUnit('hours');
    setEtaValue('');
    setShippedByVendor(false);
    setAutoPopulationMessage('');
    setMultipleTripTotals({
      totalInvoiceValue: 0,
      totalToll: 0,
      finalTotalAmount: 0
    });
    // Clear the last weight values ref
    lastWeightValues.current = {};
    setLoadingStages(new Set());
    setRequiresSecondVehicle(false);
    setRemainingWeight(0);
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
      sequence: tripStages.length + 1,
      // Material Details for each stage
      materialType: '',
      materialWeight: '',
      selectedCategories: [],
      // Cost Breakdown for each stage
      invoiceAmount: '',
      vehicleHeightOption: '',
      toll: '',
      totalAmount: '',
      shippedByVendor: false,
      autoPopulationMessage: ''
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
    setTripStages(prevStages => 
      prevStages.map(stage => 
      stage.id === stageId ? { ...stage, [field]: value } : stage
      )
    );
  };

  // Handle category changes for individual stages
  const handleStageCategoryChange = (stageId, category) => {
    setTripStages(tripStages.map(stage => {
      if (stage.id === stageId) {
        const currentCategories = stage.selectedCategories || [];
        const updatedCategories = currentCategories.includes(category)
          ? currentCategories.filter(c => c !== category)
          : [...currentCategories, category];
        return { ...stage, selectedCategories: updatedCategories };
      }
      return stage;
    }));
  };

  // Populate rates for individual stages
  const populateStageRates = async (stageId) => {
    const stage = tripStages.find(s => s.id === stageId);
    if (!stage || !stage.source || !stage.materialWeight || stage.materialWeight.length === 0) return;

    console.log(`Populating rates for stage ${stageId}:`, { source: stage.source, weight: stage.materialWeight, shippedByVendor: stage.shippedByVendor });

    // Set loading state for this stage
    setLoadingStages(prev => new Set([...prev, stageId]));

    try {
      const response = await getVendorRates(stage.source, stage.materialWeight, stage.shippedByVendor);
      console.log(`Rates response for stage ${stageId}:`, response);
      
      if (response.allowManualEntry) {
        updateTripStage(stageId, 'invoiceAmount', '');
        updateTripStage(stageId, 'toll', '');
        updateTripStage(stageId, 'totalAmount', '');
        updateTripStage(stageId, 'autoPopulationMessage', response.message);
      } else {
        updateTripStage(stageId, 'invoiceAmount', response.rate ? response.rate.toString() : '');
        updateTripStage(stageId, 'toll', response.tollCharges ? response.tollCharges.toString() : '');
        updateTripStage(stageId, 'totalAmount', response.totalAmount ? response.totalAmount.toString() : '');
        updateTripStage(stageId, 'autoPopulationMessage', '');
      }
    } catch (error) {
      console.error('Error populating rates for stage:', error);
      updateTripStage(stageId, 'invoiceAmount', '');
      updateTripStage(stageId, 'toll', '');
      updateTripStage(stageId, 'totalAmount', '');
      updateTripStage(stageId, 'autoPopulationMessage', 'Error fetching vendor rates. Please enter values manually.');
    } finally {
      // Clear loading state for this stage
      setLoadingStages(prev => {
        const newSet = new Set(prev);
        newSet.delete(stageId);
        return newSet;
      });
    }
  };

  // Calculate totals for multiple trips
  const calculateMultipleTripTotals = () => {
    const totals = tripStages.reduce((acc, stage) => {
      const invoiceAmount = parseFloat(stage.invoiceAmount) || 0;
      const toll = parseFloat(stage.toll) || 0;
      const totalAmount = parseFloat(stage.totalAmount) || 0;
      
      return {
        totalInvoiceValue: acc.totalInvoiceValue + invoiceAmount,
        totalToll: acc.totalToll + toll,
        finalTotalAmount: acc.finalTotalAmount + totalAmount
      };
    }, { totalInvoiceValue: 0, totalToll: 0, finalTotalAmount: 0 });
    
    setMultipleTripTotals(totals);
  };

  // Calculate total weight for multiple trips
  const calculateTotalWeight = () => {
    return tripStages.reduce((total, stage) => {
      const weight = parseFloat(stage.materialWeight) || 0;
      return total + weight;
    }, 0);
  };

  // Get truck suggestions for multiple trips based on total weight
  const getTruckSuggestionsForTotalWeight = async (totalWeight, categories) => {
    try {
      // First try: Find single vehicle with 100% utilization (exact match)
      let response = await axios.post('/api/trucks/suggest', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
        min_utilization: 100,
        max_utilization: 100
      });
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        return {
          suggestions: response.data.suggestions,
          selected: response.data.suggestions[0],
          requiresSecondVehicle: false
        };
      }
      
      // Second try: Find single vehicle with 90-99% utilization
      response = await axios.post('/api/trucks/suggest', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
        min_utilization: 90,
        max_utilization: 99
      });
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        return {
          suggestions: response.data.suggestions,
          selected: response.data.suggestions[0],
          requiresSecondVehicle: false
        };
      }
      
      // Third try: Find single vehicle with 80-89% utilization
      response = await axios.post('/api/trucks/suggest', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
        min_utilization: 80,
        max_utilization: 89
      });
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        return {
          suggestions: response.data.suggestions,
          selected: response.data.suggestions[0],
          requiresSecondVehicle: false
        };
      }
      
      // Fourth try: Find single vehicle with 70-79% utilization
      response = await axios.post('/api/trucks/suggest', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
        min_utilization: 70,
        max_utilization: 79
      });
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        return {
          suggestions: response.data.suggestions,
          selected: response.data.suggestions[0],
          requiresSecondVehicle: false
        };
      }
      
      // If no single vehicle found with 70%+ utilization, try combination approach
      response = await axios.post('/api/trucks/suggest-combination', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
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
          return {
            suggestions: filtered,
            selected: filtered[0],
            requiresSecondVehicle: false
          };
        }
      }
      
      // If no combination found, find the best single vehicle and suggest second vehicle
      response = await axios.post('/api/trucks/suggest', { 
        weight: totalWeight, 
        weight_unit: categories.join(', '),
        min_utilization: 0,
        max_utilization: 100
      });
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        const bestVehicle = response.data.suggestions[0];
        const vehicleCapacity = bestVehicle.capacity || bestVehicle.max_weight || 0;
        const remainingWeight = totalWeight - vehicleCapacity;
        
        // Mark this as requiring additional manual vehicle
        const suggestionsWithManualFlag = response.data.suggestions.map(suggestion => ({
          ...suggestion,
          requiresAdditionalVehicle: true,
          note: `Additional vehicle needed for ${remainingWeight.toFixed(2)} kg remaining weight`
        }));
        
        return {
          suggestions: suggestionsWithManualFlag,
          selected: suggestionsWithManualFlag[0],
          requiresSecondVehicle: true,
          remainingWeight: remainingWeight
        };
      }
      
      // No trucks found at all
      return {
        suggestions: [],
        selected: null,
        requiresSecondVehicle: false
      };
      
    } catch (err) {
      console.error('Error fetching truck suggestions for total weight:', err);
      return {
        suggestions: [],
        selected: null,
        requiresSecondVehicle: false
      };
    }
  };

  // Auto-populate vehicle capacity for individual stages
  const updateStageVehicleCapacity = (stageId, weight) => {
    let capacity = '';
    if (weight < 3000) {
      capacity = '0 -> 3 tons';
    } else if (weight >= 3000 && weight < 6000) {
      capacity = '3 -> 6 tons';
    } else {
      capacity = 'Above 6 tons';
    }
    updateTripStage(stageId, 'vehicleHeightOption', capacity);
  };

  // Auto-populate vehicle capacity based on weight for stages
  useEffect(() => {
    tripStages.forEach(stage => {
      if (stage.materialWeight && stage.materialWeight.length > 0) {
        const weight = parseFloat(stage.materialWeight);
        if (!isNaN(weight)) {
          // Always update vehicle capacity when weight changes
          updateStageVehicleCapacity(stage.id, weight);
        }
      }
    });
  }, [tripStages]);

  // Populate rates for stages with improved debouncing
  useEffect(() => {
    const timeouts = {};
    
    tripStages.forEach(stage => {
      if (stage.source && stage.materialWeight && stage.materialWeight.length > 0) {
        const weightKey = `${stage.id}-${stage.source}-${stage.materialWeight}-${stage.shippedByVendor}`;
        
        // Only make API call if the combination has changed
        if (lastRateCall.current[stage.id] !== weightKey) {
          // Clear existing timeout for this stage
          if (timeouts[stage.id]) {
            clearTimeout(timeouts[stage.id]);
          }
          
          // Set new timeout with longer debounce for better performance
          timeouts[stage.id] = setTimeout(() => {
            lastRateCall.current[stage.id] = weightKey;
            populateStageRates(stage.id);
          }, 800); // Reduced to 800ms for better responsiveness
        }
      }
    });
    
    // Cleanup function
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [tripStages]);

  // Calculate multiple trip totals when any stage data changes
  useEffect(() => {
    if (transportType === 'multiple') {
      calculateMultipleTripTotals();
    }
  }, [tripStages, transportType]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    // Validate based on transport type
    if (transportType === 'multiple') {
      const invalidStages = tripStages.filter(stage => 
        !stage.source || 
        !stage.destination || 
        !stage.materialType || 
        !stage.materialWeight || 
        stage.selectedCategories.length === 0
      );
      if (invalidStages.length > 0) {
        setError('All trip stages must have source, destination, material type, weight, and at least one category selected');
        return;
      }
      
      // Check material type length for all stages
      const invalidMaterialType = tripStages.find(stage => 
        stage.materialType && stage.materialType.length > 500
      );
      if (invalidMaterialType) {
        setError('Material type must be 500 characters or less');
        return;
      }
    } else {
      if (!sourceFactory || !destFactories[0]) {
        setError('Source and destination are required for single trip');
        return;
      }
      
      if (!materialType || !materialWeight || selectedCategories.length === 0) {
        setError('Material type, weight, and at least one category are required fields');
        return;
      }
      
      if (materialType.length > 500) {
        setError('Material type must be 500 characters or less');
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
      // More flexible validation for truck suggestions
      if (!selectedTruckSuggestion && !useManualTrucks) {
        // For multiple trips, allow submission even without truck suggestions if manual entry is available
        if (transportType === 'multiple') {
          // Check if any stage has weight data that would trigger truck suggestions
          const hasWeightData = tripStages.some(stage => 
            stage.materialWeight && !isNaN(stage.materialWeight) && Number(stage.materialWeight) > 0
          );
          
          if (hasWeightData && truckSuggestions.length === 0 && !truckLoading) {
            setError('Please select a truck suggestion, enable manual truck entry, or wait for truck suggestions to load');
            return;
          }
        } else {
          // For single trip, be more strict
          if (!selectedTruckSuggestion) {
            setError('Please select a truck suggestion or enable manual truck entry');
            return;
          }
        }
      }
      
      // Validate second vehicle requirement for multiple trips
      if (transportType === 'multiple' && requiresSecondVehicle && !additionalManualTrucks.trim()) {
        setError(`Please enter details for the second vehicle to handle ${remainingWeight.toFixed(2)} kg remaining weight`);
        return;
      }
    }
    
    setLoading(true);
    try {
      const orderData = {
        user_id: userId,
        transport_type: transportType,
        use_manual_trucks: useManualTrucks,
        eta_time_unit: etaTimeUnit,
        eta_value: etaValue
      };

      console.log('Submitting order with transport_type:', transportType);

      // Add trip data based on transport type
      if (transportType === 'single') {
        orderData.material_type = materialType;
        orderData.material_weight = materialWeight;
        orderData.weight_unit = selectedCategories.join(', ');
        orderData.invoice_amount = invoiceAmount;
        orderData.vehicle_height = vehicleHeight;
        orderData.vehicle_height_option = vehicleHeightOption;
        orderData.toll = toll;
        orderData.actual_payable = actualPayable;
        orderData.shipped_by_vendor = shippedByVendor;
        orderData.source_factory = sourceFactory;
        orderData.dest_factories = destFactories;
      } else {
        orderData.trip_stages = tripStages;
        orderData.multiple_trip_totals = multipleTripTotals;
      }
      
      console.log('Final order data:', orderData);

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
        
        // For multiple trips, handle second vehicle requirement
        if (transportType === 'multiple' && requiresSecondVehicle && additionalManualTrucks.trim()) {
          const secondVehicleTrucks = additionalManualTrucks.split('\n').map(t => t.trim()).filter(Boolean);
          orderData.trucks = [...orderData.trucks, ...secondVehicleTrucks];
          orderData.is_combination = true;
          orderData.requires_second_vehicle = true;
          orderData.remaining_weight = remainingWeight;
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

          {/* Factory Selection - Only show for single trip */}
          {transportType === 'single' && (
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
                    {vendorPlaces
                      .filter(place => place && typeof place === 'object' && place.vendor_place_name)
                      .sort((a, b) => {
                        const nameA = String(a.vendor_place_name || '');
                        const nameB = String(b.vendor_place_name || '');
                        return nameA.localeCompare(nameB);
                      })
                      .map(place => (
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
                    {customFactories.sort().map(factory => (
                      <MenuItem key={factory} value={factory}>
                        {factory}
                      </MenuItem>
                    ))}
                    {vendorPlaces
                      .filter(place => place && typeof place === 'object' && place.vendor_place_name && !customFactories.includes(place.vendor_place_name))
                      .sort((a, b) => {
                        const nameA = String(a.vendor_place_name || '');
                        const nameB = String(b.vendor_place_name || '');
                        return nameA.localeCompare(nameB);
                      })
                      .map(place => (
                      <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                        {place.vendor_place_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6} sx={{ minWidth: '250px', display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={shippedByVendor}
                        onChange={(e) => setShippedByVendor(e.target.checked)}
                        sx={{
                          color: '#2563eb',
                          '&.Mui-checked': {
                            color: '#2563eb',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                        Shipped by vendor?
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Multiple Trip Stages */}
          {transportType === 'multiple' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Trip Stages
              </Typography>
              
              {/* Loading indicator for multiple trip stages */}
              {truckLoading && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Loading truck suggestions and calculating rates... Please wait.
                </Alert>
              )}
              
              {tripStages.map((stage, index) => (
                <Card key={stage.id} sx={{ mb: 2, borderRadius: 2, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', minWidth: 80 }}>
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
                    
                    {/* Route Details */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                        Route Details
                      </Typography>
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
                            {vendorPlaces
                              .filter(place => place && typeof place === 'object' && place.vendor_place_name)
                              .sort((a, b) => {
                                const nameA = String(a.vendor_place_name || '');
                                const nameB = String(b.vendor_place_name || '');
                                return nameA.localeCompare(nameB);
                              })
                              .map(place => (
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
                            {customFactories.sort().map(factory => (
                            <MenuItem key={factory} value={factory}>
                              {factory}
                            </MenuItem>
                          ))}
                            {vendorPlaces
                              .filter(place => place && typeof place === 'object' && place.vendor_place_name && !customFactories.includes(place.vendor_place_name))
                              .sort((a, b) => {
                                const nameA = String(a.vendor_place_name || '');
                                const nameB = String(b.vendor_place_name || '');
                                return nameA.localeCompare(nameB);
                              })
                              .map(place => (
                            <MenuItem key={place.id || place.vendor_place_name} value={place.vendor_place_name}>
                              {place.vendor_place_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                        <Grid item xs={12} md={6} sx={{ minWidth: '250px', display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={stage.shippedByVendor}
                                onChange={(e) => updateTripStage(stage.id, 'shippedByVendor', e.target.checked)}
                sx={{ 
                  color: '#2563eb',
                                  '&.Mui-checked': {
                                    color: '#2563eb',
                                  },
                                }}
                              />
                            }
                            label={
                              <Typography sx={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                                Shipped by vendor?
                              </Typography>
                            }
                          />
                        </Grid>
                      </Grid>
            </Box>

          {/* Material Details */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
              Material Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <TextField
                  label="Weight *"
                  type="number"
                            value={stage.materialWeight}
                            onChange={e => updateTripStage(stage.id, 'materialWeight', e.target.value)}
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
                            label="Category *"
                            value={stage.selectedCategories || []}
                            onChange={() => {}} // Handle change through custom menu items
                  fullWidth
                            required
                            SelectProps={{
                              multiple: true,
                              renderValue: (selected) => {
                                if (selected.length === 0) return '';
                                return selected.join(', ');
                              },
                              MenuProps: {
                                PaperProps: {
                                  sx: {
                                    maxHeight: 200,
                                  },
                                },
                              },
                            }}
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
                            {categoryOptions.map((category) => (
                              <MenuItem key={category} value={category}>
                                <MuiFormControlLabel
                                  control={
                                    <Checkbox
                                      checked={(stage.selectedCategories || []).includes(category)}
                                      onChange={() => handleStageCategoryChange(stage.id, category)}
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        color: '#2563eb',
                                        '&.Mui-checked': {
                                          color: '#2563eb',
                                        },
                                      }}
                                    />
                                  }
                                  label={category}
                                  sx={{
                                    margin: 0,
                                    width: '100%',
                                    '& .MuiFormControlLabel-label': {
                                      fontSize: '0.875rem',
                                      color: '#374151',
                                    },
                                  }}
                                />
                              </MenuItem>
                            ))}
                </TextField>
              </Grid>
            </Grid>
            
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <TextField
                  label="Material Type *"
                            value={stage.materialType}
                  onChange={e => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                                updateTripStage(stage.id, 'materialType', value);
                    }
                  }}
                  fullWidth
                  required
                  inputProps={{
                    maxLength: 500
                  }}
                            helperText={`${(stage.materialType || '').length}/500 characters`}
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
                                color: (stage.materialType || '').length >= 450 ? '#f59e0b' : '#64748b',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
                <Box sx={{ height: '56px' }} />
              </Grid>
            </Grid>
          </Box>

                    {/* Cost Breakdown */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#374151' }}>
              Cost Breakdown
            </Typography>
                      
                      {loadingStages.has(stage.id) && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Calculating rates for this stage... Please wait.
                        </Alert>
                      )}
                      
                      {stage.autoPopulationMessage && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          {stage.autoPopulationMessage}
                        </Alert>
                      )}
            
            <Grid container spacing={3}>
              {/* Left Column */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Invoice Amount"
                      type="number"
                                value={stage.invoiceAmount}
                                onChange={e => updateTripStage(stage.id, 'invoiceAmount', e.target.value)}
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
                                label="Vehicle Capacity"
                                value={stage.vehicleHeightOption}
                                onChange={e => updateTripStage(stage.id, 'vehicleHeightOption', e.target.value)}
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
                                {vehicleCapacityOptions.map(option => (
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
                                value={stage.toll}
                                onChange={e => updateTripStage(stage.id, 'toll', e.target.value)}
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
                                label="Total Amount"
                                value={stage.totalAmount}
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
                          </Grid>
                        </Grid>
                      </Grid>
                    </Box>
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
              
              {/* Multiple Trip Totals */}
              {tripStages.length > 0 && (
                <Card sx={{ mt: 2, borderRadius: 2, border: '2px solid #2563eb', backgroundColor: '#f0f9ff' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoneyIcon sx={{ color: '#2563eb' }} />
                      Multiple Trip Totals
                    </Typography>
                    
                    {/* Total Weight Information */}
                    <Box sx={{ mb: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Total Weight: {calculateTotalWeight().toFixed(2)} kg
                      </Typography>
                      {requiresSecondVehicle && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Second vehicle required for {remainingWeight.toFixed(2)} kg remaining weight
                        </Alert>
                      )}
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Total Invoice Value"
                          value={multipleTripTotals.totalInvoiceValue.toFixed(2)}
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
                      <Grid item xs={12} md={4}>
                    <TextField
                          label="Total Toll"
                          value={multipleTripTotals.totalToll.toFixed(2)}
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
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Final Total Amount"
                          value={multipleTripTotals.finalTotalAmount.toFixed(2)}
                          fullWidth
                          disabled
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              fontSize: '0.875rem',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              fontWeight: 700,
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.875rem',
                          color: '#64748b',
                        },
                      }}
                    />
                  </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* Material Details - Only show for single trip */}
          {transportType === 'single' && (
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
                    label="Category *"
                    value={selectedCategories}
                    onChange={() => {}} // Handle change through custom menu items
                    fullWidth
                    required
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) => {
                        if (selected.length === 0) return '';
                        return selected.join(', ');
                      },
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            maxHeight: 200,
                          },
                        },
                      },
                    }}
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
                    {categoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        <MuiFormControlLabel
                          control={
                            <Checkbox
                              checked={selectedCategories.includes(category)}
                              onChange={() => handleCategoryChange(category)}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                color: '#2563eb',
                                '&.Mui-checked': {
                                  color: '#2563eb',
                                },
                              }}
                            />
                          }
                          label={category}
                          sx={{
                            margin: 0,
                            width: '100%',
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.875rem',
                              color: '#374151',
                            },
                          }}
                        />
                      </MenuItem>
                    ))}
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
          )}

          <Divider sx={{ mb: 2, opacity: 0.3 }} />

          {/* Cost Details - Only show for single trip */}
          {transportType === 'single' && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
                Cost Breakdown
              </Typography>
              
              {autoPopulationMessage && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {autoPopulationMessage}
                </Alert>
              )}
              
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
                        select
                        label="Vehicle Capacity"
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
                        {vehicleCapacityOptions.map(option => (
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
                  </Grid>
                </Grid>

                {/* Right Column */}
                <Grid item xs={12} md={6}>
                  <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                        label="Total Amount"
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
                </Grid>
              </Grid>
            </Grid>
          </Box>
          )}

          <Divider sx={{ mb: 4, opacity: 0.3 }} />

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
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="hours">Hours</MenuItem>
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