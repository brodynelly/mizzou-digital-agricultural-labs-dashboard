const mongoose = require('mongoose');

/**
 * Set up periodic stats emission
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const setupStatsEmitter = (io) => {
  // Periodically emit stats
  setInterval(() => emitUpdatedStats(io), 5000);

  return emitUpdatedStats.bind(null, io);
};

/**
 * Calculate and emit updated stats to all connected clients
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const emitUpdatedStats = async (io) => {
  try {
    // Get all required models
    const Device = mongoose.model('Device');
    const PigBCS = mongoose.model('PigBCS');
    const PostureData = mongoose.model('PigPosture');
    const TemperatureData = mongoose.model('TemperatureData');
    const Pig = mongoose.model('Pig');
    const PigHealthStatus = mongoose.model('PigHealthStatus');
    const PigFertility = require('../models/PigFertility');
    const PigHeatStatus = mongoose.model('PigHeatStatus');
    const Barn = mongoose.model('Barn');
    const Stall = mongoose.model('Stall');

    // Get device stats
    const devices = await Device.find({});
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const totalDevices = devices.length;
    const deviceUsage = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

    // Get latest temperature readings
    const latestTemps = await TemperatureData.find({})
      .sort({ timestamp: -1 })
      .limit(devices.length);
    const avgTemp = latestTemps.length > 0
      ? latestTemps.reduce((acc, curr) => acc + curr.temperature, 0) / latestTemps.length
      : 0;

    // BCS distribution using PigBCS
    const bcsData = await PigBCS.find({}).sort({ timestamp: -1 });
    const avgBCS = bcsData.length > 0
      ? bcsData.reduce((acc, curr) => acc + curr.score, 0) / bcsData.length
      : 0;

    // Posture distribution
    const postureData = await PostureData.find({}).sort({ timestamp: -1 });
    const postureCounts = postureData.reduce((acc, curr) => {
      acc[curr.score] = (acc[curr.score] || 0) + 1;
      return acc;
    }, {});
    const totalPostures = postureData.length;
    const postureDistribution = Object.entries(postureCounts).map(([score, count]) => ({
      score: Number(score),
      count,
      percentage: totalPostures > 0 ? Math.round((count / totalPostures) * 100) : 0
    }));

    // Get all pigs
    const pigs = await Pig.find({})
      .populate('currentLocation.farmId')
      .populate('currentLocation.barnId')
      .populate('currentLocation.stallId')
      .populate('healthStatus')
      .sort({ lastUpdate: -1 });

    // Pig Health Status aggregation
    const pigHealthAggregated = await PigHealthStatus.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$pigId", status: { $first: "$status" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Initialize health stats with all possible statuses
    const pigHealthStats = {
      'at risk': 0,
      'healthy': 0,
      'critical': 0,
      'no movement': 0
    };

    // Update health stats from aggregation
    pigHealthAggregated.forEach(item => {
      if (pigHealthStats.hasOwnProperty(item._id)) {
        pigHealthStats[item._id] = item.count;
      }
    });

    // Pig Heat Status aggregation
    const pigHeatStatusAggregated = await PigHeatStatus.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$pigId", status: { $first: "$status" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Initialize heat stats with all possible statuses
    const pigHeatStats = {
      'open': 0,
      'bred': 0,
      'pregnant': 0,
      'farrowing': 0,
      'weaning': 0
    };

    // Update heat stats from aggregation
    pigHeatStatusAggregated.forEach(item => {
      if (pigHeatStats.hasOwnProperty(item._id)) {
        pigHeatStats[item._id] = item.count;
      }
    });

    // Pig Fertility aggregation
    const pigFertilityAggregated = await PigFertility.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$pigId", status: { $first: "$status" } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const fertilityStats = pigFertilityAggregated.reduce((acc, curr) => {
      const key = curr._id.toLowerCase().replace(/[\s-]+/g, '');
      acc[key] = curr.count;
      return acc;
    }, {});

    const barns = await Barn.find({});
    const stalls = await Stall.find({});

    // Barn Stats
    const barnStats = barns.reduce((acc, barn) => {
      const pigsInBarn = pigs.filter(p => p.currentLocation?.barnId?.toString() === barn._id.toString()).length;
      acc[barn.name] = pigsInBarn;
      return acc;
    }, {});

    // Stall Stats
    const stallStats = barns.reduce((barnAcc, barn) => {
      const stallsInBarn = stalls.filter(stall => stall.barnId?.toString() === barn._id.toString());
      const stallSummary = stallsInBarn.reduce((stallAcc, stall) => {
        const pigsInStall = pigs.filter(p => p.currentLocation?.stallId?.toString() === stall._id.toString()).length;
        stallAcc[stall.name] = pigsInStall;
        return stallAcc;
      }, {});
      barnAcc[barn.name] = stallSummary;
      return barnAcc;
    }, {});

    // Transform pigs for UI
    const transformedPigs = pigs.map(pig => ({
      owner: `PIG-${pig.pigId.toString().padStart(3, '0')}`,
      status: pig.healthStatus?.status || '------', // Use dashes instead of default 'healthy'
      costs: pig.age || '------', // Use dashes for missing age
      region: pig.currentLocation.stallId?.name
        ? `${pig.currentLocation.stallId.name}`
        : '------',
      stability: pig.stability || 0, // Use 0 for missing stability (will show as low risk)
      lastEdited: pig.updatedAt
        ? new Date(pig.updatedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        : new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
      breed: pig.breed || '------', // Use dashes for missing breed
      active: pig.active
    }));

    // Transform devices for UI
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
    }));

    // Emit aggregated stats
    io.emit('stats_update', {
      deviceStats: {
        onlineDevices,
        totalDevices,
        deviceUsage,
        averageTemperature: Number(avgTemp.toFixed(1))
      },
      bcsStats: {
        averageBCS: Number(avgBCS.toFixed(1))
      },
      postureDistribution,
      pigStats: {
        totalPigs: pigs.length,
      },
      pigHeatStats: {
        totalOpen: pigHeatStats['open'],
        totalBred: pigHeatStats['bred'],
        totalPregnant: pigHeatStats['pregnant'],
        totalFarrowing: pigHeatStats['farrowing'],
        totalWeaning: pigHeatStats['weaning']
      },
      barnStats,
      stallStats,
      pigHealthStats: {
        totalAtRisk: pigHealthStats['at risk'],
        totalHealthy: pigHealthStats['healthy'],
        totalCritical: pigHealthStats['critical'],
        totalNoMovement: pigHealthStats['no movement']
      },
      pigFertilityStats: {
        InHeat: fertilityStats['inheat'] || 0,
        PreHeat: fertilityStats['preheat'] || 0,
        Open: fertilityStats['open'] || 0,
        ReadyToBreed: fertilityStats['readytobreed'] || 0,
      }
    });

    // Emit lists for devices and pigs
    io.emit('devices_update', transformedDevices);
    io.emit('pigs_update', transformedPigs);

  } catch (error) {
    console.error('Error emitting updates:', error);
  }
};

module.exports = {
  setupStatsEmitter,
  emitUpdatedStats
};
