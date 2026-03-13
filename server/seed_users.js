const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const dotenv = require('dotenv');
const User = require('./models/User');

const dns = require('dns');

// Fix DNS resolution for mongodb+srv:// on some networks
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        const csvPath = path.join(__dirname, '../users_credentials.csv');
        if (!fs.existsSync(csvPath)) {
            console.error('CSV file not found at:', csvPath);
            process.exit(1);
        }

        const users = [];
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (rawRow) => {
                const row = {};
                Object.keys(rawRow).forEach(k => {
                    row[k.trim()] = rawRow[k] ? rawRow[k].trim() : '';
                });

                if (row.Email && row.Password) {
                    users.push(row);
                }
            })
            .on('end', async () => {
                console.log(`Parsed ${users.length} users. Migrating data...`);
                
                // Optional: Clear existing students/teachers to prevent duplicates with old schema
                await User.deleteMany({ role: { $in: ['student', 'teacher'] } });
                console.log('Cleared existing student/teacher records.');

                const processedUsers = users.map(row => {
                    const mapped = {
                        name: row.Name,
                        email: row.Email,
                        role: row.Role ? row.Role.toLowerCase() : 'student',
                        status: row.Status && row.Status.toLowerCase() === 'active' ? 'active' : 'pending',
                        password: row.Password || 'pass123',
                        plainPassword: row.Password || 'pass123', // Store plain password for master CSV
                        regNumber: row.Reg_Number && row.Reg_Number.trim() !== '' ? row.Reg_Number.trim() : undefined,
                        academicData: {
                            python: { marks: Number(row['Python_Marks']) || 0, attendance: Number(row['Python_Attendance_%']) || 0 },
                            dataStructures: { marks: Number(row['Data_Structures_Marks']) || 0, attendance: Number(row['Data_Structures_Attendance_%']) || 0 },
                            dbms: { marks: Number(row['DBMS_Marks']) || 0, attendance: Number(row['DBMS_Attendance_%']) || 0 },
                            webDev: { marks: Number(row['Web_Dev_Marks']) || 0, attendance: Number(row['Web_Dev_Attendance_%']) || 0 },
                            networks: { marks: Number(row['Networks_Marks']) || 0, attendance: Number(row['Networks_Attendance_%']) || 0 }
                        }
                    };
                    if (mapped.role === 'teacher') {
                        console.log(`Seeding Teacher: ${mapped.email} with password: ${mapped.password}`);
                    }
                    return mapped;
                });

                let successCount = 0;
                let failCount = 0;

                for (const userData of processedUsers) {
                    try {
                        if (!userData.email) continue;
                        
                        await User.create(userData);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to create user ${userData.email}:`, err.message);
                        failCount++;
                    }
                }

                console.log(`Seed completed: ${successCount} added, ${failCount} failed.`);
                process.exit(0);
            });

    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedUsers();
