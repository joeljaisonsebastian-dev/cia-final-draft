const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// POST /api/files/upload — Teacher uploads a file
router.post('/upload', protect, authorize('teacher'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileDoc = await File.create({
            originalName: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedBy: req.user._id
        });

        res.status(201).json(fileDoc);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

// GET /api/files — List all uploaded files
router.get('/', protect, authorize('teacher', 'student'), async (req, res) => {
    try {
        const files = await File.find()
            .populate('uploadedBy', 'name email')
            .sort({ uploadedAt: -1 });
        res.json(files);
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ message: 'Server error fetching files' });
    }
});

// GET /api/files/download/:id — Download a file
router.get('/download/:id', protect, authorize('teacher', 'student'), async (req, res) => {
    try {
        const fileDoc = await File.findById(req.params.id);
        if (!fileDoc) {
            return res.status(404).json({ message: 'File not found' });
        }

        const filePath = path.join(uploadsDir, fileDoc.storedName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on disk' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.originalName}"`);
        res.setHeader('Content-Type', fileDoc.mimetype);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error during download' });
    }
});

// DELETE /api/files/:id — Teacher deletes a file
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
    try {
        const fileDoc = await File.findById(req.params.id);
        if (!fileDoc) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete from disk
        const filePath = path.join(uploadsDir, fileDoc.storedName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await File.findByIdAndDelete(req.params.id);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Server error during delete' });
    }
});

module.exports = router;
