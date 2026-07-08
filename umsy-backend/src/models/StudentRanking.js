import mongoose from 'mongoose';

const studentRankingSchema = new mongoose.Schema({
    Name: { type: String, default: 'N/A' },
    RegistrationNumber: { type: String, required: true, unique: true, index: true },
    Course: { type: String, default: 'N/A' },
    CGPA: { type: String, default: '0.00' },
    reappearBacklog: { type: String, default: '0' },
    status: { type: String, default: 'Active' },
    BatchYear: { type: String, default: '—' },
    scrapedAt: { type: String, default: '' },
    companySelectedIn: { type: String, default: 'Not Selected' },
    placementId: { type: String, default: '—' },
    opportunityStartDate: { type: String, default: '—' },
    pepFeeDetails: { type: String, default: '—' },
    pepFeePaymentDate: { type: String, default: '—' },
    xMarks: { type: String, default: 'N/A' },
    xiiMarks: { type: String, default: 'N/A' },
    graduationMarks: { type: String, default: 'N/A' },
    diplomaMarks: { type: String, default: 'N/A' },
    email: { type: String, default: '' },
    contactNo: { type: String, default: '' },
    basicDetails: { type: String, default: '' },
    Rank: { type: Number, default: 0 },
    TotalStudents: { type: Number, default: 0 },
    percentile: { type: String, default: '' }
});

const StudentRanking = mongoose.model('StudentRanking', studentRankingSchema);

export default StudentRanking;
