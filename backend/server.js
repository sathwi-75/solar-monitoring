const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialize data files if they don't exist
const dataFiles = [
    { name: 'plants.json', initialData: [] },
    { name: 'monitoringData.json', initialData: {} },
    { name: 'alerts.json', initialData: [] },
    { name: 'maintenance.json', initialData: {} }
];

dataFiles.forEach(file => {
    const filePath = path.join(dataDir, file.name);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(file.initialData));
    }
});

// Helper functions to read and write data
const readData = (filename) => {
    const data = fs.readFileSync(path.join(dataDir, filename));
    return JSON.parse(data);
};

const writeData = (filename, data) => {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Plant Routes
app.get('/api/plants', (req, res) => {
    let plants = readData('plants.json');
    if (plants.length === 0) {
        // Create a default plant if none exists
        const defaultPlant = {
            id: 'plant1',
            name: 'Plant 1',
            location: 'Chennai, India',
            capacity: 500,
            inverters: 3,
            latitude: '13.0827',
            longitude: '80.2707'
        };
        plants.push(defaultPlant);
        writeData('plants.json', plants);
    }
    res.json(plants);
});

app.post('/api/plants', (req, res) => {
    const plants = readData('plants.json');
    const newPlant = { ...req.body, id: Date.now().toString() };
    plants.push(newPlant);
    writeData('plants.json', plants);
    res.status(201).json(newPlant);
});

app.put('/api/plants/:id', (req, res) => {
    const plants = readData('plants.json');
    const index = plants.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        plants[index] = { ...plants[index], ...req.body };
        writeData('plants.json', plants);
        res.json(plants[index]);
    } else {
        res.status(404).json({ message: 'Plant not found' });
    }
});

app.delete('/api/plants/:id', (req, res) => {
    let plants = readData('plants.json');
    const newPlants = plants.filter(p => p.id !== req.params.id);
    if (newPlants.length < plants.length) {
        writeData('plants.json', newPlants);
        res.json({ message: 'Plant deleted' });
    } else {
        res.status(404).json({ message: 'Plant not found' });
    }
});

// Monitoring Data Routes
app.get('/api/live-data/:plantId', (req, res) => {
    const plants = readData('plants.json');
    const plant = plants.find(p => p.id === req.params.plantId);
    if (!plant) {
        return res.status(404).json({ message: 'Plant not found' });
    }

    const basePower = plant.capacity / 5;
    const data = {
        acPower: Math.floor(Math.random() * (basePower * 0.3)) + basePower,
        dcPower: Math.floor(Math.random() * (basePower * 0.4)) + basePower * 1.2,
        pr: Math.floor(Math.random() * 10) + 80,
        dailyYield: Math.floor(Math.random() * (basePower * 2)) + basePower * 4,
        soilingIndex: Math.floor(Math.random() * 10) + 5,
        irradiance: Math.floor(Math.random() * 200) + 600,
        timestamp: new Date()
    };

    // Store this data point for historical purposes
    const monitoringData = readData('monitoringData.json');
    if (!monitoringData[req.params.plantId]) {
        monitoringData[req.params.plantId] = [];
    }
    monitoringData[req.params.plantId].push(data);
    
    // Keep only last 1000 data points
    if (monitoringData[req.params.plantId].length > 1000) {
        monitoringData[req.params.plantId] = monitoringData[req.params.plantId].slice(-1000);
    }
    writeData('monitoringData.json', monitoringData);

    res.json(data);
});

app.get('/api/historical-data/:plantId', (req, res) => {
    const { days = 30 } = req.query;
    const monitoringData = readData('monitoringData.json');
    const plantData = monitoringData[req.params.plantId] || [];
    
    // Group by day
    const dailyData = {};
    plantData.forEach(data => {
        const date = new Date(data.timestamp).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = [];
        }
        dailyData[date].push(data);
    });

    // Calculate daily aggregates
    const result = {
        labels: [],
        datasets: [
            {
                label: 'AC Power (kWh)',
                data: [],
                borderColor: '#4285F4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ]
    };

    Object.keys(dailyData).sort().forEach(date => {
        const dayData = dailyData[date];
        const totalEnergy = dayData.reduce((sum, data) => sum + data.acPower, 0) / 1000; // Convert to kWh
        result.labels.push(date);
        result.datasets[0].data.push(totalEnergy);
    });

    res.json(result);
});

// Fault Detection Route
app.post('/api/fault-detection', upload.single('csvFile'), (req, res) => {
    // In a real app, you would process the CSV file with ML models
    // For now, we'll return mock results
    const results = [
        { time: '10:30', inverterId: 'INV-001', issue: 'Normal Operation', severity: 'normal', action: 'No action required' },
        { time: '11:45', inverterId: 'INV-002', issue: 'Soiling Detected', severity: 'warning', action: 'Clean panels' },
        { time: '12:15', inverterId: 'INV-003', issue: 'Inverter Anomaly', severity: 'fault', action: 'Inspect inverter' }
    ];

    // Also store an alert for the fault
    const alerts = readData('alerts.json');
    alerts.push({
        id: Date.now().toString(),
        time: new Date().toLocaleString(),
        message: 'Fault detected in uploaded data',
        severity: 'warning',
        status: 'Active'
    });
    writeData('alerts.json', alerts);

    res.json(results);
});

// Alerts Route
app.get('/api/alerts', (req, res) => {
    const alerts = readData('alerts.json');
    res.json(alerts);
});

// Maintenance Route
app.get('/api/maintenance/:plantId', (req, res) => {
    // In a real app, this would come from a database
    // For now, return mock data
    const maintenance = {
        lastCleaning: '15 May 2023, 10:30 AM',
        nextCleaning: '15 June 2023, 10:00 AM',
        recentMaintenance: [
            { task: 'Inverter 3 Repair', date: '10 May 2023, 2:15 PM', status: 'completed' },
            { task: 'String 2 Inspection', date: '5 May 2023, 11:45 AM', status: 'completed' }
        ],
        upcomingTasks: [
            { task: 'MPPT Unit Check', date: '20 May 2023, 9:00 AM', status: 'pending' },
            { task: 'Wiring Inspection', date: '25 May 2023, 10:30 AM', status: 'pending' }
        ]
    };
    res.json(maintenance);
});

// Serve static files from the frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// For any other route, serve the frontend's index.html
app.get('(.*)', (req, res) => {


    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});