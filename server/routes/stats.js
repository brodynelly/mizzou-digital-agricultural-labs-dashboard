const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Get models directly from mongoose
const Device = mongoose.model('Device');
const PigBCS = mongoose.model('PigBCS'); // Changed from BCSData to PigBCS
const PostureData = require("../models/PostureData");
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
    const [
      deviceAgg,
      latestTempsAgg,
      bcsAgg,
      postureAgg,
      pigAggregations,
      pigHealthData,
      pigFertilityData,
      pigHeatStatusData,
      farmCount,
      barnCount,
      stallCount
    ] = await Promise.all([
      Device.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] } },
            averageTemperature: { $avg: "$temperature" }
          }
        }
      ]),
      TemperatureData.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$deviceId", temperature: { $first: "$temperature" } } },
        { $group: { _id: null, avgTemp: { $avg: "$temperature" } } }
      ]),
      PigBCS.aggregate([{ $group: { _id: null, avgScore: { $avg: "$score" } } }]),
      PostureData.aggregate([{ $group: { _id: "$score", count: { $sum: 1 } } }]),
      Pig.aggregate([
        {
          $facet: {
            stats: [
              { $group: { _id: null, total: { $sum: 1 }, avgAge: { $avg: "$age" } } }
            ],
            perBarn: [
              { $group: { _id: "$currentLocation.barnId", totalPigs: { $sum: 1 } } },
              {
                $lookup: {
                  from: "barns",
                  localField: "_id",
                  foreignField: "_id",
                  as: "barn"
                }
              },
              { $unwind: { path: "$barn", preserveNullAndEmptyArrays: true } },
              { $project: { barnId: "$_id", name: "$barn.name", totalPigs: 1 } }
            ],
            perStall: [
              { $group: { _id: "$currentLocation.stallId", totalPigs: { $sum: 1 } } },
              {
                $lookup: {
                  from: "stalls",
                  localField: "_id",
                  foreignField: "_id",
                  as: "stall"
                }
              },
              { $unwind: { path: "$stall", preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: "barns",
                  localField: "stall.barnId",
                  foreignField: "_id",
                  as: "barn"
                }
              },
              { $unwind: { path: "$barn", preserveNullAndEmptyArrays: true } },
              { $project: { stallId: "$_id", name: "$stall.name", barnId: "$barn._id", barnName: "$barn.name", totalPigs: 1 } }
            ]
          }
        }
      ]),
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
    );

    const deviceResult = deviceAgg[0] || {};
    const totalDevices = deviceResult.total || 0;
    const onlineDevices = deviceResult.online || 0;
    const avgDeviceTemp = deviceResult.averageTemperature || 0;
    const deviceUsage = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

    const avgTemp = latestTempsAgg[0]?.avgTemp || 0;

    const avgBCS = bcsAgg[0]?.avgScore || 0;

    const totalPostures = postureAgg.reduce((acc, p) => acc + p.count, 0);
    const postureDistribution = postureAgg.map(p => ({
      posture: Number(p._id),
      count: p.count,
      percentage: totalPostures > 0 ? Math.round((p.count / totalPostures) * 100) : 0
    }));

    const pigAgg = pigAggregations[0] || { stats: [], perBarn: [], perStall: [] };
    const pigStatsDoc = pigAgg.stats[0] || {};
    const totalPigs = pigStatsDoc.total || 0;
    const avgAge = pigStatsDoc.avgAge || 0;
    const pigsPerBarn = pigAgg.perBarn;
    const pigsPerStall = pigAgg.perStall;

    const healthStats = pigHealthData.reduce((acc, curr) => {
      acc[curr._id.toLowerCase()] = curr.count;
      return acc;
    }, {});

    const fertilityStats = pigFertilityData.reduce((acc, curr) => {
      acc[curr._id.toLowerCase().replace(/\s+/g, '')] = curr.count;
      return acc;
    }, {});

    const pigHeatStats = {
      totalOpen: pigHeatStatusData.find(h => h._id.toLowerCase() === 'open')?.count || 0,
      totalBred: pigHeatStatusData.find(h => h._id.toLowerCase() === 'bred')?.count || 0,
      totalPregnant: pigHeatStatusData.find(h => h._id.toLowerCase() === 'pregnant')?.count || 0,
      totalFarrowing: pigHeatStatusData.find(h => h._id.toLowerCase() === 'farrowing')?.count || 0,
      totalWeaning: pigHeatStatusData.find(h => h._id.toLowerCase() === 'weaning')?.count || 0,
    };

    const barnStats = {};
    pigsPerBarn.forEach(b => {
      barnStats[b.name || 'Unknown'] = b.totalPigs;
    });

    const stallStats = {};
    pigsPerStall.forEach(s => {
      const barnName = s.barnName || 'Unknown';
      if (!stallStats[barnName]) stallStats[barnName] = {};
      stallStats[barnName][s.name || 'Unknown'] = s.totalPigs;
    });

    // Prepare response - maintaining the exact same structure as before
    res.json({
      deviceStats: {
        onlineDevices,
        totalDevices,
        deviceUsage,
        averageTemperature: Number(avgDeviceTemp.toFixed(1)),
        latestTemperatureStats: Number(avgTemp.toFixed(1))
      },
      bcsStats: {
        averageBCS: Number(avgBCS.toFixed(1)) // Still called averageBCS for frontend compatibility
      },
      postureDistribution,
      pigStats: {
        totalPigs: totalPigs,
        averageAge: Number((avgAge || 0).toFixed(1))
      },
      pigHealthStats: {
        totalAtRisk: healthStats['at risk'] || 0,
        totalHealthy: healthStats['healthy'] || 0,
        totalCritical: healthStats['critical'] || 0,
        totalNoMovement: healthStats['no movement'] || 0
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