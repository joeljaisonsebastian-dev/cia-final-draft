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

// Connect to MongoDB with retry logic
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ FATAL: MONGO_URI environment variable is not set.');
    console.error('   → Set it in your .env file (local) or in the Render dashboard (production).');
    process.exit(1);
}

console.log('🔗 Connecting to MongoDB...');
console.log('   URI:', MONGO_URI.replace(/\/\/.*@/, '//<credentials>@'));

const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
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
                console.log('✅ Admin user seeded');
            }

            // Auto-generate CSV on startup ONLY if we have users in DB
            const userCount = await User.countDocuments({ role: { $ne: 'admin' } });
            if (userCount > 0) {
                const { updateUsersCSV } = require('./routes/admin');
                await updateUsersCSV();
                console.log('✅ CSV synced with database');
            } else {
                console.log('⚠️ Database empty — skipping CSV sync. Run seed_users.js if needed.');
            }

            app.listen(PORT, () => {
                console.log(`🚀 Server running on port ${PORT}`);
            });

            return; // success — exit retry loop
        } catch (err) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
            if (attempt < retries) {
                console.log(`   ⏳ Retrying in ${delay / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                console.error('❌ All connection attempts failed. Exiting.');
                process.exit(1);
            }
        }
    }
};

connectWithRetry();

module.exports = app;
