import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Wind, Calendar, RefreshCw, AlertCircle, CheckCircle, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PollutionPlotsDashboard = () => {
  const { logout, token } = useAuth();
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensors, setSensors] = useState([]); // ← Start empty
  const [sensorsLoading, setSensorsLoading] = useState(true);
  const [sensorReadings, setSensorReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [showCO2, setShowCO2] = useState(true);
  const [showTemp, setShowTemp] = useState(true);

  // Fetch user's sensors on mount
  useEffect(() => {
    const fetchUserSensors = async () => {
      setSensorsLoading(true);
      setError(null);
      
      try {
        // BACKEND API CALL:
        const response = await fetch('http://localhost:3000/sensors', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        switch (response.status) {
          case 200:
            // Success
            //if (response.ok && data.body && Array.isArray(data.body)) {
            setSensors(data.body);

            // Auto-select first sensor
            if (data.body.length > 0) {
              setSelectedSensor(data.body[0].id);
            }
            break;

          case 401:
            // Unauthorized - token expired or invalid
            setError('Session expired. Please log in again.');
            setTimeout(() => logout(), 2000);
            break;

          case 500:
            // Server error
            setError(data.error_msg || 'Server error. Please try again later.');
            break;

          default:
            setError(`Error: ${response.status} - ${data.error_msg || 'Unknown error'}`);
        }
      
      } catch (err) {
        console.error('Error fetching sensors:', err);
      } finally {
        setSensorsLoading(false);
      }
    };

    fetchUserSensors();
  }, [token, logout]);

  // Fetch readings when sensor or time range changes
  useEffect(() => {
    if (selectedSensor) {
      fetchSensorReadings(selectedSensor);
    }
  }, [selectedSensor, timeRange]);

  // Fetch sensor readings from backend
  const fetchSensorReadings = async (sensorId) => {
    setLoading(true);
    setError(null);
    
    try {
      // BACKEND API CALL:
      const response = await fetch(`http://localhost:3000/sensors/${sensorId}/readings?range=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      switch (response.status) {
        case 200:
          // Success
          setSensorReadings(data.body);
          break;

        case 401:
          // Unauthorized - token expired or invalid
          setError('Session expired. Please log in again.');
          setTimeout(() => logout(), 2000);
          break;

        case 403:
          // Forbidden - user doesn't own this resource
          setError(data.error_msg || 'You do not have permission to access this resource');
          break;

        case 409:
          // Conflicts - resource already exists
          setError(data.error_msg || 'Resource already exists');
          break;

        case 500:
          // Server error
          setError(data.error_msg || 'Server error. Please try again later.');
          break;

        default:
          setError(`Error: ${response.status} - ${data.error_msg || 'Unknown error'}`);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sensorsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Your Sensors</h3>
          <p className="text-slate-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <Wind className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Sensors Found</h2>
          <p className="text-slate-600 mb-6">
            You don't have any pollution sensors registered yet.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-left mb-6">
            <p className="font-semibold mb-2">📝 To get started:</p>
            <ul className="space-y-1 ml-4">
              <li>• Contact your administrator to register sensors</li>
              <li>• Sensors will appear here once assigned to your account</li>
            </ul>
          </div>
          <button 
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Format data for charts
  const chartData = sensorReadings.map(reading => ({
    timestamp: new Date(reading.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    co2: parseFloat(reading.co2.toFixed(2)),
    temperature: parseFloat(reading.temperature.toFixed(2)),
    fullDate: new Date(reading.timestamp).toLocaleString()
  }));

  // Calculate statistics
  const stats = {
    avgCO2: (sensorReadings.reduce((sum, r) => sum + r.co2, 0) / sensorReadings.length || 0).toFixed(2),
    maxCO2: Math.max(...sensorReadings.map(r => r.co2), 0).toFixed(2),
    avgTemp: (sensorReadings.reduce((sum, r) => sum + r.temperature, 0) / sensorReadings.length || 0).toFixed(2),
    maxTemp: Math.max(...sensorReadings.map(r => r.temperature), 0).toFixed(2),
    totalReadings: sensorReadings.length
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{payload[0].payload.fullDate}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.value} {entry.name === 'CO₂' ? 'ppm' : '°C'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const currentSensor = sensors.find(s => s.id === selectedSensor);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">My Plots</h1>
          <p className="text-slate-600">Monitor pollution levels from your sensors</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            
            {/* Sensor Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Sensor
              </label>
              <select
                value={selectedSensor}
                onChange={(e) => setSelectedSensor(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sensors.map(sensor => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.name} - {sensor.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={() => fetchSensorReadings(selectedSensor)}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {/* Display Toggles */}
          <div className="mt-4 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCO2}
                onChange={(e) => setShowCO2(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Show CO₂</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTemp}
                onChange={(e) => setShowTemp(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-slate-700">Show Temperature</span>
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-semibold">Error Loading Data</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {!loading && !error && sensorReadings.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Wind}
              label="Avg CO₂"
              value={`${stats.avgCO2} ppm`}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              label="Peak CO₂"
              value={`${stats.maxCO2} ppm`}
              color="red"
            />
            <StatCard
              icon={Thermometer}
              label="Avg Temperature"
              value={`${stats.avgTemp} °C`}
              color="orange"
            />
            <StatCard
              icon={Calendar}
              label="Total Readings"
              value={stats.totalReadings}
              color="green"
            />
          </div>
        )}

        {/* Charts */}
        {!loading && !error && sensorReadings.length > 0 && (
          <>
            {/* CO2 Chart */}
            {showCO2 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Wind className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-800">CO₂ Levels</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-slate-600">Blockchain Verified</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'CO₂ (ppm)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="co2" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      name="CO₂"
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Temperature Chart */}
            {showTemp && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Thermometer className="w-6 h-6 text-orange-600" />
                    <h2 className="text-xl font-bold text-slate-800">Temperature</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-slate-600">Blockchain Verified</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ fill: '#f97316', r: 3 }}
                      name="Temperature"
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && sensorReadings.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Data Available</h3>
            <p className="text-slate-600">No sensor readings found for the selected time range.</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Data</h3>
            <p className="text-slate-600">Fetching sensor readings from {currentSensor.name}...</p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Current Sensor:</strong> {currentSensor.name} ({currentSensor.location})
            <br />
            <strong>Last Updated:</strong> {sensorReadings.length > 0 ? new Date(sensorReadings[sensorReadings.length - 1].timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className={`${colorMap[color]} border rounded-lg p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default PollutionPlotsDashboard;
