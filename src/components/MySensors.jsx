import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ExternalLink, Shield, CheckCircle, MapPin, Calendar, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MySensorsPage = () => {
  const { token, logout } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [readings, setSensorReadings] = useState([]);
  const [sensorsLoading, setSensorsLoading] = useState(true);
  const [readingsLoading, setReadingsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const readingsPerPage = 10;

  // Fetch user's sensors on mount
  useEffect(() => {
    const fetchSensors = async () => {
      setSensorsLoading(true);
      setError(null);

      try {
        const response = await fetch('http://localhost:3000/sensors', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        switch (response.status) {
          case 200:
            setSensors(data.body);
            if (data.body.length > 0) {
              setSelectedSensor(data.body[0].id);
            }
            break;

          case 401:
            setError('Session expired. Please log in again.');
            setTimeout(() => logout(), 2000);
            break;

          case 500:
            setError(data.error_msg || 'Server error. Please try again later.');
            break;

          default:
            setError(`Error: ${response.status} - ${data.error_msg || 'Unknown error'}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSensorsLoading(false);
      }
    };

    fetchSensors();
  }, [token, logout]);

  // Fetch readings when sensor changes
  useEffect(() => {
    if (selectedSensor) {
      fetchReadings(selectedSensor);
      setCurrentPage(1); // Reset to first page when changing sensors
    }
  }, [selectedSensor]);

  const fetchReadings = async (sensorId) => {
    setReadingsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3000/sensors/${sensorId}/readings?range=30d`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      switch (response.status) {
        case 200:
          setSensorReadings(data.body);
          break;

        case 401:
          setError('Session expired. Please log in again.');
          setTimeout(() => logout(), 2000);
          break;

        case 403:
          setError(data.error_msg || 'You do not have permission to access this resource');
          break;

        case 409:
          setError(data.error_msg || 'Resource already exists');
          break;

        case 500:
          setError(data.error_msg || 'Server error. Please try again later.');
          break;

        default:
          setError(`Error: ${response.status} - ${data.error_msg || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReadingsLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(readings.length / readingsPerPage);
  const indexOfLastReading = currentPage * readingsPerPage;
  const indexOfFirstReading = indexOfLastReading - readingsPerPage;
  const currentReadings = readings.slice(indexOfFirstReading, indexOfLastReading);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Get current sensor object
  const currentSensor = sensors.find(s => s.id === selectedSensor);

  if (sensorsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-800">Loading sensors...</h3>
        </div>
      </div>
    );
  }

  if (sensors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Sensors Found</h2>
          <p className="text-slate-600">You don't have any sensors registered yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">My Sensors</h1>
          <p className="text-slate-600">View and manage your pollution monitoring sensors</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Sensors List (Left Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Your Sensors
              </h2>
              <div className="space-y-3">
                {sensors.map((sensor) => (
                  <button
                    key={sensor.id}
                    onClick={() => setSelectedSensor(sensor.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedSensor === sensor.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-800">{sensor.name}</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {sensor.location}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Readings Table (Main Content) */}
          <div className="lg:col-span-2">
            {currentSensor && (
              <div className="bg-white rounded-lg shadow-md">
                {/* Sensor Info Header */}
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentSensor.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {currentSensor.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {readings.length} total readings
                    </span>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                {/* Loading State */}
                {readingsLoading && (
                  <div className="p-12 text-center">
                    <Loader className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-600">Loading readings...</p>
                  </div>
                )}

                {/* Readings Table */}
                {!readingsLoading && !error && readings.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              CO₂ (ppm)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Temp (°C)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                              Blockchain
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentReadings.map((reading) => (
                            <ReadingRow key={reading.id} reading={reading} />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Showing {indexOfFirstReading + 1}-{Math.min(indexOfLastReading, readings.length)} of {readings.length} readings
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          
                          {/* Page Numbers */}
                          <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, index) => {
                              const pageNum = index + 1;
                              // Show first page, last page, current page, and pages around current
                              if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => goToPage(pageNum)}
                                    className={`px-3 py-1 rounded-lg transition-colors ${
                                      currentPage === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                              ) {
                                return <span key={pageNum} className="px-2">...</span>;
                              }
                              return null;
                            })}
                          </div>

                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Empty State */}
                {!readingsLoading && !error && readings.length === 0 && (
                  <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-slate-600">No readings found for this sensor</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReadingRow = ({ reading }) => {
  const hasBlockchainProof = reading.tx_signature && reading.tx_signature.trim() !== '';
  
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-slate-800">
          {new Date(reading.timestamp).toLocaleDateString()}
        </div>
        <div className="text-xs text-slate-500">
          {new Date(reading.timestamp).toLocaleTimeString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-slate-800">
          {reading.co2.toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-slate-800">
          {reading.temperature.toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4">
        {hasBlockchainProof ? (
          <a
            href={`https://explorer.solana.com/tx/${reading.tx_signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            Verified
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
            <Shield className="w-4 h-4" />
            Pending
          </span>
        )}
      </td>
    </tr>
  );
};

export default MySensorsPage;