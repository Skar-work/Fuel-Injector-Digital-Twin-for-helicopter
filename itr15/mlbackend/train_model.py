import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier  # Import RandomForest
from sklearn.metrics import mean_squared_error, classification_report
import joblib
import numpy as np

# --- 1. Load Data ---
print("Loading data...")
try:
    df = pd.read_csv('synthetic_helicopter_data.csv')
    print(f"Data loaded successfully. Shape: {df.shape}")
except FileNotFoundError:
    print("Error: synthetic_helicopter_data.csv not found. Please run generate_data.py first.")
    exit()

# --- 2. Feature Engineering ---
print("\nCreating new features (deltas and rolling averages)...")
df['fuel_pressure_delta'] = df['fuel_pressure_real'].diff().fillna(0)
df['engine_rpm_delta'] = df['engine_rpm_real'].diff().fillna(0)
df['throttle_delta'] = df['throttle_real'].diff().fillna(0)
window_size = 50  # 50 steps = 5 seconds
df['rpm_rolling_avg'] = df['engine_rpm_real'].rolling(window=window_size).mean().fillna(method='bfill')
df['pressure_rolling_avg'] = df['fuel_pressure_real'].rolling(window=window_size).mean().fillna(method='bfill')
print("Feature engineering complete.")

# --- 3. Define Features and Targets ---
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
print("\nFeatures (X) defined:\n", features)

# --- 4. Split Data and Scale ---
print("\nSplitting and scaling data...")
X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=42, stratify=Y[diagnostic_targets + prognostic_targets])
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
joblib.dump(scaler, 'scaler.pkl')
print("Data split and scaler saved as scaler.pkl")

# --- 5. Train and Evaluate Regression Model ---
print("\n--- Training Regression Model ---")
regression_model = LinearRegression()
regression_model.fit(X_train_scaled, Y_train[regression_targets])
joblib.dump(regression_model, 'regression_model.pkl')
predictions = regression_model.predict(X_test_scaled)
rmse = np.sqrt(mean_squared_error(Y_test[regression_targets], predictions, multioutput='raw_values'))
print("Regression Model Evaluation (RMSE on Test Set):")
for i, col in enumerate(regression_targets):
    print(f"  {col}: {rmse[i]:.4f}")

# --- 6. Train and Evaluate Diagnostic Models (Is a fault happening NOW?) ---
print("\n--- Training Diagnostic Models (Is a fault happening NOW?) ---")
for fault_type in diagnostic_targets:
    print(f"\n  Training classifier for: {fault_type}")
    classifier = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced', n_jobs=-1)
    classifier.fit(X_train_scaled, Y_train[fault_type])
    model_filename = f'classifier_{fault_type}.pkl'
    joblib.dump(classifier, model_filename)
    print(f"  Classifier for {fault_type} saved.")
    predictions = classifier.predict(X_test_scaled)
    print(classification_report(Y_test[fault_type], predictions))

# --- 7. Train and Evaluate Prognostic Models (Is a fault happening SOON?) ---
if prognostic_targets:
    print("\n--- Training Prognostic Models (Is a fault happening SOON?) ---")
    for fault_type in prognostic_targets:
        print(f"\n  Training predictive classifier for: {fault_type}")
        if Y_train[fault_type].sum() < 2:
            print(f"  Skipping {fault_type}: Not enough samples.")
            continue
        prognostic_classifier = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced', n_jobs=-1)
        prognostic_classifier.fit(X_train_scaled, Y_train[fault_type])
        model_filename = f'classifier_{fault_type}.pkl'
        joblib.dump(prognostic_classifier, model_filename)
        print(f"  Predictive classifier for {fault_type} saved.")
        predictions = prognostic_classifier.predict(X_test_scaled)
        print(classification_report(Y_test[fault_type], predictions))

print("\n--- All model training complete ---")