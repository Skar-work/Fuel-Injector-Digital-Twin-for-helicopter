// Helicopter Fuel Injection System Digital Twin
class HelicopterSimulation {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.engineStarted = false;
        this.timeStep = 0.1;
        this.currentTime = 0;
        this.maxDataPoints = 600; // 60 seconds at 0.1s intervals
        this.simulationInterval = null;
        
        // Data array for logging
        this.logData = [];

        // Helicopter specifications
        this.specs = {
            mass: 5000,
            gravity: 9.81,
            hoverPitch: 60,
            verticalDamping: 0.95,
            baseFuelPressure: 30,
            engineRpmBase: 100,
            fuelDensity: 810,
            baseFuelFlowAtMaxThrottle: 240,
            maxAltitude: 6000,
            seaLevelLiftCoefficient: 911.7,
            maxFuelTempIncrease: 30.0, // Max temp increase from engine heat at full throttle
            thermalDamping: 0.01       // Controls how fast the temperature changes (slowed down)
        };

        // Current state
        this.state = {
            collectivePitch: 60,
            altitude: 0,
            verticalVelocity: 0,
            ambientPressure: 101325,
            ambientTemperature: 15,
            airDensity: 1.225,
            throttle: 0,
            engineLoad: 0,
            engineRpm: 100,
            fuelPressure: 30,
            fuelTemperature: 15,
            fuelFlowRate: 0,
            injectorDutyCycle: 0
        };

        // Fault injection states
        this.faults = {
            cloggedInjector: false,
            fuelOverheat: false,
            rpmDrop: false,
            sensorDrift: false
        };

        // Hardcoded AI Prediction data
        this.aiPredictions = {
            cloggedInjector: {
                name: "Clogged Fuel Injector",
                affectedSystems: "Fuel Injectors, Fuel Manifold, Engine Performance",
                immediateMeasures: "Reduce throttle to decrease fuel demand.",
                preferableMeasures: "Land as soon as practicable. Schedule maintenance to clean or replace injectors."
            },
            fuelOverheat: {
                name: "Fuel Overheat",
                affectedSystems: "Fuel Pump, Fuel Lines, Engine Performance",
                immediateMeasures: "Decrease engine load by reducing collective pitch. Increase airspeed to improve airflow and cooling.",
                preferableMeasures: "Monitor fuel temperature closely. If temperature continues to rise, consider precautionary landing."
            },
            rpmDrop: {
                name: "Engine RPM Droop",
                affectedSystems: "Engine Governor, FADEC, Rotor System",
                immediateMeasures: "Lower collective pitch to reduce load on the engine. Monitor RPM and engine parameters.",
                preferableMeasures: "Prepare for potential autorotation if RPM does not recover. Divert to nearest suitable landing area."
            },
            sensorDrift: {
                name: "Sensor Drift Detected",
                affectedSystems: "Instrumentation, FADEC Inputs, Autopilot",
                immediateMeasures: "Cross-reference with backup instruments (e.g., standby altimeter, pressure gauges).",
                preferableMeasures: "Disengage autopilot if necessary. Rely on primary flight displays and report sensor discrepancy upon landing."
            }
        };

        // Warning states
        this.warnings = new Map();
        this.alertLog = [];
        this.rpmDropTimer = 0;

        // Data arrays for charts
        this.chartData = {
            time: [],
            altitude: [],
            fuelPressure: [],
            engineRpm: [],
            fuelFlowRate: [],
            fuelTemperature: []
        };

        // Initialize components
        this.initializeCharts();
        this.initializeEventListeners();
        this.initializeSchematic();
        this.updateDisplay();
        this.updateWarnings();
        this.updateAIPrediction(); // Initial call
    }

    initializeCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Time (s)'
                    }
                },
                y: {
                    title: {
                        display: true
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        };
        // Altitude Chart
        this.altitudeChart = new Chart(document.getElementById('altitudeChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Altitude',
                    data: [],
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        title: {
                            display: true,
                            text: 'Altitude (m)'
                        }
                    }
                }
            }
        });
        // Fuel Pressure Chart
        this.fuelPressureChart = new Chart(document.getElementById('fuelPressureChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Fuel Pressure',
                    data: [],
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        title: {
                            display: true,
                            text: 'Pressure (bar)'
                        }
                    }
                }
            }
        });
        // Engine RPM Chart
        this.engineRpmChart = new Chart(document.getElementById('engineRpmChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Engine RPM',
                    data: [],
                    borderColor: '#B4413C',
                    backgroundColor: 'rgba(180, 65, 60, 0.1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        title: {
                            display: true,
                            text: 'RPM (%)'
                        }
                    }
                }
            }
        });
        // Fuel Flow Rate Chart
        this.fuelFlowChart = new Chart(document.getElementById('fuelFlowChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Fuel Flow Rate',
                    data: [],
                    borderColor: '#5D878F',
                    backgroundColor: 'rgba(93, 135, 143, 0.1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        title: {
                            display: true,
                            text: 'Flow Rate (L/h)'
                        }
                    }
                }
            }
        });
        // Fuel Temperature Chart
        this.fuelTempChart = new Chart(document.getElementById('fuelTempChart'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Fuel Temperature',
                    data: [],
                    borderColor: '#9B88ED',
                    backgroundColor: 'rgba(155, 136, 237, 0.1)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        title: {
                            display: true,
                            text: 'Temp (°C)'
                        }
                    }
                }
            }
        });
    }

    initializeEventListeners() {
        // Collective pitch control
        const collectivePitchSlider = document.getElementById('collectivePitch');
        const collectivePitchValue = document.getElementById('collectivePitchValue');

        collectivePitchSlider.addEventListener('input', (e) => {
            this.state.collectivePitch = parseFloat(e.target.value);
            collectivePitchValue.textContent = this.state.collectivePitch.toFixed(1);
        });
        collectivePitchSlider.addEventListener('change', (e) => {
            this.state.collectivePitch = parseFloat(e.target.value);
            collectivePitchValue.textContent = this.state.collectivePitch.toFixed(1);
        });
        // Engine controls
        document.getElementById('startEngine').addEventListener('click', () => {
            this.startEngine();
        });
        document.getElementById('stopEngine').addEventListener('click', () => {
            this.stopEngine();
        });
        document.getElementById('emergencyStop').addEventListener('click', () => {
            this.emergencyStop();
        });
        // Simulation controls
        document.getElementById('playPause').addEventListener('click', () => {
            this.toggleSimulation();
        });
        document.getElementById('reset').addEventListener('click', () => {
            this.resetSimulation();
        });
        document.getElementById('downloadLog').addEventListener('click', () => {
            this.downloadCSV();
        });
        // Fault injection checkboxes
        document.getElementById('injectClogged').addEventListener('change', (e) => {
            this.faults.cloggedInjector = e.target.checked;
            if (e.target.checked) {
                this.addAlertLog('Clogged injector fault injected', 'warning');
            } else {
                this.addAlertLog('Clogged injector fault cleared', 'info');
            }
        });
        document.getElementById('injectOverheat').addEventListener('change', (e) => {
            this.faults.fuelOverheat = e.target.checked;
            if (e.target.checked) {
                this.addAlertLog('Fuel overheat fault injected', 'warning');
            } else {
                this.addAlertLog('Fuel overheat fault cleared', 'info');
            }
        });

        document.getElementById('injectRpmDrop').addEventListener('change', (e) => {
            this.faults.rpmDrop = e.target.checked;
            if (e.target.checked) {
                this.addAlertLog('RPM drop fault injected', 'warning');
            } else {
                this.addAlertLog('RPM drop fault cleared', 'info');
            }
        });
        document.getElementById('injectSensorDrift').addEventListener('change', (e) => {
            this.faults.sensorDrift = e.target.checked;
            if (e.target.checked) {
                this.addAlertLog('Sensor drift fault injected', 'warning');
            } else {
                this.addAlertLog('Sensor drift fault cleared', 'info');
            }
        });
    }

    initializeSchematic() {
        const components = document.querySelectorAll('.component');
        components.forEach(component => {
            component.addEventListener('click', (e) => {
                e.preventDefault();
                const componentName = e.target.getAttribute('data-component');
                this.showComponentInfo(componentName);
            });
        });
    }

    showComponentInfo(componentName) {
        const componentInfo = document.getElementById('componentInfo');
        const infoMap = {
            'Fuel Tank': {
                description: 'Main fuel storage tank with capacity of 1000L',
                status: 'Normal operation',
                pressure: 'Atmospheric',
                temperature: `${this.state.ambientTemperature.toFixed(1)}°C`
            },
            'Fuel Filter': {
                description: 'High-efficiency fuel filter removes contaminants',
                status: this.faults.cloggedInjector ? 'Clogged - Reduced flow' : 'Normal operation',
                efficiency: this.faults.cloggedInjector ? '75%' : '99%',
                pressure: `${this.state.fuelPressure.toFixed(1)} bar`
            },
            'Fuel Pump': {
                description: 'Electric fuel pump provides pressurized fuel',
                status: 'Normal operation',
                pressure: `${this.state.fuelPressure.toFixed(1)} bar`,
                flowRate: `${this.state.fuelFlowRate.toFixed(1)} L/h`
            },
            'Fuel Pressure Regulator': {
                description: 'Maintains constant fuel pressure to injectors',
                status: 'Normal operation',
                setPoint: '30 bar',
                actual: `${this.state.fuelPressure.toFixed(1)} bar`
            },
            'Fuel Manifold': {
                description: 'Distributes fuel to all injectors',
                status: 'Normal operation',
                pressure: `${this.state.fuelPressure.toFixed(1)} bar`,
                temperature: `${this.state.fuelTemperature.toFixed(1)}°C`
            },
            'FADEC Controller': {
                description: 'Full Authority Digital Engine Control',
                status: this.engineStarted ? 'Active' : 'Standby',
                mode: document.getElementById('flightMode').value,
                rpm: `${this.state.engineRpm.toFixed(1)}%`
            },
            'Overspeed Solenoid': {
                description: 'Prevents engine overspeed conditions',
                status: 'Normal operation',
                activated: 'No',
                setPoint: '110% RPM'
            },
            'Vapor Valve': {
                description: 'Prevents fuel vapor lock',
                status: 'Normal operation',
                pressure: `${this.state.fuelPressure.toFixed(1)} bar`
            }
        };
        if (componentName && componentName.includes('Injector')) {
            const injectorInfo = {
                description: 'Fuel injector nozzle for precise fuel delivery',
                status: this.faults.cloggedInjector ? 'Clogged' : 'Normal operation',
                dutyCycle: `${this.state.injectorDutyCycle.toFixed(1)}%`,
                pressure: `${this.state.fuelPressure.toFixed(1)} bar`
            };
            componentInfo.innerHTML = `
                <h3>${componentName}</h3>
                <p><strong>Description:</strong> ${injectorInfo.description}</p>
                <p><strong>Status:</strong> ${injectorInfo.status}</p>
                <p><strong>Duty Cycle:</strong> ${injectorInfo.dutyCycle}</p>
                <p><strong>Pressure:</strong> ${injectorInfo.pressure}</p>
            `;
            return;
        }

        const info = infoMap[componentName];
        if (info) {
            let content = `<h3>${componentName}</h3>`;
            content += `<p><strong>Description:</strong> ${info.description}</p>`;
            content += `<p><strong>Status:</strong> ${info.status}</p>`;

            Object.keys(info).forEach(key => {
                if (key !== 'description' && key !== 'status') {
                    const keyFormatted = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
                    content += `<p><strong>${keyFormatted}:</strong> ${info[key]}</p>`;
                }
            });

            componentInfo.innerHTML = content;
        } else {
            componentInfo.innerHTML = `
                <h3>Component Information</h3>
                <p>Click on a component to view details</p>
            `;
        }
    }

    startEngine() {
        this.engineStarted = true;
        this.isRunning = true;
        this.isPaused = false;

        document.getElementById('startEngine').disabled = true;
        document.getElementById('stopEngine').disabled = false;
        document.getElementById('playPause').textContent = 'PAUSE';
        document.getElementById('playPause').classList.add('running');

        this.addAlertLog('Engine started', 'info');
        this.startSimulationLoop();
    }

    stopEngine() {
        this.engineStarted = false;
        this.isRunning = false;
        this.isPaused = false;

        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }

        document.getElementById('startEngine').disabled = false;
        document.getElementById('stopEngine').disabled = true;
        document.getElementById('playPause').textContent = 'PLAY';
        document.getElementById('playPause').classList.remove('running', 'paused');

        this.addAlertLog('Engine stopped', 'info');
        this.resetToGround();
    }

    emergencyStop() {
        this.engineStarted = false;
        this.isRunning = false;
        this.isPaused = false;

        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }

        document.getElementById('startEngine').disabled = false;
        document.getElementById('stopEngine').disabled = true;
        document.getElementById('playPause').textContent = 'PLAY';
        document.getElementById('playPause').classList.remove('running', 'paused');

        this.addAlertLog('EMERGENCY STOP activated', 'critical');
        this.resetToGround();
    }

    toggleSimulation() {
        if (!this.engineStarted) {
            this.startEngine();
            return;
        }

        if (this.isPaused) {
            this.isPaused = false;
            this.isRunning = true;
            document.getElementById('playPause').textContent = 'PAUSE';
            document.getElementById('playPause').classList.remove('paused');
            document.getElementById('playPause').classList.add('running');
            this.addAlertLog('Simulation resumed', 'info');
            this.startSimulationLoop();
        } else {
            this.isPaused = true;
            this.isRunning = false;
            if (this.simulationInterval) {
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
            }
            document.getElementById('playPause').textContent = 'PLAY';
            document.getElementById('playPause').classList.remove('running');
            document.getElementById('playPause').classList.add('paused');
            this.addAlertLog('Simulation paused', 'info');
        }
    }

    resetSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        this.engineStarted = false;
        this.currentTime = 0;

        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        this.logData = [];

        // Reset state
        this.state = {
            collectivePitch: 60,
            altitude: 0,
            verticalVelocity: 0,
            ambientPressure: 101325,
            ambientTemperature: 15,
            airDensity: 1.225,
            throttle: 0,
            engineLoad: 0,
            engineRpm: 100,
            fuelPressure: 30,
            fuelTemperature: 15,
            fuelFlowRate: 0,
            injectorDutyCycle: 0
        };

        // Reset faults
        this.faults = {
            cloggedInjector: false,
            fuelOverheat: false,
            rpmDrop: false,
            sensorDrift: false
        };
        // Reset UI
        document.getElementById('collectivePitch').value = 60;
        document.getElementById('collectivePitchValue').textContent = '60.0';
        document.getElementById('startEngine').disabled = false;
        document.getElementById('stopEngine').disabled = true;
        document.getElementById('playPause').textContent = 'PLAY';
        document.getElementById('playPause').classList.remove('running', 'paused');

        // Reset fault injection checkboxes
        document.getElementById('injectClogged').checked = false;
        document.getElementById('injectOverheat').checked = false;
        document.getElementById('injectRpmDrop').checked = false;
        document.getElementById('injectSensorDrift').checked = false;

        // Clear data arrays
        this.chartData = {
            time: [],
            altitude: [],
            fuelPressure: [],
            engineRpm: [],
            fuelFlowRate: [],
            fuelTemperature: []
        };
        // Clear warnings
        this.warnings.clear();
        this.rpmDropTimer = 0;

        this.updateCharts();
        this.updateDisplay();
        this.updateWarnings();
        this.updateSchematic();
        this.updateAIPrediction(); // Reset AI prediction display
        this.addAlertLog('Simulation reset', 'info');
    }

    resetToGround() {
        this.state.altitude = 0;
        this.state.verticalVelocity = 0;
        this.state.throttle = 0;
        this.state.engineLoad = 0;
        this.state.fuelFlowRate = 0;
        this.state.injectorDutyCycle = 0;
        this.calculateAmbientConditions();
        this.updateDisplay();
    }

    startSimulationLoop() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }

        this.simulationInterval = setInterval(() => {
            if (this.isRunning && this.engineStarted) {
                this.updateSimulation();
            }
        }, this.timeStep * 1000);
    }

    updateSimulation() {
        if (!this.isRunning || !this.engineStarted) return;
        this.currentTime += this.timeStep;

        const seaLevelDensity = 1.225;
        const seaLevelLift = this.specs.seaLevelLiftCoefficient * this.state.collectivePitch;
        const liftForce = seaLevelLift * (this.state.airDensity / seaLevelDensity);
        const gravityForce = this.specs.mass * this.specs.gravity;
        const verticalAcceleration = (liftForce - gravityForce) / this.specs.mass;

        this.state.verticalVelocity = this.specs.verticalDamping * this.state.verticalVelocity + verticalAcceleration * this.timeStep;
        this.state.altitude = this.state.altitude + this.state.verticalVelocity * this.timeStep;
        this.state.altitude = Math.max(0, Math.min(this.state.altitude, this.specs.maxAltitude));
        if (this.state.altitude === 0) {
            this.state.verticalVelocity = 0;
        }

        this.calculateAmbientConditions();
        this.calculateEngineParameters();
        this.calculateFuelSystemParameters();
        this.addNoise();
        this.logCurrentState();

        // Update all UI components
        this.updateDisplay();
        this.updateChartData(); // This was missing
        this.updateCharts();
        this.updateWarnings();
        this.updateSchematic();
        this.updateAIPrediction(); // Update AI prediction display
    }

    calculateAmbientConditions() {
        this.state.ambientPressure = 101325 * Math.pow(1 - this.state.altitude / 44330, 5.255);
        this.state.ambientTemperature = 15 - 0.0065 * this.state.altitude;
        this.state.airDensity = this.state.ambientPressure / (287.05 * (this.state.ambientTemperature + 273.15));
    }

    calculateEngineParameters() {
        this.state.engineLoad = Math.min(100, 1.667 * this.state.collectivePitch);
        this.state.throttle = this.state.engineLoad;
        const pressureDifferential = (101325 - this.state.ambientPressure) / 1000;
        this.state.engineRpm = this.specs.engineRpmBase - 0.02 * pressureDifferential;
        if (this.faults.rpmDrop) {
            this.state.engineRpm *= 0.93;
        }
    }

    calculateFuelSystemParameters() {
        this.state.fuelPressure = this.specs.baseFuelPressure + 0.1 * this.state.throttle;
        const baseFlow = (this.specs.baseFuelFlowAtMaxThrottle * this.state.throttle) / 100;
        const seaLevelDensity = 1.225;
        if (this.state.airDensity > 0) {
            this.state.fuelFlowRate = baseFlow * (seaLevelDensity / this.state.airDensity);
        } else {
            this.state.fuelFlowRate = 0;
        }
        if (this.state.throttle <= 0) {
            this.state.fuelFlowRate = 0;
        }

        const targetFuelTemperature = this.state.ambientTemperature + (this.specs.maxFuelTempIncrease * (this.state.throttle / 100));
        const tempDifference = targetFuelTemperature - this.state.fuelTemperature;
        this.state.fuelTemperature += tempDifference * this.specs.thermalDamping * this.timeStep;

        if (this.state.engineRpm > 0 && this.state.fuelFlowRate > 0) {
            const engineCycleTime = 120 / this.state.engineRpm;
            const fuelVolumePerCycle = this.state.fuelFlowRate / (3600 / engineCycleTime);
            const requiredPulseWidth = fuelVolumePerCycle / (this.state.fuelFlowRate / 3600);
            this.state.injectorDutyCycle = Math.min(100, (requiredPulseWidth / engineCycleTime) * 100);
        } else {
            this.state.injectorDutyCycle = 0;
        }

        if (this.faults.cloggedInjector) {
            this.state.fuelPressure *= 0.85;
            this.state.fuelFlowRate *= 0.80;
        }

        if (this.faults.fuelOverheat) {
            // When the overheat fault is active, the temperature will climb towards a high value
            // but will not increase uncontrollably. This simulates a runaway heating effect.
            // We add a small amount each time step and then cap it at 130.
            this.state.fuelTemperature += 2.5 * this.timeStep; // Increase temperature at a rate of 2.5 C per second
            this.state.fuelTemperature = Math.min(this.state.fuelTemperature, 130); // Cap at 130 C
        }
    }

    addNoise() {
        const noiseParams = {
            altitude: { mean: 0, std: 0.5 },
            fuelPressure: { mean: 0, std: 0.1 },
            engineRpm: { mean: 0, std: 0.2 },
            fuelFlowRate: { mean: 0, std: 0.1 },
            fuelTemperature: { mean: 0, std: 0.2 }
        };
        if (this.faults.sensorDrift) {
            const driftFactor = Math.sin(this.currentTime * 0.1) * 0.01;
            this.state.altitude += this.state.altitude * driftFactor;
            this.state.fuelPressure += this.state.fuelPressure * driftFactor;
            this.state.engineRpm += this.state.engineRpm * driftFactor;
        }

        Object.keys(noiseParams).forEach(param => {
            if (this.state[param] !== undefined) {
                const noise = this.gaussianRandom(noiseParams[param].mean, noiseParams[param].std);
                this.state[param] += noise;
            }
        });
    }

    gaussianRandom(mean, std) {
        const u = Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return z * std + mean;
    }

    updateChartData() {
        this.chartData.time.push(this.currentTime);
        this.chartData.altitude.push(this.state.altitude);
        this.chartData.fuelPressure.push(this.state.fuelPressure);
        this.chartData.engineRpm.push(this.state.engineRpm);
        this.chartData.fuelFlowRate.push(this.state.fuelFlowRate);
        this.chartData.fuelTemperature.push(this.state.fuelTemperature);

        if (this.chartData.time.length > this.maxDataPoints) {
            Object.keys(this.chartData).forEach(key => this.chartData[key].shift());
        }
    }

    updateCharts() {
        const update = (chart, data) => {
            const chartData = this.chartData.time.map((time, i) => ({ x: time, y: data[i] }));
            chart.data.datasets[0].data = chartData;
            chart.update('none');
        };
        update(this.altitudeChart, this.chartData.altitude);
        update(this.fuelPressureChart, this.chartData.fuelPressure);
        update(this.engineRpmChart, this.chartData.engineRpm);
        update(this.fuelFlowChart, this.chartData.fuelFlowRate);
        update(this.fuelTempChart, this.chartData.fuelTemperature);
    }

    updateDisplay() {
        document.getElementById('altitude').textContent = this.state.altitude.toFixed(1);
        document.getElementById('fuelPressure').textContent = this.state.fuelPressure.toFixed(1);
        document.getElementById('fuelTemperature').textContent = this.state.fuelTemperature.toFixed(1);
        document.getElementById('fuelFlowRate').textContent = this.state.fuelFlowRate.toFixed(1);
        document.getElementById('engineRPM').textContent = this.state.engineRpm.toFixed(1);
        document.getElementById('injectorDutyCycle').textContent = this.state.injectorDutyCycle.toFixed(1);
        document.getElementById('airDensity').textContent = this.state.airDensity.toFixed(3);
        document.getElementById('ambientTemperature').textContent = this.state.ambientTemperature.toFixed(1);
        document.getElementById('verticalVelocity').textContent = this.state.verticalVelocity.toFixed(1);
    }

    updateWarnings() {
        this.warnings.clear();
        const expectedPressure = 30 + 0.1 * this.state.throttle;
        if (this.faults.cloggedInjector || this.state.fuelPressure < expectedPressure - 2.5) {
            this.warnings.set('clogged_injector', {
                message: 'Clogged Injector',
                severity: 'critical',
                timestamp: new Date().toISOString()
            });
        }
        if (this.faults.fuelOverheat || this.state.fuelTemperature > 60) {
            this.warnings.set('fuel_overheat', {
                message: 'Fuel Overheat',
                severity: 'critical',
                timestamp: new Date().toISOString()
            });
        }
        if (this.faults.rpmDrop || this.state.engineRpm < 97) {
            this.rpmDropTimer += this.timeStep;
            if (this.rpmDropTimer > 3) {
                this.warnings.set('rpm_droop', {
                    message: 'RPM Droop',
                    severity: 'warning',
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            this.rpmDropTimer = 0;
        }
        if (this.faults.sensorDrift) {
            this.warnings.set('sensor_drift', {
                message: 'Sensor Drift Detected',
                severity: 'info',
                timestamp: new Date().toISOString()
            });
        }
        this.displayWarnings();
        this.updateSystemStatus();
    }

    displayWarnings() {
        const warningsList = document.getElementById('warningsList');
        warningsList.innerHTML = '';
        if (this.warnings.size === 0) {
            warningsList.innerHTML = '<div class="no-warnings">No active warnings</div>';
            return;
        }
        this.warnings.forEach((warning, key) => {
            const warningElement = document.createElement('div');
            warningElement.className = `warning-item ${warning.severity}`;
            warningElement.innerHTML = `
                <span class="warning-message">${warning.message}</span>
                <span class="warning-time">${new Date(warning.timestamp).toLocaleTimeString()}</span>
            `;
            warningsList.appendChild(warningElement);
        });
    }

    updateSystemStatus() {
        const statusIndicator = document.getElementById('systemStatus');
        const criticalWarnings = Array.from(this.warnings.values()).filter(w => w.severity === 'critical');
        const warningAlerts = Array.from(this.warnings.values()).filter(w => w.severity === 'warning');
        if (criticalWarnings.length > 0) {
            statusIndicator.textContent = 'CRITICAL';
            statusIndicator.className = 'status-indicator critical';
        } else if (warningAlerts.length > 0) {
            statusIndicator.textContent = 'WARNING';
            statusIndicator.className = 'status-indicator warning';
        } else {
            statusIndicator.textContent = 'SYSTEM NORMAL';
            statusIndicator.className = 'status-indicator';
        }
    }

    updateSchematic() {
        const components = document.querySelectorAll('.component');
        components.forEach(component => {
            const componentName = component.getAttribute('data-component');
            component.classList.remove('warning', 'critical', 'normal');
            component.classList.add('normal');
            if (this.warnings.has('clogged_injector') && (componentName === 'Fuel Filter' || componentName && componentName.includes('Injector'))) {
                component.classList.remove('normal');
                component.classList.add('critical');
            }
            if (this.warnings.has('fuel_overheat') && (componentName === 'Fuel Pump' || componentName === 'Fuel Manifold')) {
                component.classList.remove('normal');
                component.classList.add('critical');
            }
            if (this.warnings.has('rpm_droop') && componentName === 'FADEC Controller') {
                component.classList.remove('normal');
                component.classList.add('warning');
            }
        });
        const injectors = document.querySelectorAll('.injector');
        injectors.forEach(injector => {
            if (this.engineStarted && this.state.injectorDutyCycle > 0) {
                injector.classList.add('active');
            } else {
                injector.classList.remove('active');
            }
        });
    }

    addAlertLog(message, severity = 'info') {
        const timestamp = new Date().toISOString();
        this.alertLog.unshift({
            message,
            severity,
            timestamp
        });
        if (this.alertLog.length > 50) {
            this.alertLog.pop();
        }
        this.displayAlertLog();
    }

    displayAlertLog() {
        const alertsLog = document.getElementById('alertsLog');
        alertsLog.innerHTML = '';
        this.alertLog.forEach(alert => {
            const logEntry = document.createElement('div');
            logEntry.className = 'alert-log-entry';
            logEntry.innerHTML = `
                <div class="alert-timestamp">${new Date(alert.timestamp).toLocaleTimeString()}</div>
                <div class="alert-message">${alert.message}</div>
            `;
            alertsLog.appendChild(logEntry);
        });
    }

    // *** NEW: Method to update the AI Prediction panel ***
    updateAIPrediction() {
        const predictionContent = document.getElementById('aiPredictionContent');
        predictionContent.innerHTML = ''; // Clear previous content

        const activeFaults = Object.keys(this.faults).filter(key => this.faults[key]);

        if (activeFaults.length === 0) {
            predictionContent.innerHTML = '<p class="ai-prediction-nominal">No faults detected. System nominal.</p>';
            return;
        }

        activeFaults.forEach(faultKey => {
            const prediction = this.aiPredictions[faultKey];
            if (prediction) {
                const item = document.createElement('div');
                item.className = 'ai-prediction-item';
                item.innerHTML = `
                    <h4>${prediction.name}</h4>
                    <p><strong>Systems Affected:</strong> ${prediction.affectedSystems}</p>
                    <p><strong>Immediate Measures:</strong> ${prediction.immediateMeasures}</p>
                    <p><strong>Preferable Measures:</strong> ${prediction.preferableMeasures}</p>
                `;
                predictionContent.appendChild(item);
            }
        });
    }

    logCurrentState() {
        const logEntry = {
            timestamp: this.currentTime.toFixed(2),
            ...this.state,
            ...this.faults
        };
        delete logEntry.warnings;
        this.logData.push(logEntry);
    }

    downloadCSV() {
        if (this.logData.length === 0) {
            alert("No data to download. Run the simulation first.");
            return;
        }
        const headers = Object.keys(this.logData[0]);
        const csvRows = [headers.join(',')];
        this.logData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                const formattedValue = typeof value === 'number' ? value.toFixed(4) : value;
                const escaped = ('' + formattedValue).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.setAttribute('href', url);
            link.setAttribute('download', `simulation_log_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Initialize the simulation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulation = new HelicopterSimulation();
    window.helicopterSimulation = simulation; // Make it globally accessible for debugging

    // --- NEW AND UPDATED ANIMATION LOGIC ---
    const fuelFlowRateEl = document.getElementById('fuelFlowRate');
    const fuelTemperatureEl = document.getElementById('fuelTemperature');
    const overheatCheckbox = document.getElementById('injectOverheat');

    const mainGlobulesContainer = document.getElementById('fuel-globules-container');
    const bypassGlobulesContainer = document.getElementById('bypass-globules-container');
    const numGlobules = 20;

    // Function to create globules for a given path and container
    function createGlobulesForPath(container, pathId, isOverheat) {
        for (let i = 0; i < numGlobules; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('r', '3');
            circle.setAttribute('class', isOverheat ? 'fuel-globule overheat' : 'fuel-globule');
            
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
            animate.setAttribute('repeatCount', 'indefinite');
            animate.setAttribute('begin', `${i * 0.2}s`); // Stagger animation start
            
            const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
            mpath.setAttribute('href', `#${pathId}`);
            
            animate.appendChild(mpath);
            circle.appendChild(animate);
            container.appendChild(circle);
        }
    }

    // Central function to control which animation is visible
    function updateFuelAnimation() {
        if (!fuelFlowRateEl || !fuelTemperatureEl || !overheatCheckbox) return;

        const flowRate = parseFloat(fuelFlowRateEl.textContent);
        const temperature = parseFloat(fuelTemperatureEl.textContent);
        const isOverheating = overheatCheckbox.checked;

        const showBypass = isOverheating && temperature >= 100;

        if (showBypass) {
            mainGlobulesContainer.style.display = 'none';
            bypassGlobulesContainer.style.display = 'block';
        } else {
            mainGlobulesContainer.style.display = 'block';
            bypassGlobulesContainer.style.display = 'none';
        }

        // Update animation speed for the visible path
        const activeContainer = showBypass ? bypassGlobulesContainer : mainGlobulesContainer;
        const animators = activeContainer.querySelectorAll('animateMotion');

        if (isNaN(flowRate) || flowRate <= 0.1) {
            activeContainer.style.display = 'none';
            return;
        }
        
        const duration = Math.max(0.5, 600 / flowRate); 
        animators.forEach(anim => {
            anim.setAttribute('dur', `${duration}s`);
        });
    }

    // Create globules for both paths
    createGlobulesForPath(mainGlobulesContainer, 'path-main-continuous', false);
    createGlobulesForPath(bypassGlobulesContainer, 'path-bypass-return', true);

    // Observers to automatically update animation when values change
    const observer = new MutationObserver(updateFuelAnimation);
    if (fuelFlowRateEl) observer.observe(fuelFlowRateEl, { childList: true, characterData: true });
    if (fuelTemperatureEl) observer.observe(fuelTemperatureEl, { childList: true, characterData: true });

    // Also listen for changes on the checkbox itself
    if(overheatCheckbox) {
        overheatCheckbox.addEventListener('change', updateFuelAnimation);
    }

    // Initial call to set the correct state
    updateFuelAnimation();
});
