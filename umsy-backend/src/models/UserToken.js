import mongoose from 'mongoose';

const UserTokenSchema = new mongoose.Schema({
    regno: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: false
    },
    dob: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    }
}, { timestamps: true });

const UserToken = mongoose.model('UserToken', UserTokenSchema);

export default UserToken;
