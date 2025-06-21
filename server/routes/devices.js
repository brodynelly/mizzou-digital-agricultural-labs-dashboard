// routes/device.js
const express = require('express')
const router = express.Router()
const Device = require('../models/Device')
const rateLimit = require('express-rate-limit')

// Set up rate limiter: maximum of 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

// Apply rate limiter to all requests
router.use(limiter)
const TemperatureData = require('../models/TemperatureData')
const Pig = require('../models/Pig')

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({}).sort({ lastUpdate: -1 })
    
    const transformedDevices = devices.map(device => ({
      id: device.deviceId,
      created: device.insertionTime || new Date().toISOString(),
      deviceName: device.deviceName,
      type: device.deviceType,
      status: device.status,
      priority: device.status === 'online'
        ? 'low'
        : device.status === 'warning'
          ? 'medium'
          : 'high',
      lastDataPoint: device.lastUpdate 
        ? new Date(device.lastUpdate).toISOString()
        : new Date().toISOString()
    }))

    res.json(transformedDevices)
  } catch (error) {
    console.error('Error fetching devices:', error)
    res.status(500).json({ error: 'Failed to fetch devices' })
  }
})

// Get single device
router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: parseInt(req.params.id) })
    if (!device) {
      return res.status(404).json({ error: 'Device not found' })
    }
    res.json(device)
  } catch (error) {
    console.error('Error fetching device:', error)
    res.status(500).json({ error: 'Failed to fetch device' })
  }
})

// Get device temperature history
router.get('/:id/temperature', async (req, res) => {
  try {
    const temperatureData = await TemperatureData.find({ 
      deviceId: parseInt(req.params.id) 
    })
      .sort({ timestamp: -1 })
      .limit(100)

    res.json(temperatureData)
  } catch (error) {
    console.error('Error fetching temperature data:', error)
    res.status(500).json({ error: 'Failed to fetch temperature data' })
  }
})

// Get associated pig for device
router.get('/:id/pig', async (req, res) => {
  try {
    const pig = await Pig.findOne({ deviceId: parseInt(req.params.id) })
    res.json({ pigId: pig?.pigId || null })
  } catch (error) {
    console.error('Error fetching associated pig:', error)
    res.status(500).json({ error: 'Failed to fetch associated pig' })
  }
})

// Create new device
router.post('/', async (req, res) => {
  try {
    const lastDevice = await Device.findOne().sort({ deviceId: -1 })
    const newDeviceId = (lastDevice?.deviceId || 0) + 1

    const newDevice = await Device.create({
      deviceId: newDeviceId,
      deviceName: req.body.deviceName,
      deviceType: req.body.deviceType,
      status: req.body.status,
      temperature: 25.0, // Default temperature
      insertionTime: new Date(),
      lastUpdate: new Date()
    })

    res.status(201).json(newDevice)
  } catch (error) {
    console.error('Error creating device:', error)
    res.status(500).json({ error: 'Failed to create device' })
  }
})

// Update device
router.put('/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    
    // Validate req.body values
    const { deviceName, deviceType, status } = req.body;
    if (typeof deviceName !== 'string' || typeof deviceType !== 'string' || typeof status !== 'string') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    const updates = {
      deviceName,
      deviceType,
      status,
      lastUpdate: new Date()
    }
    
    const updatedDevice = await Device.findOneAndUpdate(
      { deviceId },
      updates,
      { new: true }
    )

    if (!updatedDevice) {
      return res.status(404).json({ error: 'Device not found' })
    }

    res.json(updatedDevice)
  } catch (error) {
    console.error('Error updating device:', error)
    res.status(500).json({ error: 'Failed to update device' })
  }
})

// Delete device
router.delete('/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    const result = await Device.findOneAndDelete({ deviceId })
    
    if (!result) {
      return res.status(404).json({ error: 'Device not found' })
    }

    // Delete associated temperature data
    await TemperatureData.deleteMany({ deviceId })

    res.json({ message: 'Device deleted successfully' })
  } catch (error) {
    console.error('Error deleting device:', error)
    res.status(500).json({ error: 'Failed to delete device' })
  }
})

// ADDITIONAL: Device analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const devices = await Device.find({})
    const total = devices.length
    const onlineCount = devices.filter(d => d.status === 'online').length
    const offlineCount = devices.filter(d => d.status === 'offline').length
    const warningCount = devices.filter(d => d.status === 'warning').length

    // Example average temperature calculation (if you store current temperature in device docs)
    const totalTemp = devices.reduce((acc, d) => acc + (d.temperature || 0), 0)
    const avgTemp = total > 0 ? (totalTemp / total).toFixed(2) : 0

    res.json({
      totalDevices: total,
      onlineCount,
      offlineCount,
      warningCount,
      avgTemperature: Number(avgTemp)
    })
  } catch (error) {
    console.error('Error getting device analytics:', error)
    res.status(500).json({ error: 'Failed to get device analytics' })
  }
})

module.exports = router
