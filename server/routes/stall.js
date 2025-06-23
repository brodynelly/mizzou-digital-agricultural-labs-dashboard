const express = require('express')
const router = express.Router()
const Stall = require('../models/Stall')
const Barn = require('../models/Barn')
const Pig = require('../models/Pig')
const mongoose = require('mongoose')
const rateLimit = require('express-rate-limit')
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})

// Apply rate limiter to all requests
router.use(limiter)

// Helper function to validate and extract ObjectId
const validateObjectId = (id) => {
  // Handle case where id might be an object with _id property
  if (typeof id === 'object' && id !== null && id._id) {
    id = id._id
  }

  // Convert to string if it's not already
  id = String(id)

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId format: ${id}`)
  }

  return id
}

// GET all stalls with barn and farm details
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const stalls = await Stall.find({})
      .populate({
        path: 'barnId',
        select: 'name'
      })
      .populate({
        path: 'farmId',
        select: 'name'
      })
      .sort({ name: 1 })

    // Add pig counts to each stall
    const stallsWithCounts = await Promise.all(stalls.map(async stall => {
      const pigCount = await Pig.countDocuments({
        'currentLocation.stallId': stall._id,
        active: true
      })

      return {
        ...stall.toObject(),
        pigCount
      }
    }))

    res.json(stallsWithCounts)
  } catch (error) {
    console.error('Error fetching stalls:', error)
    res.status(500).json({ error: 'Failed to fetch stalls' })
  }
})

// GET stalls by barn ID
router.get('/barn/:barnId', authenticateJWT, async (req, res) => {
  try {
    const barnId = validateObjectId(req.params.barnId)

    const stalls = await Stall.find({ barnId })
      .populate({
        path: 'barnId',
        select: 'name'
      })
      .sort({ name: 1 })

    res.json(stalls)
  } catch (error) {
    console.error('Error fetching stalls by barn:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to fetch stalls' })
  }
})

router.get('/health', authenticateJWT, async (req, res) => {
  try {
    const { filter } = req.query;

    const matchStage = {
      active: true
    };

    // Add optional filtering based on the request
    if (filter === 'region1') {
      matchStage['location.region'] = 'Region 1';
    } else if (filter === 'region2') {
      matchStage['location.region'] = 'Region 2';
    }
    // Add more filters as needed

    const stalls = await Stall.aggregate([
      {
        $lookup: {
          from: 'pigs',
          let: { stallId: '$_id' },
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
        $match: matchStage
      },
      {
        $project: {
          name: 1,
          healthy: {
            $size: {
              $filter: {
                input: '$pigs',
                as: 'pig',
                cond: { $eq: ['$$pig.healthStatus', 'healthy'] }
              }
            }
          },
          unhealthy: {
            $size: {
              $filter: {
                input: '$pigs',
                as: 'pig',
                cond: { $ne: ['$$pig.healthStatus', 'healthy'] }
              }
            }
          },
          total: {
            $size: '$pigs'
          }
        }
      },
      {
        $sort: {
          // Sort by most unhealthy first to highlight problem areas
          unhealthy: -1,
          name: 1
        }
      },
      { $limit: 10 } // Limit to top 10 stalls for the chart
    ]);

    res.json(stalls);
  } catch (error) {
    console.error('Error fetching stall health:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET single stall with detailed info
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const stallId = validateObjectId(req.params.id)

    const stall = await Stall.findById(stallId)
      .populate({
        path: 'barnId',
        select: 'name farmId',
        populate: {
          path: 'farmId',
          select: 'name'
        }
      })

    if (!stall) {
      return res.status(404).json({ error: 'Stall not found' })
    }

    // Get pig count and recent pigs
    const [pigCount, pigs] = await Promise.all([
      Pig.countDocuments({ 'currentLocation.stallId': stall._id, active: true }),
      Pig.find({ 'currentLocation.stallId': stall._id, active: true })
        .select('pigId breed age')
        .limit(10)
    ])

    res.json({
      ...stall.toObject(),
      pigCount,
      recentPigs: pigs
    })
  } catch (error) {
    console.error('Error fetching stall:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to fetch stall' })
  }
})

// CREATE stall with validation
router.post('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, barnId, farmId } = req.body

    if (!name || !barnId || !farmId) {
      return res.status(400).json({ error: 'Name, barnId and farmId are required' })
    }

    // Validate ObjectIds
    const validatedBarnId = validateObjectId(barnId)
    const validatedFarmId = validateObjectId(farmId)

    const newStall = await Stall.create({
      name,
      barnId: validatedBarnId,
      farmId: validatedFarmId
    })

    res.status(201).json(newStall)
  } catch (error) {
    console.error('Error creating stall:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to create stall' })
  }
})

// UPDATE stall
router.put('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { name, barnId, farmId } = req.body
    const stallId = validateObjectId(req.params.id)

    if (!name || !barnId || !farmId) {
      return res.status(400).json({ error: 'Name, barnId and farmId are required' })
    }

    // Validate ObjectIds
    const validatedBarnId = validateObjectId(barnId)
    const validatedFarmId = validateObjectId(farmId)

    const updatedStall = await Stall.findByIdAndUpdate(
      stallId,
      { name, barnId: validatedBarnId, farmId: validatedFarmId },
      { new: true, runValidators: true }
    )

    if (!updatedStall) {
      return res.status(404).json({ error: 'Stall not found' })
    }

    res.json(updatedStall)
  } catch (error) {
    console.error('Error updating stall:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to update stall' })
  }
})

// DELETE stall with pig reassignment
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const stallId = validateObjectId(req.params.id)

    const stall = await Stall.findById(stallId)
    if (!stall) {
      return res.status(404).json({ error: 'Stall not found' })
    }

    // Reassign pigs to null or another stall
    await Pig.updateMany(
      { 'currentLocation.stallId': stall._id },
      { $set: { 'currentLocation.stallId': null } }
    )

    await stall.deleteOne()
    res.json({ message: 'Stall deleted successfully' })
  } catch (error) {
    console.error('Error deleting stall:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to delete stall' })
  }
})

// GET stall analytics with pig health data
router.get('/:id/analytics', authenticateJWT, async (req, res) => {
  try {
    const stallId = validateObjectId(req.params.id)

    const stall = await Stall.findById(stallId)
      .populate({
        path: 'barnId',
        select: 'name'
      })

    if (!stall) {
      return res.status(404).json({ error: 'Stall not found' })
    }

    const pigs = await Pig.find({ 'currentLocation.stallId': stall._id, active: true })
      .select('pigId breed age healthStatus')
      .populate('healthStatus')

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
      stall: {
        name: stall.name,
        barn: stall.barnId.name
      },
      pigCount: pigs.length,
      healthStatus: healthStatusCount,
      recentPigs: pigs.slice(0, 10)
    })
  } catch (error) {
    console.error('Error fetching stall analytics:', error)
    if (error.message.includes('Invalid ObjectId format')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to fetch stall analytics' })
  }
})

module.exports = router