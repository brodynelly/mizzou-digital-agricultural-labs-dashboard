// routes/temperatureData.js
const express = require('express')
const router = express.Router()
const TemperatureData = require('../models/TemperatureData')
const rateLimit = require('express-rate-limit')
const { authenticateJWT } = require('../middleware/authMiddleware')

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

// Apply rate limiter to all routes
router.use(limiter)

// GET all temperature records
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const records = await TemperatureData.find({}).sort({ timestamp: -1 })
    res.json(records)
  } catch (error) {
    console.error('Error fetching temperature data:', error)
    res.status(500).json({ error: 'Failed to fetch temperature data' })
  }
})

// GET specific record by recordId
router.get('/:recordId', authenticateJWT, async (req, res) => {
  try {
    const record = await TemperatureData.findOne({
      recordId: parseInt(req.params.recordId)
    })
    if (!record) {
      return res.status(404).json({ error: 'Temperature record not found' })
    }
    res.json(record)
  } catch (error) {
    console.error('Error fetching temperature record:', error)
    res.status(500).json({ error: 'Failed to fetch temperature record' })
  }
})

// CREATE new temperature record
router.post('/', authenticateJWT, async (req, res) => {
  try {
    // Auto-increment logic if needed
    const lastRecord = await TemperatureData.findOne().sort({ recordId: -1 })
    const newRecordId = (lastRecord?.recordId || 0) + 1

    const newRecord = await TemperatureData.create({
      recordId: newRecordId,
      deviceId: parseInt(req.body.deviceId),
      temperature: parseFloat(req.body.temperature),
      timestamp: req.body.timestamp || new Date()
    })

    res.status(201).json(newRecord)
  } catch (error) {
    console.error('Error creating temperature record:', error)
    res.status(500).json({ error: 'Failed to create temperature record' })
  }
})

// UPDATE temperature record
router.put('/:recordId', authenticateJWT, async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId)
    const updates = {
      deviceId: parseInt(req.body.deviceId),
      temperature: parseFloat(req.body.temperature),
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    }
    
    const updatedRecord = await TemperatureData.findOneAndUpdate(
      { recordId },
      updates,
      { new: true }
    )

    if (!updatedRecord) {
      return res.status(404).json({ error: 'Temperature record not found' })
    }

    res.json(updatedRecord)
  } catch (error) {
    console.error('Error updating temperature record:', error)
    res.status(500).json({ error: 'Failed to update temperature record' })
  }
})

// DELETE temperature record
router.delete('/:recordId', authenticateJWT, async (req, res) => {
  try {
    const recordId = parseInt(req.params.recordId)
    const result = await TemperatureData.findOneAndDelete({ recordId })
    if (!result) {
      return res.status(404).json({ error: 'Temperature record not found' })
    }
    res.json({ message: 'Temperature record deleted successfully' })
  } catch (error) {
    console.error('Error deleting temperature record:', error)
    res.status(500).json({ error: 'Failed to delete temperature record' })
  }
})

// ADDITIONAL: Temperature analytics
router.get('/analytics/summary', authenticateJWT, async (req, res) => {
  try {
    const records = await TemperatureData.find({})
    if (!records || records.length === 0) {
      return res.json({
        totalRecords: 0,
        avgTemperature: 0,
        minTemperature: null,
        maxTemperature: null
      })
    }

    const totalRecords = records.length
    let sumTemp = 0
    let minTemp = records[0].temperature
    let maxTemp = records[0].temperature

    records.forEach(r => {
      sumTemp += r.temperature
      if (r.temperature < minTemp) minTemp = r.temperature
      if (r.temperature > maxTemp) maxTemp = r.temperature
    })

    const avgTemperature = sumTemp / totalRecords

    res.json({
      totalRecords,
      avgTemperature: Number(avgTemperature.toFixed(2)),
      minTemperature,
      maxTemperature
    })
  } catch (error) {
    console.error('Error fetching temperature analytics:', error)
    res.status(500).json({ error: 'Failed to fetch temperature analytics' })
  }
})

module.exports = router
