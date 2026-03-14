const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// @desc    Request change name
// @route   PUT /api/user/request-name
// @access  Private
router.put('/request-name', protect, async (req, res) => {
    try {
        const { newName } = req.body;
        if (!newName) return res.status(400).json({ message: 'Name is required' });

        const user = await User.findById(req.user.id);
        user.pendingChanges.name = newName;
        await user.save();

        res.json({ message: 'Name change request submitted for admin approval' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Request change password
// @route   PUT /api/user/request-password
// @access  Private
router.put('/request-password', protect, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ message: 'Password must be at least 4 characters' });
        }

        const user = await User.findById(req.user.id);
        user.pendingChanges.password = newPassword; // We store it plain temporarily for admin to "see" or just hash it if needed, but the user requested "approved by admin". 
        // Usually, admin doesn't see passwords, but here the requirement is "approved by admin".
        await user.save();

        res.json({ message: 'Password change request submitted for admin approval' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Update theme
// @route   PUT /api/user/theme
// @access  Private
router.put('/theme', protect, async (req, res) => {
    try {
        const { theme } = req.body;
        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ message: 'Invalid theme' });
        }

        const user = await User.findById(req.user.id);
        user.theme = theme;
        await user.save();

        res.json({ message: 'Theme updated', theme: user.theme });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Get user notifications
// @route   GET /api/user/notifications
// @access  Private
router.get('/notifications', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc    Mark notification as read
// @route   PUT /api/user/notifications/:id/read
// @access  Private
router.put('/notifications/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        if (notification.user.toString() !== req.user.id) return res.status(401).json({ message: 'Unauthorized' });

        notification.isRead = true;
        await notification.save();

        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
