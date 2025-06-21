const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farm = require('../models/Farm');
const mongoose = require('mongoose');
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (error) {
  console.error('bcryptjs not available, using fallback password handling');
  bcrypt = {
    genSalt: async () => 'salt',
    hash: async (password) => password,
  };
}
const rateLimit = require('express-rate-limit');

// Auth middleware
const { authenticateJWT, isAdmin } = require('../middleware/authMiddleware');

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiter to all routes
router.use(limiter);

// Get all users (admin only)
router.get('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-__v')
      .populate('assignedFarm', 'name location')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('assignedFarm', 'name location');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// Get single user by ID (admin only)
router.get('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-__v')
      .populate('assignedFarm', 'name location');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, assignedFarm } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Validate farm ID if provided
    if (assignedFarm) {
      if (!mongoose.Types.ObjectId.isValid(assignedFarm)) {
        return res.status(400).json({ error: 'Invalid farm ID' });
      }

      const farm = await Farm.findById(assignedFarm);
      if (!farm) {
        return res.status(404).json({ error: 'Farm not found' });
      }
    }

    const newUser = await User.create({
      email,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      role: role || 'farmer',
      assignedFarm: assignedFarm || null
    });

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only, or user updating their own profile)
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, assignedFarm, isActive, password, permissions } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admins can update role, assignedFarm, isActive, and permissions
    if ((role || assignedFarm !== undefined || isActive !== undefined || permissions) &&
      (req.user.role !== 'admin' && req.user.role !== 'Administrator')) {
      return res.status(403).json({ error: 'Unauthorized to update these fields' });
    }

    // Users can only update their own profile unless they're an admin
    if (user._id.toString() !== req.user.id &&
      (req.user.role !== 'admin' && req.user.role !== 'Administrator')) {
      return res.status(403).json({ error: 'Unauthorized to update this user' });
    }

    // Validate farm ID if provided
    if (assignedFarm) {
      if (!mongoose.Types.ObjectId.isValid(assignedFarm)) {
        return res.status(400).json({ error: 'Invalid farm ID' });
      }

      const farm = await Farm.findById(assignedFarm);
      if (!farm) {
        return res.status(404).json({ error: 'Farm not found' });
      }
    }

    // Update user
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (password) {
      try {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      } catch (hashError) {
        console.error('Error hashing password:', hashError);
        return res.status(500).json({ error: 'Failed to hash password' });
      }
    }

    const isUserAdmin = (req.user.role === 'admin' || req.user.role === 'Administrator');

    if (role && isUserAdmin) updateData.role = role;
    if (assignedFarm !== undefined && isUserAdmin) {
      updateData.assignedFarm = assignedFarm || null;
    }
    if (isActive !== undefined && isUserAdmin) {
      updateData.isActive = isActive;
    }
    if (permissions && isUserAdmin) {
      updateData.permissions = permissions;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('assignedFarm', 'name location');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user permissions (admin only)
router.put('/:id/permissions', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // Only admins can update permissions
    if (req.user.role !== 'admin' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Unauthorized to update permissions' });
    }

    // Validate permissions
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update permissions
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { permissions },
      { new: true, runValidators: true }
    ).select('-password').populate('assignedFarm', 'name location');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

// Update user restrictions (admin only)
router.put('/:id/restrictions', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { restrictedFarms = [], restrictedStalls = [] } = req.body;

    // Only admins can update restrictions
    if (req.user.role !== 'admin' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Unauthorized to update restrictions' });
    }

    // Validate arrays
    if (!Array.isArray(restrictedFarms) || !Array.isArray(restrictedStalls)) {
      return res.status(400).json({ error: 'Restricted farms and stalls must be arrays' });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate farm IDs
    if (restrictedFarms.length > 0) {
      for (const farmId of restrictedFarms) {
        if (!mongoose.Types.ObjectId.isValid(farmId)) {
          return res.status(400).json({ error: `Invalid farm ID: ${farmId}` });
        }

        const farm = await Farm.findById(farmId);
        if (!farm) {
          return res.status(404).json({ error: `Farm not found: ${farmId}` });
        }
      }
    }

    // Update restrictions
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        restrictedFarms,
        restrictedStalls
      },
      { new: true, runValidators: true }
    ).select('-password').populate('assignedFarm', 'name location');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user restrictions:', error);
    res.status(500).json({ error: 'Failed to update user restrictions' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
