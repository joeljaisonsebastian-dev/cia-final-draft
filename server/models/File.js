const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    storedName: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('File', fileSchema);
