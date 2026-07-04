import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
    regno: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    cookies: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp on every save
userSessionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const UserSession = mongoose.model('UserSession', userSessionSchema);

export default UserSession;
