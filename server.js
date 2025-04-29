require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Hardcode the MongoDB URI temporarily to test
const mongoURI = 'mongodb+srv://Zacc1985:N2xGDPj86OwM4Qhv@zacc1985.7r3d2xj.mongodb.net/?retryWrites=true&w=majority';

console.log('About to connect to MongoDB...');
mongoose.connect(mongoURI)
    .then(() => {
        console.log('Successfully connected to MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
    });

app.get('/api/budget', (req, res) => {
    res.json({
        income: 5000,
        needs: 2500,
        wants: 1500,
        savings: 1000,
        penfedSavings: 500,
        expenses: []
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});