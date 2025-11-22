import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function PlantDetail({ plant, onBack }) {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filters
  const [selectedMetric, setSelectedMetric] = useState("carbon");
  const [timeRange, setTimeRange] = useState("all");
  const [dataInterval, setDataInterval] = useState("5min");

  const metrics = [
    { value: "carbon", label: "Carbon (ppm)", color: "#22c55e" },
    { value: "temperature", label: "Air Temperature (°C)", color: "#ef4444" },
    { value: "humidity", label: "Air Humidity (%)", color: "#3b82f6" },
    { value: "lightIntensity", label: "Light Intensity", color: "#f59e0b" },
    { value: "lux", label: "Lux", color: "#fbbf24" },
    { value: "DI_0", label: "DI_0", color: "#a855f7" },
    { value: "DI_1", label: "DI_1", color: "#ec4899" },
    { value: "DI_2", label: "DI_2", color: "#8b5cf6" },
  ];

  const intervalOptions = [
    { value: "raw", label: "Raw (30s)", description: "Most detailed" },
    { value: "1min", label: "1 Minute", description: "High detail" },
    { value: "5min", label: "5 Minutes", description: "Balanced" },
    { value: "15min", label: "15 Minutes", description: "Overview" },
    { value: "30min", label: "30 Minutes", description: "Summary" },
    { value: "1hour", label: "1 Hour", description: "Low detail" },
  ];

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Determine limit based on interval
        const limitMap = {
          "raw": 500,
          "1min": 500,
          "5min": 500,
          "15min": 500,
          "30min": 500,
          "1hour": 500
        };
        
        const limit = limitMap[dataInterval] || 500;
        
        const response = await fetch(
          `http://127.0.0.1:8000/carbon/co2/all?limit=${limit}&interval=${dataInterval}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        
        // Transform API data to our format
        const transformedData = data.map(item => ({
          timestamp: item.timestamp,
          carbon: item["COM_1 Wd_0"] || 0,
          temperature: (item["COM_1 Wd_1"] || 0) / 100,
          humidity: (item["COM_1 Wd_2"] || 0) / 100,
          lightIntensity: item["COM_1 Wd_4"] || 0,
          lux: item["COM_1 Wd_6"] || 0,
          DI_0: item.DI_0 || 0,
          DI_1: item.DI_1 || 0,
          DI_2: item.DI_2 || 0,
        }));
        
        setSensorData(transformedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [dataInterval]); // Re-fetch when interval changes

  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Filter data by time range
  const filterDataByTime = (data) => {
    if (timeRange === "all") return data;
    
    const now = new Date();
    const filtered = data.filter(item => {
      const itemDate = new Date(item.timestamp);
      const hoursDiff = (now - itemDate) / (1000 * 60 * 60);
      
      if (timeRange === "1h") return hoursDiff <= 1;
      if (timeRange === "6h") return hoursDiff <= 6;
      if (timeRange === "24h") return hoursDiff <= 24;
      return true;
    });
    
    return filtered.length > 0 ? filtered : data;
  };

  // Format data for chart
  const currentMetric = metrics.find(m => m.value === selectedMetric);
  const filteredData = filterDataByTime(sensorData);
  
  const chartData = filteredData.map(item => ({
    time: formatTime(item.timestamp),
    value: item[selectedMetric],
    fullTimestamp: item.timestamp
  }));

  // Get latest value
  const latestData = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-6xl">
        <button 
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          ← Back to Plants
        </button>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-xl mt-4">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-6xl">
        <button 
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          ← Back to Plants
        </button>
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800 font-semibold">Error loading data</p>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <button 
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
      >
        ← Back to Plants
      </button>
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Top Section */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left Column - Image and Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{plant.name}</h1>
            <p className="text-gray-600 italic mb-6">{plant.species}</p>
            
            <img 
              src={plant.image} 
              alt={plant.name}
              className="w-64 h-64 object-contain mx-auto mb-4"
            />
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-3">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-blue-900">Plant Information</p>
              <p className="text-sm text-blue-700">Static and real-time data</p>
            </div>

            <div>
              <p className="text-gray-700"><span className="font-semibold">Age:</span> 6 months</p>
              <p className="text-gray-700"><span className="font-semibold">Health:</span> {plant.health}</p>
              <p className="text-gray-700"><span className="font-semibold">Last Watered:</span> {plant.water}</p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-gray-700 font-semibold mb-3">(Latest sensor readings)</p>
              {latestData ? (
                <>
                  <p className="text-gray-700"><span className="font-semibold">Carbon:</span> {latestData.carbon} ppm</p>
                  <p className="text-gray-700"><span className="font-semibold">Air Temperature:</span> {latestData.temperature.toFixed(1)}°C</p>
                  <p className="text-gray-700"><span className="font-semibold">Air Humidity:</span> {latestData.humidity.toFixed(1)}%</p>
                  <p className="text-gray-700"><span className="font-semibold">Light Intensity:</span> {latestData.lightIntensity}</p>
                  <p className="text-gray-700"><span className="font-semibold">Lux:</span> {latestData.lux}</p>
                  <p className="text-xs text-gray-500 mt-2">Last updated: {new Date(latestData.timestamp).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Graph Section */}
        <div className="border-t pt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Sensor Data Over Time</h2>
            
            {/* Controls */}
            <div className="flex gap-4">
              {/* Data Interval Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Detail
                </label>
                <select
                  value={dataInterval}
                  onChange={(e) => setDataInterval(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {intervalOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {metrics.map(metric => (
                    <option key={metric.value} value={metric.value}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1h">Last 1 Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="all">All Data</option>
                </select>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-700">
              <span className="font-semibold">Showing:</span> {chartData.length} data points at {intervalOptions.find(o => o.value === dataInterval)?.label} intervals
            </p>
          </div>
          
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: currentMetric.label, angle: -90, position: 'insideLeft' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-300 rounded shadow">
                          <p className="text-sm">{payload[0].payload.fullTimestamp}</p>
                          <p className="text-sm font-semibold" style={{ color: currentMetric.color }}>
                            {currentMetric.label}: {payload[0].value.toFixed(2)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={currentMetric.label}
                  stroke={currentMetric.color}
                  strokeWidth={2}
                  dot={dataInterval === "raw" || dataInterval === "1min" ? { r: 2 } : { r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Current</p>
                <p className="text-2xl font-bold text-gray-900">
                  {chartData[chartData.length - 1]?.value.toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Min</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.min(...chartData.map(d => d.value)).toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Max</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(...chartData.map(d => d.value)).toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlantDetail;