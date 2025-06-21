const express = require('express')
const router = express.Router()
const Barn = require('../models/Barn')
const Stall = require('../models/Stall')
const Pig = require('../models/Pig')
const rateLimit = require('express-rate-limit')
const Farm = require('../models/Farm')
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})

// Apply rate limiter to all requests
router.use(limiter)
// Authenticate all barn routes
router.use(authenticateJWT)

// GET all barns with farm details and stall counts
router.get('/', async (req, res) => {
  try {
    const barns = await Barn.find({})
      .populate({
        path: 'farmId',
        select: 'name location'
      })
      .sort({ name: 1 })

    // Add stall and pig counts to each barn
    const barnsWithCounts = await Promise.all(barns.map(async barn => {
      const [stallCount, pigCount] = await Promise.all([
        Stall.countDocuments({ barnId: barn._id }),
        Pig.countDocuments({ 'currentLocation.barnId': barn._id, active: true })
      ])
      
      return {
        ...barn.toObject(),
        stallCount,
        pigCount
      }
    }))

    res.json(barnsWithCounts)
  } catch (error) {
    console.error('Error fetching barns:', error)
    res.status(500).json({ error: 'Failed to fetch barns' })
  }
})
router.get('/capacity', async (req, res) => {
  try {
    const { filter } = req.query;
    
    // Set up base match conditions
    const matchConditions = { active: true };
    
    // Add optional filtering
    if (filter === 'overcrowded') {
      matchConditions['$expr'] = { $gt: ['$current', '$capacity'] };
    } else if (filter === 'underutilized') {
      matchConditions['$expr'] = { $lt: ['$current', { $multiply: ['$capacity', 0.5] }] };
    }
    // Add more filters as needed

    const barns = await Barn.aggregate([
      {
        $lookup: {
          from: 'stalls',
          localField: '_id',
          foreignField: 'barnId',
          as: 'stalls'
        }
      },
      {
        $unwind: '$stalls'
      },
      {
        $lookup: {
          from: 'pigs',
          let: { stallId: '$stalls._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$currentLocation.stallId', '$$stallId'] },
                    { $eq: ['$active', true] }
                  ]
                }
              }
            }
          ],
          as: 'pigs'
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          current: { $sum: { $size: '$pigs' } },
          capacity: { $sum: '$stalls.capacity' },
          utilization: {
            $avg: {
              $cond: [
                { $gt: ['$stalls.capacity', 0] },
                { $divide: [{ $size: '$pigs' }, '$stalls.capacity'] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          current: 1,
          capacity: 1,
          utilization: { $round: ['$utilization', 2] },
          status: {
            $switch: {
              branches: [
                { case: { $gt: ['$current', '$capacity'] }, then: 'overcrowded' },
                { case: { $lt: ['$current', { $multiply: ['$capacity', 0.5] }] }, then: 'underutilized' }
              ],
              default: 'optimal'
            }
          }
        }
      },
      { $match: matchConditions },
      { $sort: { name: 1 } }
    ]);

    // Calculate summary statistics
    const summary = {
      totalBarns: barns.length,
      totalCapacity: barns.reduce((sum, barn) => sum + barn.capacity, 0),
      totalCurrent: barns.reduce((sum, barn) => sum + barn.current, 0),
      averageUtilization: barns.length > 0 ? 
        barns.reduce((sum, barn) => sum + barn.utilization, 0) / barns.length : 0,
      statusCounts: {
        overcrowded: barns.filter(b => b.status === 'overcrowded').length,
        underutilized: barns.filter(b => b.status === 'underutilized').length,
        optimal: barns.filter(b => b.status === 'optimal').length
      }
    };

    res.json({
      success: true,
      data: barns,
      meta: summary
    });

  } catch (error) {
    console.error('Error fetching barn capacity:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// GET barns by farm ID
router.get('/farm/:id', async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    // Get all related data in parallel
    const [barns, stalls] = await Promise.all([
      Barn.find({ farmId: farm._id }).select('_id name farmId '),
      Stall.find({ farmId: farm._id }).select('name barnId _id'),
    ]);
    res.json(
      //...barns.toObject(), 
      [...barns]
    );
  } catch (error) {
    console.error('Error fetching barns by farm:', error)
    res.status(500).json({ error: 'Failed to fetch barns' })
  }
})

// GET single barn with detailed info
router.get('/:id', async (req, res) => {
  try {
    const barn = await Barn.findById(req.params.id)
      .populate({
        path: 'farmId',
        select: 'name location'
      })
      .populate({
        path: 'stalls',
        select: 'name',
        options: { sort: { name: 1 } }
      })

    if (!barn) {
      return res.status(404).json({ error: 'Barn not found' })
    }

    // Get counts for analytics
    const [stallCount, pigCount] = await Promise.all([
      Stall.countDocuments({ barnId: barn._id }),
      Pig.countDocuments({ 'currentLocation.barnId': barn._id, active: true })
    ])

    res.json({
      ...barn.toObject(),
      counts: {
        stalls: stallCount,
        pigs: pigCount
      }
    })
  } catch (error) {
    console.error('Error fetching barn:', error)
    res.status(500).json({ error: 'Failed to fetch barn' })
  }
})

// CREATE barn with validation (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, farmId } = req.body

    if (!name || !farmId) {
      return res.status(400).json({ error: 'Name and farmId are required' })
    }

    const newBarn = await Barn.create({ 
      name,
      farmId
    })

    res.status(201).json(newBarn)
  } catch (error) {
    console.error('Error creating barn:', error)
    res.status(500).json({ error: 'Failed to create barn' })
  }
})

// UPDATE barn (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { name, farmId } = req.body

    if (!name || !farmId) {
      return res.status(400).json({ error: 'Name and farmId are required' })
    }

    const updatedBarn = await Barn.findByIdAndUpdate(
      req.params.id,
      { name, farmId },
      { new: true, runValidators: true }
    )

    if (!updatedBarn) {
      return res.status(404).json({ error: 'Barn not found' })
    }

    res.json(updatedBarn)
  } catch (error) {
    console.error('Error updating barn:', error)
    res.status(500).json({ error: 'Failed to update barn' })
  }
})

// DELETE barn with cascade option (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { cascade } = req.query

    const barn = await Barn.findById(req.params.id)
    if (!barn) {
      return res.status(404).json({ error: 'Barn not found' })
    }

    if (cascade === 'true') {
      // Cascade delete - remove associated stalls and update pigs
      await Promise.all([
        Stall.deleteMany({ barnId: barn._id }),
        Pig.updateMany(
          { 'currentLocation.barnId': barn._id },
          { $set: { 'currentLocation.barnId': null } }
        )
      ])
    }

    await barn.deleteOne()
    res.json({ message: 'Barn deleted successfully' })
  } catch (error) {
    console.error('Error deleting barn:', error)
    res.status(500).json({ error: 'Failed to delete barn' })
  }
})

// GET barn analytics with detailed information
router.get('/:id/analytics', async (req, res) => {
  try {
    const barn = await Barn.findById(req.params.id)
      .populate({
        path: 'farmId',
        select: 'name'
      })

    if (!barn) {
      return res.status(404).json({ error: 'Barn not found' })
    }

    const [stalls, pigs] = await Promise.all([
      Stall.find({ barnId: barn._id }).select('name'),
      Pig.find({ 'currentLocation.barnId': barn._id, active: true })
        .select('pigId breed age healthStatus')
        .populate('healthStatus')
    ])

    // Health status distribution
    const healthStatusCount = {
      healthy: 0,
      critical: 0,
      atRisk: 0,
      noMovement: 0
    }

    pigs.forEach(pig => {
      const status = pig.healthStatus?.status || 'healthy'
      healthStatusCount[status]++
    })

    res.json({
      barn: {
        name: barn.name,
        farm: barn.farmId.name
      },
      counts: {
        stalls: stalls.length,
        pigs: pigs.length
      },
      healthStatus: healthStatusCount,
      stalls: stalls,
      recentPigs: pigs.slice(0, 10)
    })
  } catch (error) {
    console.error('Error fetching barn analytics:', error)
    res.status(500).json({ error: 'Failed to fetch barn analytics' })
  }
})

module.exports = router