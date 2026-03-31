const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

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

// POST /api/admin/login — Admin login (supports multiple admins)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check for "root" admin first (legacy/fallback)
        if (username === 'admin' && password === 'pass') {
            const rootAdmin = await User.findOne({ role: 'admin' });
            if (rootAdmin) {
                const token = jwt.sign({ id: rootAdmin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return res.json({
                    _id: rootAdmin._id,
                    name: rootAdmin.name,
                    email: rootAdmin.email,
                    role: rootAdmin.role,
                    token
                });
            }
        }

        // Search for any admin in DB by username or email
        const adminUser = await User.findOne({
            $or: [{ username: username }, { email: username }],
            role: 'admin'
        });

        if (adminUser && (await adminUser.matchPassword(password))) {
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

// GET /api/admin/teachers — List all teachers
router.get('/teachers', protect, authorize('admin'), async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('-password');
        res.json(teachers);
    } catch (error) {
        console.error('List teachers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/teachers — Add a new teacher directly
router.post('/teachers', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User with this email already exists' });

        const plainPassword = Math.random().toString(36).slice(-8);
        const teacher = new User({
            name, email, password: plainPassword,
            role: 'teacher', status: 'active', plainPassword
        });
        await teacher.save();
        await updateUsersCSV();

        res.status(201).json({
            _id: teacher._id, name: teacher.name, email: teacher.email,
            role: teacher.role, status: teacher.status,
            generatedPassword: plainPassword, createdAt: teacher.createdAt
        });
    } catch (error) {
        console.error('Add teacher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/teachers/:id — Delete a teacher
router.delete('/teachers/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ message: 'Teacher not found' });
        await User.findByIdAndDelete(req.params.id);
        await updateUsersCSV();
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/teachers/:id — Update teacher info
router.put('/teachers/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const teacher = await User.findById(req.params.id);
        if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ message: 'Teacher not found' });
        if (name) teacher.name = name;
        if (email) teacher.email = email;
        await teacher.save();
        await updateUsersCSV();
        res.json({ _id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role });
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/pending-changes — List all pending profile change requests
router.get('/pending-changes', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({
            $or: [
                { 'pendingChanges.name': { $exists: true, $ne: null } },
                { 'pendingChanges.password': { $exists: true, $ne: null } }
            ]
        }).select('name email role pendingChanges createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/approve-change/:id/:field — Approve a name or password change
router.put('/approve-change/:id/:field', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { field } = req.params;

        if (field === 'name' && user.pendingChanges && user.pendingChanges.name) {
            user.name = user.pendingChanges.name;
            user.pendingChanges.name = undefined;
            await user.save();
            // Notify user
            await Notification.create({
                user: user._id,
                title: 'Name Change Approved',
                message: `Your name has been updated to "${user.name}".`,
                type: 'system'
            });
            await updateUsersCSV();
            return res.json({ message: 'Name change approved' });
        }

        if (field === 'password' && user.pendingChanges && user.pendingChanges.password) {
            const plain = user.pendingChanges.password;
            user.password = plain; // pre-save hook will hash it
            user.plainPassword = plain;
            user.pendingChanges.password = undefined;
            await user.save();
            // Notify user
            await Notification.create({
                user: user._id,
                title: 'Password Change Approved',
                message: 'Your password has been updated successfully.',
                type: 'system'
            });
            await updateUsersCSV();
            return res.json({ message: 'Password change approved' });
        }

        return res.status(400).json({ message: 'No pending change for this field' });
    } catch (error) {
        console.error('Approve change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/reject-change/:id/:field — Reject a name or password change
router.put('/reject-change/:id/:field', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { field } = req.params;
        if (user.pendingChanges) {
            user.pendingChanges[field] = undefined;
            await user.save();
        }
        await Notification.create({
            user: user._id,
            title: `${field.charAt(0).toUpperCase() + field.slice(1)} Change Rejected`,
            message: `Your ${field} change request has been rejected by the admin.`,
            type: 'system'
        });
        res.json({ message: `${field} change rejected` });
    } catch (error) {
        console.error('Reject change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── Assessment Requests ────────────────────────────────────────────────────

const AssessmentRequest = require('../models/AssessmentRequest');
const Assessment = require('../models/Assessment');

// GET /api/admin/assessment-requests — List all student requests
router.get('/assessment-requests', protect, authorize('admin'), async (req, res) => {
    try {
        const requests = await AssessmentRequest.find()
            .populate('student', 'name email')
            .populate('assessment', 'title course')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/assessment-requests/:id/approve — Approve a request
router.put('/assessment-requests/:id/approve', protect, authorize('admin'), async (req, res) => {
    try {
        const request = await AssessmentRequest.findById(req.params.id)
            .populate('student', 'name')
            .populate('assessment', 'title');
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'approved';
        request.adminNote = req.body.adminNote || 'Request approved by admin.';
        request.resolvedAt = new Date();
        await request.save();

        // If re-attempt: remove student's existing submission so they can retake
        if (request.type === 're-attempt') {
            await Assessment.findByIdAndUpdate(request.assessment._id, {
                $pull: { submissions: { student: request.student._id } }
            });
        }

        // Notify the student
        await Notification.create({
            user: request.student._id,
            title: request.type === 're-attempt' ? '✅ Re-Attempt Approved' : '✅ Re-Evaluation Approved',
            message: `Your ${request.type} request for "${request.assessment.title}" has been approved. ${request.adminNote}`,
            type: 'system'
        });

        res.json({ message: 'Request approved', request });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/assessment-requests/:id/reject — Reject a request
router.put('/assessment-requests/:id/reject', protect, authorize('admin'), async (req, res) => {
    try {
        const request = await AssessmentRequest.findById(req.params.id)
            .populate('student', 'name')
            .populate('assessment', 'title');
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'rejected';
        request.adminNote = req.body.adminNote || 'Request was not approved.';
        request.resolvedAt = new Date();
        await request.save();

        // Notify the student
        await Notification.create({
            user: request.student._id,
            title: `❌ ${request.type === 're-attempt' ? 'Re-Attempt' : 'Re-Evaluation'} Rejected`,
            message: `Your ${request.type} request for "${request.assessment.title}" was not approved. ${request.adminNote}`,
            type: 'system'
        });

        res.json({ message: 'Request rejected', request });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── Admin Management ───────────────────────────────────────────────────────

// GET /api/admin/admins — List all admins
router.get('/admins', protect, authorize('admin'), async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('-password');
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/admins — Create a new admin
router.post('/admins', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, email, username, password } = req.body;

        if (!name || !email || !username || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Admin with this email or username already exists' });
        }

        const admin = new User({
            name,
            email,
            username,
            password,
            role: 'admin',
            status: 'active'
        });

        await admin.save();
        res.status(201).json({ message: 'Admin created successfully', admin: { _id: admin._id, name, email, username } });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/admins/:id — Remove an admin
router.delete('/admins/:id', protect, authorize('admin'), async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own admin account' });
        }

        const admin = await User.findById(req.params.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
module.exports.updateUsersCSV = updateUsersCSV;

