const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '../.env') });

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const isabella = await User.findOne({ email: 'isabella8@gmail.com' });
        if (isabella) {
            console.log('Isabella Found:', isabella.name);
            console.log('AcademicData:', JSON.stringify(isabella.academicData, null, 2));
        } else {
            console.log('Isabella not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkData();
