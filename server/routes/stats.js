const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get models directly from mongoose
const Device = mongoose.model('Device');
const PigBCS = mongoose.model('PigBCS'); // Changed from BCSData to PigBCS
const PostureData = require('../models/PostureData'
);
const TemperatureData = mongoose.model('TemperatureData');
const Pig = mongoose.model('Pig');
const Farm = mongoose.model('Farm');
const Barn = mongoose.model('Barn');
const Stall = mongoose.model('Stall');
const PigHealthStatus = require('../models/PigHealthStatus');
const PigFertility = mongoose.model('PigFertility');
const PigHeatStatus = mongoose.model('PigHeatStatus');

router.get('/', async (req, res) => {
  try {
    // Execute all independent queries in parallel
    const [
      devices,
      pigs,
      latestTemps,
      bcsData,
      postureData,
      barns,
      stalls,
      pigHealthData,
      pigFertilityData,
      pigHeatStatusData,
      farmCount,
      barnCount,
      stallCount
    ] = await Promise.all([
      Device.find({}),
      Pig.find({}),
      TemperatureData.find({}).sort({ timestamp: -1 }),
      PigBCS.find({}).sort({ timestamp: -1 }), // Using PigBCS instead of BCSData
      PostureData.find({}),
      Barn.find({}),
      Stall.find({}),
      PigHealthStatus.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$pigId", status: { $first: "$status" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      PigFertility.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$pigId", status: { $first: "$status" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      PigHeatStatus.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$pigId", status: { $first: "$status" } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Farm.countDocuments({}),
      Barn.countDocuments({}),
      Stall.countDocuments({})
    ]);

    // Calculate device stats
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const deviceUsage = devices.length > 0 
      ? Math.round((onlineDevices / devices.length) * 100) 
      : 0;

    // Calculate temperature stats
    const avgDeviceTemp = devices.length > 0
      ? devices.reduce((acc, d) => acc + (d.temperature || 0), 0) / devices.length
      : 0;
    
    const avgTemp = latestTemps.length > 0
      ? latestTemps.reduce((acc, curr) => acc + curr.temperature, 0) / latestTemps.length
      : 0;

    // Calculate BCS stats - using score instead of bcsScore
    const avgBCS = bcsData.length > 0
      ? bcsData.reduce((acc, curr) => acc + curr.score, 0) / bcsData.length
      : 0;

    // Calculate posture stats
    const postureCounts = postureData.reduce((acc, curr) => {
      acc[curr.score] = (acc[curr.score] || 0) + 1;
      return acc;
    }, {});

    const postureDistribution = Object.entries(postureCounts).map(([posture, count]) => ({
      posture: Number(posture),
      count,
      percentage: postureData.length > 0 ? Math.round((count / postureData.length) * 100) : 0
    }));

    // Process health data
    const healthStats = pigHealthData.reduce((acc, curr) => {
      acc[curr._id.toLowerCase().replace(/\s+/g, '')] = curr.count;
      return acc;
    }, {});

    // Process fertility data
    const fertilityStats = pigFertilityData.reduce((acc, curr) => {
      acc[curr._id.toLowerCase().replace(/\s+/g, '')] = curr.count;
      return acc;
    }, {});

    // Process heat status data
    const pigHeatStats = {
      totalOpen: pigHeatStatusData.find(h => h._id.toLowerCase() === 'open')?.count || 0,
      totalBred: pigHeatStatusData.find(h => h._id.toLowerCase() === 'bred')?.count || 0,
      totalPregnant: pigHeatStatusData.find(h => h._id.toLowerCase() === 'pregnant')?.count || 0,
      totalFarrowing: pigHeatStatusData.find(h => h._id.toLowerCase() === 'farrowing')?.count || 0,
      totalWeaning: pigHeatStatusData.find(h => h._id.toLowerCase() === 'weaning')?.count || 0,
    };

    // Create maps for barn and stall data
    const barnMap = new Map(barns.map(barn => [barn._id.toString(), barn.name]));
    const stallMap = new Map(stalls.map(stall => [
      stall._id.toString(), 
      { name: stall.name, barnId: stall.barnId.toString() }
    ]));

    // Calculate pigs per barn and stall
    const pigsPerBarn = await Pig.aggregate([
      { $group: { _id: "$currentLocation.barnId", totalPigs: { $sum: 1 } } }
    ]);

    const pigsPerStall = await Pig.aggregate([
      { $group: { _id: "$currentLocation.stallId", totalPigs: { $sum: 1 } } }
    ]);

    // Format barn stats
    const barnStats = {};
    barns.forEach(barn => {
      const barnId = barn._id.toString();
      barnStats[barn.name] = pigsPerBarn.find(b => b._id.toString() === barnId)?.totalPigs || 0;
    });

    // Format stall stats grouped by barn
    const stallStats = {};
    barns.forEach(barn => {
      const barnId = barn._id.toString();
      stallStats[barn.name] = {};
      
      stalls
        .filter(stall => stall.barnId.toString() === barnId)
        .forEach(stall => {
          const stallId = stall._id.toString();
          stallStats[barn.name][stall.name] = 
            pigsPerStall.find(s => s._id.toString() === stallId)?.totalPigs || 0;
        });
    });

    // Prepare response - maintaining the exact same structure as before
    res.json({
      deviceStats: {
        onlineDevices,
        totalDevices: devices.length,
        deviceUsage,
        averageTemperature: Number(avgDeviceTemp.toFixed(1)),
        latestTemperatureStats: Number(avgTemp.toFixed(1))
      },
      bcsStats: {
        averageBCS: Number(avgBCS.toFixed(1)) // Still called averageBCS for frontend compatibility
      },
      postureDistribution,
      pigStats: {
        totalPigs: pigs.length,
        averageAge: pigs.length 
          ? Number((pigs.reduce((acc, p) => acc + (p.age || 0), 0) / pigs.length).toFixed(1)) 
          : 0
      },
      pigHealthStats: {
        totalAtRisk: pigHealthData.find(h => h._id === 'at risk')?.count || 0,
        totalHealthy: pigHealthData.find(h => h._id === 'healthy')?.count || 0,
        totalCritical: pigHealthData.find(h => h._id === 'critical')?.count || 0,
        totalNoMovement: pigHealthData.find(h => h._id === 'no movement')?.count || 0
      },
      pigHeatStats,
      barnStats,
      stallStats,
      pigFertilityStats: {
        InHeat: fertilityStats['in-heat'] || 0,
        PreHeat: fertilityStats['pre-heat'] || 0,
        Open: fertilityStats['open'] || 0,
        ReadyToBreed: fertilityStats['ready-to-breed'] || 0,
      },
      farmBarnStallStats: {
        totalFarms: farmCount,
        totalBarns: barnCount,
        totalStalls: stallCount
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;