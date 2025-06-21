const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const RateLimit = require('express-rate-limit');  // Import the rate limit package
const { authenticateJWT } = require('../../middleware/authMiddleware');
const Pig = require('../../models/Pig');
const PigPosture = require('../../models/PostureData');

// Define a safe root directory for file uploads
const ROOT_UPLOAD_PATH = path.resolve('uploads/');

// Initialize multer to save files to the 'uploads/' directory
const upload = multer({ dest: ROOT_UPLOAD_PATH });

// Rate-limiting configuration
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply the rate limiter and authentication middleware to the upload route
router.post('/:pig_id', limiter, authenticateJWT, upload.single('file'), async (req, res) => {
  const { pig_id } = req.params;

  // Validate the pig_id
  if (!pig_id || isNaN(pig_id)) {
    return res.status(400).json({ error: 'Invalid pig_id. Must be a number.' });
  }

  // Get the uploaded file path
  const filePath = req.file.path;

  // Sanitize and validate the file path to ensure it's within the safe upload folder
  const normalizedFilePath = path.resolve(filePath);
  
  // Ensure the file path is inside the ROOT_UPLOAD_PATH
  if (!normalizedFilePath.startsWith(ROOT_UPLOAD_PATH)) {
    return res.status(400).json({ error: 'Invalid file path. Potential path traversal attempt detected.' });
  }

  try {
    // Find the pig based on pig_id
    const pig = await Pig.findOne({ pigId: Number(pig_id) });
    if (!pig) {
      return res.status(404).json({ error: 'Pig not found' });
    }

    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const row of results) {
          const { Timestamp, Posture } = row;

          try {
            // Parse the timestamp into a valid Date object
            const [year, month, day, hour, minute, second] = Timestamp.split('_');
            const timestamp = new Date(
              `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
            );

            // Validate the timestamp
            if (isNaN(timestamp.getTime())) {
              console.error('Invalid Timestamp:', Timestamp);
              continue; // Skip this row
            }

            // Convert the Date object to an ISO string for MongoDB
            const isoTimestamp = timestamp.toISOString();

            // Save the posture data
            const postureData = new PigPosture({
              pigId: pig._id,
              timestamp: isoTimestamp,
              score: Posture,
            });

            await postureData.save();
          } catch (error) {
            console.error('Error processing row:', row, error);
          }
        }

        // Clean up the uploaded file
        fs.unlinkSync(filePath);

        res.status(200).json({ message: 'Posture data uploaded successfully' });
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        res.status(500).json({ error: 'Failed to read CSV file' });
      });
  } catch (error) {
    console.error('Error uploading posture data:', error);
    res.status(500).json({ error: 'Failed to upload posture data' });
  }
});

module.exports = router;
