// Backend Service for API calls
const BackendService = {
    // Get all plants
    getPlants: async function() {
        const response = await fetch('/api/plants');
        return response.json();
    },

    // Add a new plant
    addPlant: async function(plant) {
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(plant)
        });
        return response.json();
    },

    // Update a plant
    updatePlant: async function(plant) {
        const response = await fetch(`/api/plants/${plant.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(plant)
        });
        return response.json();
    },

    // Delete a plant
    deletePlant: async function(plantId) {
        const response = await fetch(`/api/plants/${plantId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // Get live data for a specific plant
    getLiveData: async function(plantId) {
        const response = await fetch(`/api/live-data/${plantId}`);
        return response.json();
    },

    // Get historical data for a plant
    getHistoricalData: async function(plantId, days) {
        const response = await fetch(`/api/historical-data/${plantId}?days=${days}`);
        return response.json();
    },

    // Upload CSV for fault detection
    predictFaults: async function(file) {
        const formData = new FormData();
        formData.append('csvFile', file);
        const response = await fetch('/api/fault-detection', {
            method: 'POST',
            body: formData
        });
        return response.json();
    },

    // Get alerts
    getAlerts: async function() {
        const response = await fetch('/api/alerts');
        return response.json();
    },

    // Get maintenance info
    getMaintenanceInfo: async function(plantId) {
        const response = await fetch(`/api/maintenance/${plantId}`);
        return response.json();
    }
};

// Global variables
let powerChart, prGauge, energyChart, efficiencyChart, prChart, tempChart, irradiationChart, maintenanceChart;
let refreshInterval;
let alertCount = 0;
let isMonitoring = false;
let currentPlantId = 'plant1';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializePlantManagement();
    initializeNavigation();
    initializeDateTime();
    initializeDashboard();
    initializeFaultDetection();
    initializeAnalytics();
    initializeMaintenance();
    initializeSettings();
    initializeAlertSystem();
    updatePlantSelector();
    updatePlantList();
    updateAnalyticsPlantSelector();
});

// Plant Management Functions
function initializePlantManagement() {
    // Add plant button
    document.getElementById('add-plant-btn').addEventListener('click', function() {
        document.getElementById('add-plant-modal').classList.add('active');
    });

    // Close modal buttons
    document.getElementById('close-modal').addEventListener('click', closeAddPlantModal);
    document.getElementById('cancel-add-plant').addEventListener('click', closeAddPlantModal);
    
    // Confirm add plant
    document.getElementById('confirm-add-plant').addEventListener('click', addNewPlant);

    // Edit plant modal
    document.getElementById('close-edit-modal').addEventListener('click', closeEditPlantModal);
    document.getElementById('cancel-edit-plant').addEventListener('click', closeEditPlantModal);
    document.getElementById('confirm-edit-plant').addEventListener('click', saveEditedPlant);

    // Current plant selector
    document.getElementById('current-plant').addEventListener('change', function() {
        currentPlantId = this.value;
        updateCurrentPlantInfo();
        
        // If monitoring is active, restart with new plant
        if (isMonitoring) {
            stopMonitoring();
            startMonitoring();
        }
    });
}

function closeAddPlantModal() {
    document.getElementById('add-plant-modal').classList.remove('active');
    document.getElementById('add-plant-form').reset();
}

function closeEditPlantModal() {
    document.getElementById('edit-plant-modal').classList.remove('active');
    document.getElementById('edit-plant-form').reset();
}

function addNewPlant() {
    const name = document.getElementById('new-plant-name').value;
    const location = document.getElementById('new-plant-location').value;
    const capacity = parseInt(document.getElementById('new-plant-capacity').value);
    const inverters = parseInt(document.getElementById('new-plant-inverters').value);
    const latitude = document.getElementById('new-plant-lat').value;
    const longitude = document.getElementById('new-plant-lon').value;

    if (!name || !location || !capacity || !inverters || !latitude || !longitude) {
        showAlert('danger', 'Validation Error', 'Please fill in all fields.');
        return;
    }

    const newPlant = {
        name,
        location,
        capacity,
        inverters,
        latitude,
        longitude
    };

    BackendService.addPlant(newPlant).then(addedPlant => {
        updatePlantSelector();
        updatePlantList();
        updateAnalyticsPlantSelector();
        closeAddPlantModal();
        showAlert('success', 'Plant Added', `${addedPlant.name} has been added successfully.`);
    }).catch(error => {
        console.error('Error adding plant:', error);
        showAlert('danger', 'Error', 'Failed to add plant.');
    });
}

function editPlant(plantId) {
    BackendService.getPlants().then(plants => {
        const plant = plants.find(p => p.id === plantId);
        if (!plant) return;

        document.getElementById('edit-plant-id').value = plant.id;
        document.getElementById('edit-plant-name').value = plant.name;
        document.getElementById('edit-plant-location').value = plant.location;
        document.getElementById('edit-plant-capacity').value = plant.capacity;
        document.getElementById('edit-plant-inverters').value = plant.inverters;
        document.getElementById('edit-plant-lat').value = plant.latitude;
        document.getElementById('edit-plant-lon').value = plant.longitude;

        document.getElementById('edit-plant-modal').classList.add('active');
    }).catch(error => {
        console.error('Error fetching plant for edit:', error);
        showAlert('danger', 'Error', 'Failed to load plant data.');
    });
}

function saveEditedPlant() {
    const id = document.getElementById('edit-plant-id').value;
    const name = document.getElementById('edit-plant-name').value;
    const location = document.getElementById('edit-plant-location').value;
    const capacity = parseInt(document.getElementById('edit-plant-capacity').value);
    const inverters = parseInt(document.getElementById('edit-plant-inverters').value);
    const latitude = document.getElementById('edit-plant-lat').value;
    const longitude = document.getElementById('edit-plant-lon').value;

    if (!name || !location || !capacity || !inverters || !latitude || !longitude) {
        showAlert('danger', 'Validation Error', 'Please fill in all fields.');
        return;
    }

    const updatedPlant = {
        id,
        name,
        location,
        capacity,
        inverters,
        latitude,
        longitude
    };

    BackendService.updatePlant(updatedPlant).then(updated => {
        updatePlantSelector();
        updatePlantList();
        updateAnalyticsPlantSelector();
        
        // If editing the current plant, update the display
        if (id === currentPlantId) {
            updateCurrentPlantInfo();
        }
        
        closeEditPlantModal();
        showAlert('success', 'Plant Updated', `${updated.name} has been updated successfully.`);
    }).catch(error => {
        console.error('Error updating plant:', error);
        showAlert('danger', 'Error', 'Failed to update plant.');
    });
}

function deletePlant(plantId) {
    BackendService.getPlants().then(plants => {
        const plant = plants.find(p => p.id === plantId);
        if (!plant) return;

        if (confirm(`Are you sure you want to delete ${plant.name}?`)) {
            BackendService.deletePlant(plantId).then(() => {
                updatePlantSelector();
                updatePlantList();
                updateAnalyticsPlantSelector();
                
                // If deleting the current plant, switch to the first available
                if (plantId === currentPlantId) {
                    BackendService.getPlants().then(updatedPlants => {
                        if (updatedPlants.length > 0) {
                            currentPlantId = updatedPlants[0].id;
                            document.getElementById('current-plant').value = currentPlantId;
                            updateCurrentPlantInfo();
                        }
                    });
                }
                
                showAlert('success', 'Plant Deleted', `${plant.name} has been deleted.`);
            }).catch(error => {
                console.error('Error deleting plant:', error);
                showAlert('danger', 'Error', 'Failed to delete plant.');
            });
        }
    }).catch(error => {
        console.error('Error fetching plants for delete:', error);
        showAlert('danger', 'Error', 'Failed to load plants.');
    });
}

function updatePlantSelector() {
    const selector = document.getElementById('current-plant');
    
    BackendService.getPlants().then(plants => {
        selector.innerHTML = '';
        
        plants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.id;
            option.textContent = plant.name;
            if (plant.id === currentPlantId) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }).catch(error => {
        console.error('Error fetching plants for selector:', error);
    });
}

function updateAnalyticsPlantSelector() {
    const selector = document.getElementById('plant-select');
    
    BackendService.getPlants().then(plants => {
        selector.innerHTML = '';
        
        plants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.id;
            option.textContent = plant.name;
            option.selected = true; // Select all by default
            selector.appendChild(option);
        });
    }).catch(error => {
        console.error('Error fetching plants for analytics selector:', error);
    });
}

function updatePlantList() {
    const plantList = document.getElementById('plant-list');
    
    // Show loading indicator
    plantList.innerHTML = '<div class="spinner"></div>';
    
    BackendService.getPlants().then(plants => {
        plantList.innerHTML = '';
        
        plants.forEach(plant => {
            const plantItem = document.createElement('div');
            plantItem.className = 'plant-item';
            
            plantItem.innerHTML = `
                <div class="plant-item-info">
                    <div class="plant-item-name">${plant.name}</div>
                    <div class="plant-item-location">${plant.location} • ${plant.capacity} kW • ${plant.inverters} inverters</div>
                </div>
                <div class="plant-item-actions">
                    <button class="btn-icon edit" onclick="editPlant('${plant.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deletePlant('${plant.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            plantList.appendChild(plantItem);
        });
    }).catch(error => {
        console.error('Error fetching plants:', error);
        showAlert('danger', 'Error', 'Failed to load plants.');
    });
}

function updateCurrentPlantInfo() {
    BackendService.getPlants().then(plants => {
        const plant = plants.find(p => p.id === currentPlantId);
        if (plant) {
            document.getElementById('plant-name').textContent = plant.name;
            document.getElementById('plant-location').textContent = `${plant.latitude}° N, ${plant.longitude}° E`;
        }
    }).catch(error => {
        console.error('Error updating current plant info:', error);
    });
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // Initialize section-specific components
            if (sectionId === 'analytics') {
                initializeAnalyticsCharts();
            } else if (sectionId === 'maintenance') {
                initializeMaintenanceChart();
            }
        });
    });
}

// Date and time display
function initializeDateTime() {
    function updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        document.getElementById('datetime').textContent = now.toLocaleDateString('en-US', options);
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// Dashboard initialization
function initializeDashboard() {
    // Start monitoring buttons
    document.getElementById('start-monitoring').addEventListener('click', startMonitoring);
    document.getElementById('start-monitoring-empty').addEventListener('click', startMonitoring);
    document.getElementById('stop-monitoring').addEventListener('click', stopMonitoring);
    
    // Refresh chart button
    document.getElementById('refresh-chart').addEventListener('click', function() {
        if (isMonitoring) {
            updateDashboardData();
        }
    });
}

// Start monitoring
function startMonitoring() {
    isMonitoring = true;
    
    // Update UI
    document.getElementById('dashboard-empty').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    document.getElementById('start-monitoring').style.display = 'none';
    document.getElementById('stop-monitoring').style.display = 'inline-block';
    
    const statusBadge = document.getElementById('monitoring-status');
    statusBadge.className = 'status-badge status-active';
    statusBadge.innerHTML = '<i class="fas fa-circle"></i> Monitoring Active';
    
    // Initialize charts
    initializeDashboardCharts();
    
    // Start data refresh
    startDataRefresh();
    
    BackendService.getPlants().then(plants => {
        const plant = plants.find(p => p.id === currentPlantId);
        showAlert('success', 'Monitoring Started', `Solar plant monitoring is now active for ${plant ? plant.name : 'current plant'}.`);
    }).catch(error => {
        console.error('Error getting plant name:', error);
        showAlert('success', 'Monitoring Started', 'Solar plant monitoring is now active.');
    });
}

// Stop monitoring
function stopMonitoring() {
    isMonitoring = false;
    
    // Update UI
    document.getElementById('start-monitoring').style.display = 'inline-block';
    document.getElementById('stop-monitoring').style.display = 'none';
    
    const statusBadge = document.getElementById('monitoring-status');
    statusBadge.className = 'status-badge status-inactive';
    statusBadge.innerHTML = '<i class="fas fa-circle"></i> Monitoring Inactive';
    
    // Stop data refresh
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    showAlert('info', 'Monitoring Stopped', 'Solar plant monitoring has been paused.');
}

// Initialize dashboard charts
function initializeDashboardCharts() {
    // Initialize power chart
    const powerCtx = document.getElementById('power-chart').getContext('2d');
    powerChart = new Chart(powerCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Actual Power',
                    data: [],
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Expected Power',
                    data: [],
                    borderColor: '#34A853',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Power (kW)'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // Initialize PR gauge
    const prCtx = document.getElementById('pr-gauge').getContext('2d');
    prGauge = new Chart(prCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: [
                    '#4285F4',
                    '#E0E0E0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: 270,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        },
        plugins: [{
            id: 'text',
            beforeDraw: function(chart) {
                const width = chart.width,
                    height = chart.height,
                    ctx = chart.ctx;
                
                ctx.restore();
                const fontSize = (height / 100).toFixed(2);
                ctx.font = fontSize + "em sans-serif";
                ctx.textBaseline = "middle";
                ctx.fillStyle = '#202124';
                
                const text = chart.data.datasets[0].data[0] + "%",
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    textY = height / 1.6;
                
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}

// Start data refresh
function startDataRefresh() {
    // Initial data update
    updateDashboardData();
    
    // Set up interval for data refresh
    const refreshRate = parseInt(document.getElementById('refresh-rate').value) * 1000;
    refreshInterval = setInterval(() => {
        updateDashboardData();
    }, refreshRate);
}

// Update dashboard data
async function updateDashboardData() {
    try {
        // Get live data from backend for current plant
        const data = await BackendService.getLiveData(currentPlantId);
        
        // Update metric cards
        document.getElementById('ac-power').textContent = data.acPower + ' kW';
        document.getElementById('dc-power').textContent = data.dcPower + ' kW';
        document.getElementById('pr-value').textContent = data.pr + '%';
        document.getElementById('daily-yield').textContent = data.dailyYield + ' kWh';
        document.getElementById('soiling-index').textContent = data.soilingIndex + '%';
        document.getElementById('irradiance').textContent = data.irradiance + ' W/m²';
        
        // Update last update time
        document.getElementById('last-update').textContent = 
            'Last update: ' + new Date(data.timestamp).toLocaleTimeString();
        
        // Update PR gauge
        prGauge.data.datasets[0].data = [data.pr, 100 - data.pr];
        prGauge.update();
        
        // Update power chart
        const timeLabel = new Date(data.timestamp).getHours() + ':' + 
            new Date(data.timestamp).getMinutes().toString().padStart(2, '0');
        
        if (powerChart.data.labels.length > 20) {
            powerChart.data.labels.shift();
            powerChart.data.datasets[0].data.shift();
            powerChart.data.datasets[1].data.shift();
        }
        
        powerChart.data.labels.push(timeLabel);
        powerChart.data.datasets[0].data.push(data.acPower);
        powerChart.data.datasets[1].data.push(data.acPower + Math.random() * 20 - 10);
        powerChart.update();
        
        // Update system status based on PR
        updateSystemStatus(data.pr);
        
    } catch (error) {
        console.error('Error updating dashboard data:', error);
        showAlert('danger', 'Data Update Failed', 'Failed to retrieve live data from the backend.');
    }
}

// Update system status
function updateSystemStatus(pr) {
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    
    if (pr >= 85) {
        statusIcon.className = 'fas fa-circle status-healthy';
        statusText.textContent = 'Healthy';
    } else if (pr >= 70) {
        statusIcon.className = 'fas fa-circle status-warning';
        statusText.textContent = 'Warning';
        
        // Show warning alert
        showAlert('warning', 'Performance Ratio Drop', `PR has dropped to ${pr}%. Consider inspection.`);
    } else {
        statusIcon.className = 'fas fa-circle status-fault';
        statusText.textContent = 'Fault';
        
        // Show fault alert
        showAlert('danger', 'Critical Performance Issue', `PR critically low at ${pr}%. Immediate action required.`);
    }
}

// Fault detection initialization
function initializeFaultDetection() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFileUpload(this.files[0]);
        }
    });
}

// Handle file upload
async function handleFileUpload(file) {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showAlert('danger', 'Invalid File', 'Please upload a CSV file.');
        return;
    }

    // Simulate file processing
    showAlert('info', 'Processing File', 'Analyzing data with ML models...');

    try {
        // Get fault detection results from backend
        const results = await BackendService.predictFaults(file);
        
        // Display results
        displayFaultResults(results);
        
        showAlert('success', 'Analysis Complete', 'Fault detection results are ready.');
    } catch (error) {
        console.error('Error processing file:', error);
        showAlert('danger', 'Processing Failed', 'Failed to analyze the uploaded file.');
    }
}

// Display fault results
function displayFaultResults(results) {
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        // Create severity badge
        let severityClass = '';
        let severityIcon = '';
        
        switch (result.severity) {
            case 'normal':
                severityClass = 'severity-normal';
                severityIcon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'warning':
                severityClass = 'severity-warning';
                severityIcon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'fault':
                severityClass = 'severity-fault';
                severityIcon = '<i class="fas fa-times-circle"></i>';
                break;
        }
        
        row.innerHTML = `
            <td>${result.time}</td>
            <td>${result.inverterId}</td>
            <td>${result.issue}</td>
            <td><span class="severity-badge ${severityClass}">${severityIcon} ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}</span></td>
            <td>${result.action}</td>
        `;
        
        tbody.appendChild(row);
        
        // Show alert for severe faults
        if (result.severity === 'fault') {
            showAlert('danger', 'Fault Detected', `${result.issue} on ${result.inverterId}. ${result.action}`);
        }
    });
    
    document.getElementById('results-container').style.display = 'block';
}

// Analytics initialization
function initializeAnalytics() {
    document.getElementById('apply-filters').addEventListener('click', function() {
        initializeAnalyticsCharts();
    });
}

// Initialize analytics charts
async function initializeAnalyticsCharts() {
    const dateRange = document.getElementById('date-range').value;
    const plantSelect = document.getElementById('plant-select');
    const selectedPlantIds = Array.from(plantSelect.selectedOptions).map(option => option.value);
    const metric = document.getElementById('metric-select').value;
    
    if (selectedPlantIds.length === 0) {
        showAlert('warning', 'No Plants Selected', 'Please select at least one plant to compare.');
        return;
    }
    
    try {
        // Get historical data from backend for each plant
        const historicalDataPromises = selectedPlantIds.map(plantId => 
            BackendService.getHistoricalData(plantId, parseInt(dateRange))
        );
        
        const historicalDataArray = await Promise.all(historicalDataPromises);
        
        // Generate colors for each plant
        const colors = [
            '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#9C27B0', 
            '#FF9800', '#00BCD4', '#795548', '#607D8B', '#E91E63'
        ];
        
        // Initialize energy chart
        const energyCtx = document.getElementById('energy-chart');
        if (energyChart) {
            energyChart.destroy();
        }
        
        const energyDatasets = selectedPlantIds.map((plantId, index) => {
            return {
                label: `Plant ${index + 1}`,
                data: historicalDataArray[index].datasets[0].data,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            };
        });
        
        energyChart = new Chart(energyCtx, {
            type: 'line',
            data: {
                labels: historicalDataArray[0].labels,
                datasets: energyDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Daily Energy Generation (kWh)'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Energy (kWh)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Initialize efficiency chart
        const efficiencyCtx = document.getElementById('efficiency-chart');
        if (efficiencyChart) {
            efficiencyChart.destroy();
        }
        
        const efficiencyData = selectedPlantIds.map((_, index) => {
            // Calculate average efficiency from historical data
            const efficiencyValues = historicalDataArray[index].datasets[0].data;
            const avgEfficiency = efficiencyValues.reduce((sum, val) => sum + val, 0) / efficiencyValues.length;
            return avgEfficiency;
        });
        
        efficiencyChart = new Chart(efficiencyCtx, {
            type: 'bar',
            data: {
                labels: selectedPlantIds.map((_, index) => `Plant ${index + 1}`),
                datasets: [{
                    label: 'Average Efficiency (%)',
                    data: efficiencyData,
                    backgroundColor: selectedPlantIds.map((_, index) => colors[index % colors.length] + '80'),
                    borderColor: selectedPlantIds.map((_, index) => colors[index % colors.length]),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Average Efficiency Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Efficiency (%)'
                        }
                    }
                }
            }
        });
        
        // Initialize PR chart
        const prCtx = document.getElementById('pr-chart');
        if (prChart) {
            prChart.destroy();
        }
        
        const prData = selectedPlantIds.map((_, index) => {
            // Calculate average PR from historical data
            const prValues = historicalDataArray[index].datasets[0].data;
            const avgPr = prValues.reduce((sum, val) => sum + val, 0) / prValues.length;
            return avgPr;
        });
        
        prChart = new Chart(prCtx, {
            type: 'bar',
            data: {
                labels: selectedPlantIds.map((_, index) => `Plant ${index + 1}`),
                datasets: [{
                    label: 'Average Performance Ratio',
                    data: prData,
                    backgroundColor: selectedPlantIds.map((_, index) => colors[index % colors.length] + '80'),
                    borderColor: selectedPlantIds.map((_, index) => colors[index % colors.length]),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Average Performance Ratio Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Ratio'
                        }
                    }
                }
            }
        });
        
        // Initialize temperature chart
        const tempCtx = document.getElementById('temp-chart');
        if (tempChart) {
            tempChart.destroy();
        }
        
        const tempDatasets = selectedPlantIds.map((_, index) => {
            // Generate scatter data for temperature correlation
            const scatterData = [];
            for (let i = 0; i < 50; i++) {
                scatterData.push({
                    x: Math.floor(Math.random() * 30) + 15, // 15-45°C
                    y: Math.floor(Math.random() * 200) + 300 // 300-500W
                });
            }
            return {
                label: `Plant ${index + 1}`,
                data: scatterData,
                backgroundColor: colors[index % colors.length] + '80',
                pointRadius: 5,
                pointHoverRadius: 7
            };
        });
        
        tempChart = new Chart(tempCtx, {
            type: 'scatter',
            data: {
                datasets: tempDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Temperature vs AC Power'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Ambient Temperature (°C)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'AC Power (W)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Initialize irradiation chart
        const irradiationCtx = document.getElementById('irradiation-chart');
        if (irradiationChart) {
            irradiationChart.destroy();
        }
        
        const irradiationDatasets = selectedPlantIds.map((_, index) => {
            // Generate scatter data for irradiation correlation
            const scatterData = [];
            for (let i = 0; i < 50; i++) {
                scatterData.push({
                    x: Math.floor(Math.random() * 800) + 200, // 200-1000 W/m²
                    y: Math.floor(Math.random() * 200) + 300 // 300-500W
                });
            }
            return {
                label: `Plant ${index + 1}`,
                data: scatterData,
                backgroundColor: colors[index % colors.length] + '80',
                pointRadius: 5,
                pointHoverRadius: 7
            };
        });
        
        irradiationChart = new Chart(irradiationCtx, {
            type: 'scatter',
            data: {
                datasets: irradiationDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Irradiation vs AC Power'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Irradiation (W/m²)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'AC Power (W)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading analytics data:', error);
        showAlert('danger', 'Analytics Failed', 'Failed to load historical data for analytics.');
    }
}

// Maintenance initialization
function initializeMaintenance() {
    // Mark maintenance tasks as completed
    const statusIcons = document.querySelectorAll('.status-icon');
    statusIcons.forEach(icon => {
        if (icon.classList.contains('status-pending')) {
            icon.parentElement.style.cursor = 'pointer';
            icon.parentElement.addEventListener('click', function() {
                if (confirm('Mark this task as completed?')) {
                    icon.classList.remove('status-pending');
                    icon.classList.add('status-completed');
                    this.querySelector('span:last-child').textContent = 'Completed';
                    showAlert('success', 'Task Completed', 'Maintenance task marked as completed.');
                }
            });
        }
    });
}

// Initialize maintenance chart
function initializeMaintenanceChart() {
    const maintenanceCtx = document.getElementById('maintenance-chart');
    if (maintenanceChart) {
        maintenanceChart.destroy();
    }
    
    maintenanceChart = new Chart(maintenanceCtx, {
        type: 'line',
        data: {
            labels: generateDateLabels(30),
            datasets: [
                {
                    label: 'Performance Ratio',
                    data: generateRandomData(30, 70, 95),
                    borderColor: '#4285F4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Maintenance Events',
                    data: generateMaintenanceEvents(30),
                    borderColor: '#EA4335',
                    backgroundColor: 'rgba(234, 67, 53, 0.1)',
                    borderWidth: 2,
                    pointStyle: 'rectRot',
                    pointRadius: 8,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return 'Maintenance Event';
                            }
                            return context.dataset.label + ': ' + context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Performance Ratio (%)'
                    },
                    min: 60,
                    max: 100
                }
            }
        }
    });
}

// Generate date labels
function generateDateLabels(days) {
    const labels = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
}

// Generate random data
function generateRandomData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
}

// Generate maintenance events
function generateMaintenanceEvents(days) {
    const events = [];
    const eventCount = Math.floor(Math.random() * 3) + 1; // 1-3 events
    
    for (let i = 0; i < eventCount; i++) {
        const dayIndex = Math.floor(Math.random() * days);
        events[dayIndex] = Math.floor(Math.random() * 10) + 80; // Random PR value
    }
    
    return events;
}

// Settings initialization
function initializeSettings() {
    // Save buttons
    const saveButtons = document.querySelectorAll('.btn-save');
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.settings-card');
            const title = card.querySelector('.settings-title').textContent;
            
            // In a real app, this would save settings to the backend
            showAlert('success', 'Settings Saved', `${title} have been updated successfully.`);
        });
    });
    
    // Refresh rate change
    document.getElementById('refresh-rate').addEventListener('change', function() {
        if (isMonitoring) {
            // Restart monitoring with new refresh rate
            stopMonitoring();
            startMonitoring();
        }
    });
}

// Alert system initialization
function initializeAlertSystem() {
    // Initial alerts
    setTimeout(() => {
        showAlert('info', 'System Ready', 'Solar monitoring system is ready. Start monitoring to begin data collection.');
    }, 1000);
}

// Show alert
function showAlert(type, title, message) {
    const alertPanel = document.getElementById('alert-panel');
    const alertId = 'alert-' + (++alertCount);
    
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type}`;
    
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'danger':
            icon = '<i class="fas fa-times-circle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    alert.innerHTML = `
        <div class="alert-header">
            <div class="alert-title">${icon} ${title}</div>
            <button class="alert-close" onclick="dismissAlert('${alertId}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="alert-message">${message}</div>
    `;
    
    alertPanel.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        dismissAlert(alertId);
    }, 5000);
}

// Dismiss alert
function dismissAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }
}