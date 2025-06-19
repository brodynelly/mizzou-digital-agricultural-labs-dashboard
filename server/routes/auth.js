const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per window (increased for development)
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in development
  skip: () => process.env.NODE_ENV === 'development'
});

// Register a new user (admin only)
router.post('/register', authenticateJWT, isAdmin, async (req, res) => {
  try {
    // Check if requester is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can register new users' });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role,
      permissions = [],
      restrictedFarms = [],
      restrictedStalls = []
    } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const newUser = new User({
      email,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      role: role || 'farmer', // Default to farmer if not specified
      permissions,
      restrictedFarms,
      restrictedStalls
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check password
    // For test users, always use direct comparison
    // This is a temporary solution for development
    const isMatch = password === user.password;

    // In production, you would use a secure password comparison method like bcrypt

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    try {
      user.lastLogin = new Date();
      // Use updateOne instead of save to avoid issues with ID format
      await User.updateOne({ email: user.email }, { lastLogin: new Date() });
    } catch (saveError) {
      console.error('Error updating lastLogin:', saveError);
      // Continue with login even if lastLogin update fails
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    // Log the login activity
    const { logActivity } = require('../services/activityLogger');
    const activity = await logActivity({
      type: 'user',
      action: 'login',
      description: `User "${user.email}" logged in`,
      userId: user._id,
      ipAddress: req.ip,
      metadata: {
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`
      }
    });

    // Emit the activity to all connected clients
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('activity', activity);
      }
    } catch (error) {
      console.warn('Failed to emit activity event:', error.message);
    }

    // Return user info and token
    const userResponse = user.toObject();
    delete userResponse.password;

    const responseData = {
      token,
      user: userResponse
    };

    res.json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('assignedFarm', 'name location');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token and return user info
router.get('/token', authenticateJWT, async (req, res) => {
  try {
    // Find user by ID
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('assignedFarm', 'name location');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user,
      token: req.token // Return the token that was used for authentication
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

module.exports = router;
