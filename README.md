# HAL LUH(light Utility helicopter) - Fuel Injection System Digital Twin

This project is an interactive, browser-based digital twin simulating the fuel injection system of a HAL LUH helicopter. It provides a real-time visualization of the system's parameters, flight dynamics, and responses to various fault conditions. The entire simulation runs on the client-side using vanilla JavaScript, HTML, and CSS.
**PREVIEW**
<img width="1253" height="839" alt="image" src="https://github.com/user-attachments/assets/a43265e9-0cc1-4873-8630-6906e60d7b35" />

<img width="1055" height="889" alt="image" src="https://github.com/user-attachments/assets/48b258b1-e3d8-4bf8-b947-96a9e4f93346" />

## Features

* **Real-time Physics Simulation:** The core of the digital twin is a JavaScript-based simulation that models flight dynamics, engine parameters, and fuel system behavior at a rate of 10 Hz.
* **Interactive Controls:** Users can directly control the helicopter's flight by adjusting the **Collective Pitch** and observe the immediate effects on all system parameters.
* **Comprehensive Data Visualization:**
    * **Live Graphs:** Five real-time charts dynamically display key metrics such as Altitude, Fuel Pressure, Engine RPM, Fuel Flow Rate, and Fuel Temperature.
    * **2D System Schematic:** An interactive SVG schematic shows the status of each component in the fuel system, with visual cues for active states and faults.
    * **3D System View:** A 3D representation of the fuel system components, built with Three.js, allows for interactive exploration.
* **Advanced Fault Injection System:**
    * Manually inject faults like **Clogged Injectors**, **Fuel Overheat**, **RPM Droop**, and **Sensor Drift** to study system resilience and behavior under stress.
* **Audible & Visual Warning System:** The simulation includes a master warning system with audible voice alerts ("Warning, Warning...") and visual indicators for active faults.
* **AI-Powered Predictive Analysis :** When a fault is injected, a dedicated panel provides a detailed analysis, including:
    * Faults Detected
    * Fault Location / Systems Affected
    * Immediate Corrective Measures
    * Preferable Long-term Measures
* **Data Logging:** All simulation parameters can be recorded and downloaded as a `.csv` file for offline analysis and record-keeping.

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6 Classes)
* **Charting:** [Chart.js](https://www.chartjs.org/) for real-time data visualization.
* **3D Graphics:** [Three.js](https://threejs.org/) for the interactive 3D schematic.

## Project Structure

The project is entirely client-side and requires no backend or build steps.


/
├── index.html      # The main HTML file for the dashboard UI
├── style.css       # All styling for the application
└── app.js          # Core JavaScript file containing the entire simulation logic
/
└── mlbackend(not required for running the project, it was used to simulate the noise factor to mimic real world scenario)


## How to Run

This project is designed to run directly in any modern web browser.

1.  Clone or download the repository to your local machine.
2.  Navigate to the project folder in any IDE.
3.  Open the `index.html` file and run using Live-Server(VS code extension).

The digital twin dashboard will open and be fully functional.

## How to Use the Simulation

1.  **Start the Engine:** Click the `START ENGINE` button to begin the simulation.
2.  **Control Flight:** Use the **Collective Pitch** slider to increase or decrease engine power, which will affect the helicopter's altitude.
3.  **Monitor Parameters:** Observe the real-time data on the digital readouts and the live graphs.
4.  **Inject Faults:** In the "Warnings & Alerts" panel, check any of the boxes under "Fault Injection" to introduce a fault.
5.  **Observe Predictions:** When a fault is active, view the "AI Prediction" panel for a detailed breakdown and recommended actions.
6.  **Download Data:** At any point, click the `DOWNLOAD LOG` button to save a CSV file of the simulation data up to that moment.
7.  **Control the Simulation:** Use the `PAUSE`, `PLAY`, and `RESET` buttons to control the simulation's state.
