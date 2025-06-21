// routes/farm.js
const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const Barn = require('../models/Barn');
const Stall = require('../models/Stall');
const Pig = require('../models/Pig');
const Device = require('../models/Device');
const rateLimit = require('express-rate-limit');
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Apply rate limiter to all requests
router.use(limiter);

// GET all farms with counts and basic analytics
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // If user is a farmer, they can only see their assigned farm
    if (req.user.role === 'farmer' && req.user.assignedFarm) {
      const farmId = req.user.assignedFarm;
      console.log(`Farmer ${req.user.email} accessing their assigned farm: ${farmId}`);
      
      // Filter to only show the assigned farm
      const farm = await Farm.findById(farmId);
      if (!farm) {
        return res.status(404).json({ error: 'Farm not found' });
      }
      
      // Get counts for the farm
      const [barns, stalls, pigs, devices] = await Promise.all([
        Barn.find({ farmId }).select('_id'),
        Stall.find({ farmId }).select('_id'),
        Pig.find({ 'currentLocation.farmId': farmId, active: true }).select('_id'),
        Device.find({ farmId }).select('_id')
      ]);
      
      const farmWithCounts = {
        ...farm.toObject(),
        counts: {
          barns: barns.length,
          stalls: stalls.length,
          pigs: pigs.length,
          devices: devices.length
        }
      };
      
      return res.json([farmWithCounts]);
    }
    
    // For admins, show all farms
    const farms = await Farm.find({}).sort({ name: 1 });

    // Enhance with counts for barns, stalls, pigs, and devices
    const farmsWithCounts = await Promise.all(farms.map(async farm => {
      const [barns, stalls, pigs, devices] = await Promise.all([
        Barn.find({ farmId: farm._id }).select('_id'),
        Stall.find({ farmId: farm._id }).select('_id'),
        Pig.find({ 'currentLocation.farmId': farm._id, active: true }).select('_id'),
        Device.find({ farmId: farm._id }).select('_id')
      ]);
      
      return {
        ...farm.toObject(),
        counts: {
          barns: barns.length,
          stalls: stalls.length,
          pigs: pigs.length,
          devices: devices.length
        }
      };
    }));

    res.json(farmsWithCounts);
  } catch (error) {
    console.error('Error fetching farms:', error);
    res.status(500).json({ error: 'Failed to fetch farms' });
  }
});

// GET farm distribution
router.get('/distribution', authenticateJWT, async (req, res) => {
  try {
    const { filter } = req.query;
    
    // Set up base match conditions
    const matchConditions = { active: true };
    
    // Add optional filtering
    if (filter === 'active') {
      matchConditions.status = 'active';
    } else if (filter === 'breeding') {
      matchConditions.healthStatus = 'breeding';
    } else if (filter === 'healthy') {
      matchConditions.healthStatus = 'healthy';
    }
    
    // If user is a farmer, they can only see their assigned farm
    if (req.user.role === 'farmer' && req.user.assignedFarm) {
      const farmId = req.user.assignedFarm;
      matchConditions['currentLocation.farmId'] = farmId;
    }
    
    // Get all farms first (to ensure we return all farms even with no pigs)
    const allFarms = await Farm.find().lean();
    
    // Get pig distribution by farm
    const pigsByFarm = await Pig.aggregate([
      { $match: matchConditions },
      { $group: {
        _id: '$currentLocation.farmId',
        count: { $sum: 1 }
      }}
    ]);
    
    // Map farm IDs to counts
    const farmCounts = {};
    pigsByFarm.forEach(item => {
      farmCounts[item._id] = item.count;
    });
    
    // Create final result with all farms
    const result = allFarms.map(farm => ({
      _id: farm._id,
      name: farm.name,
      count: farmCounts[farm._id] || 0
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching farm distribution:', error);
    res.status(500).json({ error: 'Failed to fetch farm distribution' });
  }
});

// GET single farm with detailed information
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    // If user is a farmer, they can only access their assigned farm
    if (req.user.role === 'farmer' && req.user.assignedFarm) {
      const farmId = req.user.assignedFarm.toString();
      const requestedFarmId = req.params.id;
      
      if (farmId !== requestedFarmId) {
        console.log(`Farmer ${req.user.email} attempted to access unauthorized farm: ${requestedFarmId}`);
        return res.status(403).json({ error: 'You are not authorized to access this farm' });
      }
      
      console.log(`Farmer ${req.user.email} accessing their assigned farm: ${farmId}`);
    }
    
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    
    // Get all related data in parallel
    const [barns, stalls, pigs, devices] = await Promise.all([
      Barn.find({ farmId: farm._id }).select('name _id'),
      Stall.find({ farmId: farm._id }).select('name barnId _id'),
      Pig.find({ 'currentLocation.farmId': farm._id, active: true })
        .select('pigId breed age healthStatus')
        .populate('healthStatus'),
      Device.find({ farmId: farm._id }).select('name type status')
    ]);
    
    // Calculate health status distribution
    const healthStatusCount = {
      healthy: 0,
      critical: 0,
      atRisk: 0,
      noMovement: 0
    };
    
    pigs.forEach(pig => {
      const status = pig.healthStatus?.status || 'healthy';
      healthStatusCount[status]++;
    });
    
    res.json({
      ...farm.toObject(),
      counts: {
        barns: barns.length,
        stalls: stalls.length,
        pigs: pigs.length,
        devices: devices.length
      },
      healthStatus: healthStatusCount,
      barns: barns,
      recentPigs: pigs.slice(0, 10),
      devices: devices.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching farm:', error);
    res.status(500).json({ error: 'Failed to fetch farm' });
  }
});

// CREATE new farm (admin only)
router.post('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, location, description, isActive } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }
    
    const newFarm = await Farm.create({ 
      name, 
      location, 
      description, 
      isActive: isActive !== undefined ? isActive : true 
    });
    res.status(201).json(newFarm);
  } catch (error) {
    console.error('Error creating farm:', error);
    res.status(500).json({ error: 'Failed to create farm' });
  }
});

// UPDATE farm (admin only)
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, location, description, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
    
    const updatedFarm = await Farm.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedFarm) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    
    res.json(updatedFarm);
  } catch (error) {
    console.error('Error updating farm:', error);
    res.status(500).json({ error: 'Failed to update farm' });
  }
});

// DELETE farm (admin only)
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { cascade } = req.query; // Add ?cascade=true to delete associated data

    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    // Require cascade flag to avoid orphaned resources
    if (cascade !== 'true') {
      return res.status(400).json({
        error:
          'Deleting a farm without cascade=true would orphan related resources.'
      });
    }

    // Delete all associated data when cascade=true
    await Promise.all([
      Barn.deleteMany({ farmId: farm._id }),
      Stall.deleteMany({ farmId: farm._id }),
      Pig.deleteMany({ 'currentLocation.farmId': farm._id }),
      Device.deleteMany({ farmId: farm._id })
    ]);

    await Farm.findByIdAndDelete(req.params.id);

    res.json({ message: 'Farm deleted successfully' });
  } catch (error) {
    console.error('Error deleting farm:', error);
    res.status(500).json({ error: 'Failed to delete farm' });
  }
});

module.exports = router;
