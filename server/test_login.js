const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '../.env') });

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const email = 'john1@gmail.com';
        const password = 'TEACH01';

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }

        console.log('User found:', user.email, 'Role:', user.role);
        
        const isMatch = await user.matchPassword(password);
        console.log('Password match:', isMatch);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testLogin();
