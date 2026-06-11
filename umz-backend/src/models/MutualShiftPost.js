import mongoose from 'mongoose';

const mutualShiftPostSchema = new mongoose.Schema(
    {
        // Auto-filled from UMS hostel info
        vid: {
            type: String,
            required: true,
            unique: true,     // one post per student
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        currentHostel: {
            type: String,
            required: true,
            trim: true,
        },
        currentRoom: {
            type: String,
            required: true,
            trim: true,
        },

        // Filled by student
        desiredHostel: {
            type: String,
            required: true,
            trim: true,
        },
        desiredFloor: {
            type: String,
            default: '',
            trim: true,
        },
        desiredRoom: {
            type: String,
            default: '',
            trim: true,
        },

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Compound index for listing active posts efficiently
mutualShiftPostSchema.index({ isActive: 1, createdAt: -1 });

const MutualShiftPost =
    mongoose.models.MutualShiftPost ||
    mongoose.model('MutualShiftPost', mutualShiftPostSchema);

export default MutualShiftPost;
