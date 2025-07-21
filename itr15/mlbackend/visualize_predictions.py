import pandas as pd
import joblib
import matplotlib.pyplot as plt
import numpy as np
from sklearn.model_selection import train_test_split

# --- Configuration ---
# The number of data points from the test set to plot.
SAMPLES_TO_PLOT = 200

# --- Set a cleaner plot style ---
plt.style.use('seaborn-v0_8-whitegrid')

# --- 1. Load Pre-trained Models and Scaler ---
print("Loading pre-trained models and scaler...")
try:
    regression_model = joblib.load('regression_model.pkl')
    scaler = joblib.load('scaler.pkl')
    print("Models and scaler loaded successfully.")
except FileNotFoundError as e:
    print(f"Error: Could not find a required model file: {e.filename}")
    print("Please make sure you have run the training script first to generate the .pkl files.")
    exit()

# --- 2. Load and Prepare Data ---
print("\nLoading and preparing test data...")
try:
    df = pd.read_csv('synthetic_helicopter_data.csv')
    print("Dataset loaded.")
except FileNotFoundError:
    print("Error: synthetic_helicopter_data.csv not found.")
    exit()

# Perform the same feature engineering to match the training process
df['fuel_pressure_delta'] = df['fuel_pressure_real'].diff().fillna(0)
df['engine_rpm_delta'] = df['engine_rpm_real'].diff().fillna(0)
df['throttle_delta'] = df['throttle_real'].diff().fillna(0)
window_size = 50
df['rpm_rolling_avg'] = df['engine_rpm_real'].rolling(window=window_size).mean().bfill()
df['pressure_rolling_avg'] = df['fuel_pressure_real'].rolling(window=window_size).mean().bfill()
print("Feature engineering complete.")

# Define the same features and targets
features = [
    'collective_pitch_real', 'altitude_real', 'ambient_pressure_real', 'ambient_temp_real',
    'air_density_real', 'engine_load_real', 'throttle_real', 'engine_rpm_real',
    'fuel_pressure_delta', 'engine_rpm_delta', 'throttle_delta',
    'rpm_rolling_avg', 'pressure_rolling_avg'
]
regression_targets = ['fuel_pressure_real', 'fuel_temperature_real', 'fuel_flow_rate_real', 'injector_duty_cycle_real']
diagnostic_targets = ['is_clogged_injector', 'is_fuel_overheat', 'is_rpm_droop', 'is_sensor_drift']
prognostic_targets = [col for col in df.columns if col.startswith('impending_')]

X = df[features]
Y = df[regression_targets + diagnostic_targets + prognostic_targets]

# Split the data to get the identical test set
_, X_test, _, Y_test = train_test_split(
    X, Y, test_size=0.2, random_state=42, stratify=Y[diagnostic_targets + prognostic_targets]
)
print("Test data prepared.")


# --- 3. Make Predictions ---
print("\nMaking predictions on the test set...")
X_test_scaled = scaler.transform(X_test)
predicted_values = regression_model.predict(X_test_scaled)
predicted_df = pd.DataFrame(predicted_values, columns=regression_targets, index=Y_test.index)
print("Prediction complete.")


# --- 4. Plotting the Results ---
print("\nGenerating plots...")

# ** FIX: Sort the results by index to get a clean, chronological plot **
Y_test = Y_test.sort_index()
predicted_df = predicted_df.sort_index()

# Limit the data for plotting to keep the visualization clear
Y_test_subset = Y_test.head(SAMPLES_TO_PLOT)
predicted_df_subset = predicted_df.head(SAMPLES_TO_PLOT)

# Create subplots
fig, axes = plt.subplots(2, 2, figsize=(18, 10))
fig.suptitle('Model Predictions vs. Actual Values (First 200 Samples)', fontsize=20)
axes = axes.flatten()

for i, target in enumerate(regression_targets):
    ax = axes[i]
    
    # Plot the actual values from the dataset
    ax.plot(Y_test_subset.index, Y_test_subset[target], label='Actual Value', color='dodgerblue', linewidth=2.5, alpha=0.8)
    
    # Plot the values predicted by the model
    ax.plot(predicted_df_subset.index, predicted_df_subset[target], label='Predicted Value', color='red', linestyle='--', linewidth=2)
    
    ax.set_title(target.replace('_', ' ').title(), fontsize=14)
    ax.set_xlabel('Sample Index')
    ax.set_ylabel('Value')
    ax.legend()
    # No need for a grid with the new style, but you can add it back with ax.grid(True)

# Adjust layout and display the plot
plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.show()
print("\nPlot displayed. Close the plot window to exit the script.")
