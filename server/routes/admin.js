const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');

const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// CSV helper — regenerates the CSV file from all students and teachers in the DB
const updateUsersCSV = async () => {
    try {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        // Save to the very top root directory as requested length unencrypted
        const csvPath = path.join(__dirname, '..', '..', 'users_credentials.csv');

        const csvWriter = createCsvWriter({
            path: csvPath,
            header: [
                { id: 'name', title: 'Name' },
                { id: 'email', title: 'Email' },
                { id: 'role', title: 'Role' },
                { id: 'status', title: 'Status' },
                { id: 'password', title: 'Password' },
                { id: 'createdAt', title: 'DateAdded' },
                { id: 'regNumber', title: 'Reg_Number' },
                { id: 'pythonMarks', title: 'Python_Marks' },
                { id: 'pythonAtt', title: 'Python_Attendance_%' },
                { id: 'dsMarks', title: 'Data_Structures_Marks' },
                { id: 'dsAtt', title: 'Data_Structures_Attendance_%' },
                { id: 'dbmsMarks', title: 'DBMS_Marks' },
                { id: 'dbmsAtt', title: 'DBMS_Attendance_%' },
                { id: 'webMarks', title: 'Web_Dev_Marks' },
                { id: 'webAtt', title: 'Web_Dev_Attendance_%' },
                { id: 'netMarks', title: 'Networks_Marks' },
                { id: 'netAtt', title: 'Networks_Attendance_%' }
            ]
        });

        // Get both students and teachers
        const users = await User.find({ role: { $in: ['student', 'teacher'] } }).select('name email role status plainPassword createdAt academicData regNumber +plainPassword');
        const records = users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            password: u.plainPassword || (u.role === 'teacher' ? 'TEACH' + Math.floor(Math.random()*100) : 'STUD' + Math.floor(Math.random()*100)),
            createdAt: u.createdAt ? u.createdAt.toISOString().split('T')[0] : '',
            regNumber: u.regNumber || '',
            pythonMarks: u.academicData?.python?.marks || 0,
            pythonAtt: u.academicData?.python?.attendance || 0,
            dsMarks: u.academicData?.dataStructures?.marks || 0,
            dsAtt: u.academicData?.dataStructures?.attendance || 0,
            dbmsMarks: u.academicData?.dbms?.marks || 0,
            dbmsAtt: u.academicData?.dbms?.attendance || 0,
            webMarks: u.academicData?.webDev?.marks || 0,
            webAtt: u.academicData?.webDev?.attendance || 0,
            netMarks: u.academicData?.networks?.marks || 0,
            netAtt: u.academicData?.networks?.attendance || 0
        }));

        await csvWriter.writeRecords(records);
        console.log('✅ users_credentials.csv updated at root');
    } catch (error) {
        console.error('CSV update error:', error);
    }
};

// Export will occur at the bottom

// POST /api/admin/login — Admin login with hardcoded credentials
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username === 'admin' && password === 'pass') {
            // Find admin user in DB
            let adminUser = await User.findOne({ role: 'admin' });
            if (!adminUser) {
                return res.status(500).json({ message: 'Admin user not found in database' });
            }

            const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                role: adminUser.role,
                token
            });
        }

        return res.status(401).json({ message: 'Invalid admin credentials' });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/students — List all students
router.get('/students', protect, authorize('admin'), async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        console.error('List students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/pending — List all pending signups
router.get('/pending', protect, authorize('admin'), async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        res.json(pendingUsers);
    } catch (error) {
        console.error('List pending users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/approve/:id — Approve a pending user
router.put('/approve/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.status !== 'pending') {
            return res.status(404).json({ message: 'Pending user not found' });
        }

        user.status = 'active';
        await user.save();
        await updateUsersCSV();

        res.json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/reject/:id — Reject a pending user
router.delete('/reject/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.status !== 'pending') {
            return res.status(404).json({ message: 'Pending user not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        await updateUsersCSV();

        res.json({ message: 'User rejected successfully' });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/students — Add a new student directly (active by default)
router.post('/students', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Auto-generate a password
        const plainPassword = Math.random().toString(36).slice(-8);

        const student = new User({
            name,
            email,
            password: plainPassword,
            role: 'student',
            status: 'active',
            plainPassword // Store plain password for CSV
        });

        await student.save();
        await updateUsersCSV();

        res.status(201).json({
            _id: student._id,
            name: student.name,
            email: student.email,
            role: student.role,
            status: student.status,
            generatedPassword: plainPassword,
            createdAt: student.createdAt
        });
    } catch (error) {
        console.error('Add student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/students/:id — Update a student
router.put('/students/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const student = await User.findById(req.params.id);

        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (name) student.name = name;
        if (email) student.email = email;

        await student.save();
        await updateUsersCSV();

        res.json({
            _id: student._id,
            name: student.name,
            email: student.email,
            role: student.role
        });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/students/:id — Remove a student
router.delete('/students/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const student = await User.findById(req.params.id);

        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        await updateUsersCSV();

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/students/csv — Download users CSV
router.get('/students/csv', protect, authorize('admin'), async (req, res) => {
    try {
        await updateUsersCSV(); // Ensure it's up to date

        const csvPath = path.join(__dirname, '..', '..', 'users_credentials.csv');
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({ message: 'CSV file not found' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users_credentials.csv"');
        res.sendFile(csvPath);
    } catch (error) {
        console.error('CSV download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/import — Bulk import from CSV/Excel
router.post('/import', protect, authorize('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const results = [];
        const filePath = req.file.path;
        const extension = path.extname(req.file.originalname).toLowerCase();

        if (extension === '.csv') {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => processImport(results, res, filePath));
        } else if (extension === '.xlsx' || extension === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            processImport(data, res, filePath);
        } else {
            fs.unlinkSync(filePath);
            res.status(400).json({ message: 'Unsupported file format' });
        }
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Server error during import' });
    }
});

const processImport = async (data, res, filePath) => {
    try {
        let imported = 0;
        let skipped = 0;

        for (const row of data) {
            const name = row.Name || row.name;
            const email = row.Email || row.email;
            const role = (row.Role || row.role || 'student').toLowerCase();
            const rawPassword = row.Password || row.password || Math.random().toString(36).slice(-8);

            if (!name || !email) {
                skipped++;
                continue;
            }

            const existing = await User.findOne({ email });
            if (existing) {
                skipped++;
                continue;
            }

            await User.create({
                name,
                email,
                password: rawPassword,
                role: role === 'teacher' ? 'teacher' : 'student',
                status: 'active',
                plainPassword: rawPassword
            });
            imported++;
        }

        fs.unlinkSync(filePath);
        await updateUsersCSV();
        res.json({ message: `Successfully imported ${imported} users. Skipped ${skipped} duplicates/invalid entries.` });
    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Error processing data' });
    }
};

// GET /api/admin/export/:type — Export users to CSV or Excel
router.get('/export/:type', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        const records = users.map(u => ({
            Name: u.name,
            Email: u.email,
            Role: u.role,
            Status: u.status,
            DateAdded: u.createdAt.toISOString().split('T')[0]
        }));

        const type = req.params.type.toLowerCase();

        if (type === 'csv') {
            const { parse } = require('json2csv');
            const csvData = parse(records);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
            return res.send(csvData);
        } else if (type === 'xlsx') {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(records);
            xlsx.utils.book_append_sheet(wb, ws, "Users");
            const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
            return res.send(buf);
        } else {
            res.status(400).json({ message: 'Invalid export type' });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error during export' });
    }
});

// GET /api/admin/export-user/:id/:type — Export single user to CSV or Excel
router.get('/export-user/:id/:type', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const record = {
            Name: user.name,
            Email: user.email,
            Role: user.role,
            Status: user.status,
            DateAdded: user.createdAt ? user.createdAt.toISOString().split('T')[0] : 'N/A'
        };

        const type = req.params.type.toLowerCase();

        if (type === 'csv') {
            const { parse } = require('json2csv');
            const csvData = parse([record]);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${user.name}_data.csv"`);
            return res.send(csvData);
        } else if (type === 'xlsx') {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet([record]);
            xlsx.utils.book_append_sheet(wb, ws, "UserData");
            const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${user.name}_data.xlsx"`);
            return res.send(buf);
        } else {
            res.status(400).json({ message: 'Invalid export type' });
        }
    } catch (error) {
        console.error('Single export error:', error);
        res.status(500).json({ message: 'Server error during export' });
    }
});

module.exports = router;
module.exports.updateUsersCSV = updateUsersCSV;
