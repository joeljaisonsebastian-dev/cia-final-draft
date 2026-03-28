const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Fix DNS resolution for mongodb+srv:// on some networks
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/user', require('./routes/user'));

// Serve static files from the Vite build directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Handle client-side routing - redirect all non-API requests to index.html
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cia-portal';

console.log('🔗 Connecting to MongoDB...');
console.log('   URI:', MONGO_URI ? MONGO_URI.replace(/\/\/.*@/, '//<credentials>@') : 'UNDEFINED');

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Seed admin user if not exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            await User.create({
                name: 'Admin',
                email: 'admin@cia-portal.com',
                password: 'pass',
                role: 'admin',
                status: 'active',
                plainPassword: 'pass'
            });
            console.log('✅ Admin user seeded (username: admin, password: pass)');
        }

        // Auto-generate CSV on startup ONLY if we have users in DB
        // This prevents wiping a populated CSV on a fresh deployment with an empty DB
        const userCount = await User.countDocuments({ role: { $ne: 'admin' } });
        if (userCount > 0) {
            const { updateUsersCSV } = require('./routes/admin');
            await updateUsersCSV();
            console.log('✅ CSV synced with database');
        } else {
            console.log('⚠️ Database is empty, skipping CSV sync to prevent overwriting local data. Run seed_users.js if needed.');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Server error:', err.stack || err);
        process.exit(1);
    });

module.exports = app;
