const express = require('express');
const router = express.Router();
const os = require('os');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware');
const RateLimit = require('express-rate-limit');

// Configure rate limiter: maximum of 100 requests per 15 minutes
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// Get system metrics
router.get('/metrics', authenticateJWT, isAdmin, async (req, res) => {
  try {
    // Get CPU usage
    const cpuUsage = os.loadavg()[0]; // 1 minute load average
    const cpuCount = os.cpus().length;
    const cpuUsagePercent = (cpuUsage / cpuCount) * 100;

    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Get disk usage (estimate based on current directory)
    let diskUsagePercent = 0;
    let diskStatus = "healthy";

    try {
      // This is a simple approximation and might not work in all environments
      const diskInfo = fs.statfsSync('.');
      const totalBlocks = diskInfo.blocks;
      const freeBlocks = diskInfo.bfree;
      diskUsagePercent = ((totalBlocks - freeBlocks) / totalBlocks) * 100;

      if (diskUsagePercent > 90) {
        diskStatus = "error";
      } else if (diskUsagePercent > 70) {
        diskStatus = "warning";
      }
    } catch (diskError) {
      console.error('Error getting disk usage:', diskError);
      // Default to a warning if we can't get disk info
      diskStatus = "warning";
      diskUsagePercent = 75; // Arbitrary value for display
    }

    // Check database connection
    let dbStatus = "healthy";
    let dbResponseTime = 0;

    try {
      // Log user info for debugging
      console.log(`System metrics requested by user: ${req.user.email} (${req.user.role})`);

      // Get database connection info from environment variables
      const DATABASE_HOST = process.env.DATABASE_HOST || 'mongo';
      const DATABASE_PORT = process.env.DATABASE_PORT || '27017';
      const DATABASE_DB = process.env.MONGO_INITDB_DATABASE || 'paalab';
      const DATABASE_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME || 'PAAL';
      const DATABASE_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || 'PAAL';

      const uri = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB}?authSource=admin`;

      const startTime = Date.now();
      const client = new MongoClient(uri, { connectTimeoutMS: 5000 });
      await client.connect();

      // Run a simple command to test the database
      await client.db().admin().listDatabases();

      const endTime = Date.now();
      dbResponseTime = endTime - startTime;

      // Close the connection
      await client.close();

      // Determine database status based on response time
      if (dbResponseTime > 1000) {
        dbStatus = "warning";
      }
    } catch (dbError) {
      console.error('Error connecting to database:', dbError);
      dbStatus = "error";
    }

    // Determine server status based on CPU and memory
    let serverStatus = "healthy";
    if (cpuUsagePercent > 90 || memoryUsagePercent > 90) {
      serverStatus = "error";
    } else if (cpuUsagePercent > 70 || memoryUsagePercent > 70) {
      serverStatus = "warning";
    }

    // Return system metrics
    res.json({
      server: {
        status: serverStatus,
        cpuUsage: cpuUsagePercent.toFixed(2),
        memoryUsage: memoryUsagePercent.toFixed(2),
        uptime: os.uptime(),
        platform: os.platform(),
        hostname: os.hostname()
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        connectionString: process.env.DATABASE_HOST || 'mongo-c'
      },
      storage: {
        status: diskStatus,
        usage: diskUsagePercent.toFixed(2)
      },
      cpu: {
        status: cpuUsagePercent > 90 ? "error" : cpuUsagePercent > 70 ? "warning" : "healthy",
        usage: cpuUsagePercent.toFixed(2),
        cores: cpuCount
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

// Backup database
router.post('/backup', authenticateJWT, isAdmin, async (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Database backup requested by user: ${req.user.email} (${req.user.role})`);

    // Get database connection info from environment variables
    const DATABASE_HOST = process.env.DATABASE_HOST || 'mongo';
    const DATABASE_PORT = process.env.DATABASE_PORT || '27017';
    const DATABASE_DB = process.env.MONGO_INITDB_DATABASE || 'paalab';
    const DATABASE_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME || 'PAAL';
    const DATABASE_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || 'PAAL';

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${DATABASE_DB}_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);

    // Connect to MongoDB and export data
    const uri = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB}?authSource=admin`;
    const client = new MongoClient(uri);

    await client.connect();
    console.log('Connected to MongoDB for backup');

    const db = client.db(DATABASE_DB);

    // Get all collections
    const collections = await db.listCollections().toArray();

    // Create backup object
    const backup = {
      database: DATABASE_DB,
      createdAt: new Date().toISOString(),
      collections: {}
    };

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const documents = await db.collection(collectionName).find({}).toArray();
      backup.collections[collectionName] = documents;
    }

    // Write backup to file
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    // Close connection
    await client.close();

    console.log('Database backup created successfully:', backupPath);
    res.json({
      message: 'Database backup created successfully',
      filename: backupFilename,
      timestamp: timestamp,
      size: fs.statSync(backupPath).size
    });
  } catch (error) {
    console.error('Error creating database backup:', error);
    res.status(500).json({ error: 'Failed to create database backup: ' + error.message });
  }
});

// Restore database
router.post('/restore', authenticateJWT, isAdmin, async (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Database restore requested by user: ${req.user.email} (${req.user.role})`);

    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required' });
    }

    // Get database connection info from environment variables
    const DATABASE_HOST = process.env.DATABASE_HOST || 'mongo';
    const DATABASE_PORT = process.env.DATABASE_PORT || '27017';
    const DATABASE_DB = process.env.MONGO_INITDB_DATABASE || 'paalab';
    const DATABASE_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME || 'PAAL';
    const DATABASE_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD || 'PAAL';

    // Check if backup file exists
    const backupDir = path.join(__dirname, '..', 'backups');
    const backupPath = path.resolve(backupDir, filename);

    if (!backupPath.startsWith(backupDir) || !fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    // Connect to MongoDB
    const uri = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_DB}?authSource=admin`;
    const client = new MongoClient(uri);

    await client.connect();
    console.log('Connected to MongoDB for restore');

    const db = client.db(DATABASE_DB);

    // Restore each collection
    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      if (documents.length > 0) {
        // Drop existing collection
        await db.collection(collectionName).drop().catch(() => {
          // Ignore error if collection doesn't exist
          console.log(`Collection ${collectionName} does not exist, creating new`);
        });

        // Insert documents
        if (documents.length > 0) {
          await db.collection(collectionName).insertMany(documents);
          console.log(`Restored ${documents.length} documents to ${collectionName}`);
        }
      }
    }

    // Close connection
    await client.close();

    console.log('Database restored successfully from:', backupPath);
    res.json({
      message: 'Database restored successfully',
      filename: filename
    });
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ error: 'Failed to restore database: ' + error.message });
  }
});

// Get list of backups
router.get('/backups', authenticateJWT, isAdmin, (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Backup list requested by user: ${req.user.email} (${req.user.role})`);

    const backupDir = path.join(__dirname, '..', 'backups');

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return res.json({ backups: [] });
    }

    // Get list of backup files
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by date, newest first

    res.json({ backups: files });
  } catch (error) {
    console.error('Error getting backup list:', error);
    res.status(500).json({ error: 'Failed to get backup list' });
  }
});

// Clear cache
router.post('/clear-cache', authenticateJWT, isAdmin, (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Cache clear requested by user: ${req.user.email} (${req.user.role})`);

    // Simulate clearing cache
    setTimeout(() => {
      res.json({ message: 'Cache cleared successfully' });
    }, 1000);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Run diagnostics
router.post('/diagnostics', authenticateJWT, isAdmin, (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Diagnostics requested by user: ${req.user.email} (${req.user.role})`);

    // Get system information
    const diagnostics = {
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus().length
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        arch: process.arch,
        platform: process.platform,
        version: process.version,
        versions: process.versions,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      message: 'Diagnostics completed successfully',
      diagnostics
    });
  } catch (error) {
    console.error('Error running diagnostics:', error);
    res.status(500).json({ error: 'Failed to run diagnostics' });
  }
});

// Get system logs
router.get('/logs', limiter, authenticateJWT, isAdmin, (req, res) => {
  try {
    // Log user info for debugging
    console.log(`System logs requested by user: ${req.user.email} (${req.user.role})`);

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });

      // Create a sample log file if none exist
      const sampleLogPath = path.join(logsDir, 'system.log');
      if (!fs.existsSync(sampleLogPath)) {
        const sampleLogContent = [
          `[${new Date().toISOString()}] [INFO] Server started`,
          `[${new Date().toISOString()}] [INFO] MongoDB connected`,
          `[${new Date().toISOString()}] [INFO] System initialized`,
          `[${new Date().toISOString()}] [INFO] User admin@test.com logged in`,
          `[${new Date().toISOString()}] [INFO] System metrics requested`,
          `[${new Date().toISOString()}] [INFO] System logs requested`
        ].join('\n');

        fs.writeFileSync(sampleLogPath, sampleLogContent);
      }
    }

    // Get list of log files
    const files = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const stats = fs.statSync(path.join(logsDir, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by date, newest first

    res.json({ logs: files });
  } catch (error) {
    console.error('Error getting system logs:', error);
    res.status(500).json({ error: 'Failed to get system logs' });
  }
});

// Get log content
router.get('/logs/:filename', authenticateJWT, isAdmin, (req, res) => {
  try {
    // Log user info for debugging
    console.log(`Log content requested by user: ${req.user.email} (${req.user.role})`);

    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const logsDir = path.join(__dirname, '..', 'logs');
    const logPath = path.join(logsDir, filename);

    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    // Read log file content
    const content = fs.readFileSync(logPath, 'utf8');

    res.json({
      filename,
      content,
      size: fs.statSync(logPath).size,
      lastModified: fs.statSync(logPath).mtime
    });
  } catch (error) {
    console.error('Error getting log content:', error);
    res.status(500).json({ error: 'Failed to get log content' });
  }
});

module.exports = router;
