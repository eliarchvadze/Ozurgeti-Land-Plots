import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet'
import L from 'leaflet'
import * as shp from 'shpjs'
import { Ruler, Map as MapIcon, Moon, Sun, Search, Layers, ChevronRight, ChevronLeft } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'
import './App.css'

const DEFAULT_CENTER = [41.92, 42.00]
const DEFAULT_ZOOM = 11

// --- Components ---

function MapController({ bounds, theme, isSatellite, isMeasuring, onMeasureChange }) {
  const map = useMap()

  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50], duration: 1.5 })
  }, [bounds, map])

  // Geoman setup for measurement
  useEffect(() => {
    if (!map.pm) return

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawPolyline: true,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      drawCircleMarker: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    })

    // Listen for measurement end or tool selection to update UI state
    const handleToolChange = (e) => {
      if (!e.active) onMeasureChange(false)
    }

    map.on('pm:globaldrawmodetoggled', handleToolChange)
    
    // Custom styling for measurements
    map.pm.setPathOptions({
      color: theme === 'dark' ? '#ffcc00' : '#3b82f6',
      fillColor: theme === 'dark' ? '#ffcc00' : '#3b82f6',
      fillOpacity: 0.2,
    })

    return () => {
      map.off('pm:globaldrawmodetoggled', handleToolChange)
    }
  }, [map, theme, onMeasureChange])

  // Toggle Geoman via external button
  useEffect(() => {
    if (isMeasuring) {
      map.pm.enableDraw('Polyline', { finishOn: 'dblclick' })
    } else {
      map.pm.disableDraw()
    }
  }, [isMeasuring, map])

  return null
}

export default function App() {
  const [geoJsonData, setGeoJsonData] = useState(null)
  const [oldNakvetiData, setOldNakvetiData] = useState(null)
  const [newNakvetiData, setNewNakvetiData] = useState(null)
  
  // New Ownership Layers
  const [state2026, setState2026] = useState(null)
  const [muni2026, setMuni2026] = useState(null)
  const [relig2026, setRelig2026] = useState(null)
  const [state2024, setState2024] = useState(null)
  const [muni2024, setMuni2024] = useState(null)
  const [relig2024, setRelig2024] = useState(null)

  const [mapBounds, setMapBounds] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [isSatellite, setIsSatellite] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [layers, setLayers] = useState({
    projectArea: true,
    plots2024: true,
    plots2026: true,
    state2026: false,
    muni2026: false,
    relig2026: false,
    state2024: false,
    muni2024: false,
    relig2024: false
  })

  const slideLayerSets = [
    // Slide 1: Land Plots overview
    { projectArea: true, plots2024: true, plots2026: true, state2026: false, muni2026: false, relig2026: false, state2024: false, muni2024: false, relig2024: false },
    // Slide 2: Ownership breakdown
    { projectArea: true, plots2024: false, plots2026: false, state2026: true, muni2026: true, relig2026: true, state2024: true, muni2024: true, relig2024: true }
  ]

  const slides = [
    { id: 1, name: 'Land Plots Overview' },
    { id: 2, name: 'Ownership Breakdown' }
  ]

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchShapefile = async (baseUrl) => {
          const [shpRes, dbfRes, prjRes] = await Promise.all([
            fetch(`${baseUrl}.shp`),
            fetch(`${baseUrl}.dbf`),
            fetch(`${baseUrl}.prj`)
          ])
          if (!shpRes.ok || !dbfRes.ok) throw new Error(`Failed to fetch ${baseUrl}`)
          const [shpBuffer, dbfBuffer, prjString] = await Promise.all([
            shpRes.arrayBuffer(),
            dbfRes.arrayBuffer(),
            prjRes.text()
          ])
          return shp.combine([shp.parseShp(shpBuffer, prjString), shp.parseDbf(dbfBuffer)])
        }

        // 1. Load Core Layers
        const areaData = await shp.default('/data/ozurgeti_sakvlevi_areali.zip')
        setGeoJsonData(areaData)
        setMapBounds(L.geoJSON(areaData).getBounds())

        setOldNakvetiData(await fetchShapefile('/data/OLD_nakveti'))
        setNewNakvetiData(await fetchShapefile('/data/New_nakveti'))

        // 2. Load 2026 Ownership Layers
        setState2026(await fetchShapefile('/data/New_saxelmwifo'))
        setMuni2026(await fetchShapefile('/data/New_municipaluri'))
        setRelig2026(await fetchShapefile('/data/New_religia'))

        // 3. Load 2024 Ownership Layers
        setState2024(await fetchShapefile('/data/Old_saxelmwifo'))
        setMuni2024(await fetchShapefile('/data/Old_municipaluri'))
        setRelig2024(await fetchShapefile('/data/Old_religia'))

      } catch (error) {
        console.error('Error loading geospatial data:', error)
      }
    }
    loadData()
  }, [])

  const mapProviders = {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png',
    labels: {
      light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png',
    },
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  const toggleSatellite = () => setIsSatellite(prev => !prev)
  const toggleMeasure = () => setIsMeasuring(prev => !prev)
  const toggleLayer = (layerKey) => setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }))

  const handleSlideChange = (index) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index)
      // Apply the layer preset for this slide
      setLayers(slideLayerSets[index])
      // Retrigger fitBounds by creating a new bounds reference
      if (mapBounds) {
        const b = mapBounds
        setMapBounds(null)
        setTimeout(() => setMapBounds(b), 50)
      }
    }
  }

  const handleSearch = (query) => {
    setSearch(query)
    if (!query.trim() || query.length < 3) {
      setSearchResults([])
      return
    }

    const term = query.toLowerCase()
    const results = []

    const searchInLayer = (data, layerLabel) => {
      if (!data || !data.features) return
      data.features.forEach(feature => {
        const props = feature.properties
        const cadcode = props.CADCODE || props.cadcode || ''
        if (cadcode && cadcode.toString().toLowerCase().includes(term)) {
          results.push({
            id: `${layerLabel}-${cadcode}-${Math.random()}`,
            display_name: cadcode,
            layer: layerLabel,
            feature: feature
          })
        }
      })
    }

    searchInLayer(oldNakvetiData, 'Plots 2024')
    searchInLayer(newNakvetiData, 'Plots 2026')
    setSearchResults(results.slice(0, 8))
  }

  const handleResultClick = (result) => {
    const feature = result.feature
    const leafletGeoJSON = L.geoJSON(feature)
    setMapBounds(leafletGeoJSON.getBounds())
    setSearch(result.display_name)
    setSearchResults([])
  }

  return (
    <div className={`app-root ${theme}-theme`}>
      {/* Top Floating Controls */}
      <header className="floating-header">
        <div className="search-pill-container">
          <div className="search-pill">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search CADCODE..." 
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((result) => (
                <div 
                  key={result.id} 
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <span className="res-code">{result.display_name}</span>
                  <span className="res-layer">{result.layer}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="control-group">
          <button 
            className={`control-btn ${isMeasuring ? 'active' : ''}`} 
            onClick={toggleMeasure}
            title="Measure distance/area"
          >
            <Ruler size={18} />
            <span>{isMeasuring ? 'Done' : 'Measure'}</span>
          </button>
          
          <button 
            className={`control-btn ${isSatellite ? 'active' : ''}`} 
            onClick={toggleSatellite}
            title="Satellite view"
          >
            <MapIcon size={18} />
            <span>Satellite</span>
          </button>
          
          <button 
            className="control-btn theme-toggle" 
            onClick={toggleTheme}
            title="Switch theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Map Area */}
      <main className="map-container">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="leaflet-map"
          zoomControl={false}
        >
          {/* Base Layer */}
          <TileLayer
            key={`${theme}-${isSatellite}`}
            url={isSatellite ? mapProviders.satellite : mapProviders[theme]}
            attribution={isSatellite ? 'Esri' : '&copy; CARTO'}
          />
          {/* Label Layer (if not satellite) */}
          {!isSatellite && (
             <TileLayer
              key={`labels-${theme}`}
              url={mapProviders.labels[theme]}
              zIndex={10}
            />
          )}

          {/* Project Area Boundary */}
          {geoJsonData && layers.projectArea && (
            <GeoJSON 
              data={geoJsonData} 
              style={{
                color: isSatellite || theme === 'dark' ? '#00e5ff' : '#000000',
                weight: 2.5,
                dashArray: '8, 8',
                fillOpacity: 0.05,
                fillColor: '#00e5ff'
              }}
            >
              <Popup className="custom-popup">
                <div className="popup-content">
                  <h4>Ozurgeti Project Area</h4>
                  <p>Main Study Zone</p>
                </div>
              </Popup>
            </GeoJSON>
          )}

          {/* Land Plots 2024 (OLD) */}
          {oldNakvetiData && layers.plots2024 && (
            <GeoJSON 
              data={oldNakvetiData} 
              style={{
                color: '#ff4d4d',
                weight: 1.5,
                fillColor: '#ff4d4d',
                fillOpacity: 0.4
              }}
              onEachFeature={(feature, layer) => {
                const p = feature.properties || {}
                layer.bindPopup(`
                  <div class="popup-content">
                    <h4>Land Plot 2024</h4>
                    <div class="attr-row"><strong>CADCODE:</strong> ${p.CADCODE || 'N/A'}</div>
                    <div class="attr-row"><strong>Owners:</strong> ${p.OWNERS || 'N/A'}</div>
                    <div class="attr-row"><strong>Ownership:</strong> ${p.Owener_typ || 'N/A'}</div>
                  </div>
                `, { className: 'custom-popup' })
              }}
            />
          )}

          {/* Land Plots 2026 (NEW) */}
          {newNakvetiData && layers.plots2026 && (
            <GeoJSON 
              data={newNakvetiData} 
              style={{
                color: '#ffeb3b',
                weight: 1.5,
                fillColor: '#ffeb3b',
                fillOpacity: 0.4
              }}
              onEachFeature={(feature, layer) => {
                const p = feature.properties || {}
                layer.bindPopup(`
                  <div class="popup-content">
                    <h4>Land Plot 2026</h4>
                    <div class="attr-row"><strong>CADCODE:</strong> ${p.CADCODE || 'N/A'}</div>
                    <div class="attr-row"><strong>Owners:</strong> ${p.OWNERS || 'N/A'}</div>
                    <div class="attr-row"><strong>Ownership:</strong> ${p.mesakutre || 'N/A'}</div>
                  </div>
                `, { className: 'custom-popup' })
              }}
            />
          )}

          {/* New Ownership Layers 2026 */}
          {state2026 && layers.state2026 && (
            <GeoJSON data={state2026} style={{ color: '#23ae93', weight: 1.5, fillColor: '#23ae93', fillOpacity: 0.6 }} />
          )}
          {muni2026 && layers.muni2026 && (
            <GeoJSON data={muni2026} style={{ color: '#bbffd7', weight: 1.5, fillColor: '#bbffd7', fillOpacity: 0.6 }} />
          )}
          {relig2026 && layers.relig2026 && (
            <GeoJSON data={relig2026} style={{ color: '#fff6b6', weight: 1.5, fillColor: '#fff6b6', fillOpacity: 0.6 }} />
          )}

          {/* New Ownership Layers 2024 */}
          {state2024 && layers.state2024 && (
            <GeoJSON data={state2024} style={{ color: '#AE8C9F', weight: 1.5, fillColor: '#AE8C9F', fillOpacity: 0.6 }} />
          )}
          {muni2024 && layers.muni2024 && (
            <GeoJSON data={muni2024} style={{ color: '#196E7D', weight: 1.5, fillColor: '#196E7D', fillOpacity: 0.6 }} />
          )}
          {relig2024 && layers.relig2024 && (
            <GeoJSON data={relig2024} style={{ color: '#D51747', weight: 1.5, fillColor: '#D51747', fillOpacity: 0.6 }} />
          )}

          <MapController 
            bounds={mapBounds} 
            theme={theme} 
            isSatellite={isSatellite} 
            isMeasuring={isMeasuring}
            onMeasureChange={setIsMeasuring}
          />
        </MapContainer>

        {/* Bottom Carousel Navigation */}
        <div className="bottom-carousel">
          <button 
            className="nav-arrow" 
            onClick={() => handleSlideChange((currentSlide - 1 + slides.length) % slides.length)}
          >
            <ChevronLeft size={24} />
          </button>

          <div className="carousel-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                className={`dot ${currentSlide === index ? 'active' : ''}`}
                onClick={() => handleSlideChange(index)}
                title={slide.name}
              />
            ))}
          </div>

          <button 
            className="nav-arrow" 
            onClick={() => handleSlideChange((currentSlide + 1) % slides.length)}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </main>

      {/* Glassmorphic Sidebar */}
      <aside className={`sidebar-panel ${sidebarOpen ? 'open' : 'closed'}`}>
        <button className="sidebar-toggle-tab" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="sidebar-header">
          <h2>LAYERS</h2>
          <span className="subtitle">{slides[currentSlide].name.toUpperCase()}</span>
        </div>

        <div className="sidebar-scroll">
          <section className="layer-section">
            {/* Always visible */}
            <div className={`layer-item ${layers.projectArea ? 'active' : ''}`} onClick={() => toggleLayer('projectArea')}>
              <div className="layer-legend" style={{ background: '#00e5ff' }}></div>
              <span className="layer-name">Project Area</span>
              <input type="checkbox" checked={layers.projectArea} onChange={() => {}} />
            </div>

            {/* Slide 1: Land Plots */}
            {currentSlide === 0 && (<>
              <div className="layer-group-label">2026 LAYERS</div>
              <div className={`layer-item ${layers.plots2026 ? 'active' : ''}`} onClick={() => toggleLayer('plots2026')}>
                <div className="layer-legend" style={{ background: '#ffeb3b' }}></div>
                <span className="layer-name">Land Plots 2026</span>
                <input type="checkbox" checked={layers.plots2026} onChange={() => {}} />
              </div>
              <div className="layer-group-label">2024 LAYERS</div>
              <div className={`layer-item ${layers.plots2024 ? 'active' : ''}`} onClick={() => toggleLayer('plots2024')}>
                <div className="layer-legend" style={{ background: '#ff4d4d' }}></div>
                <span className="layer-name">Land Plots 2024</span>
                <input type="checkbox" checked={layers.plots2024} onChange={() => {}} />
              </div>
            </>)}

            {/* Slide 2: Ownership */}
            {currentSlide === 1 && (<>
              <div className="layer-group-label">2026 OWNERSHIP</div>
              <div className={`layer-item mini ${layers.state2026 ? 'active' : ''}`} onClick={() => toggleLayer('state2026')}>
                <div className="layer-legend" style={{ background: '#23ae93' }}></div>
                <span className="layer-name">State Ownership 2026</span>
                <input type="checkbox" checked={layers.state2026} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.muni2026 ? 'active' : ''}`} onClick={() => toggleLayer('muni2026')}>
                <div className="layer-legend" style={{ background: '#bbffd7' }}></div>
                <span className="layer-name">Municipal Ownership 2026</span>
                <input type="checkbox" checked={layers.muni2026} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.relig2026 ? 'active' : ''}`} onClick={() => toggleLayer('relig2026')}>
                <div className="layer-legend" style={{ background: '#fff6b6' }}></div>
                <span className="layer-name">Religious Ownership 2026</span>
                <input type="checkbox" checked={layers.relig2026} onChange={() => {}} />
              </div>
              <div className="layer-group-label">2024 OWNERSHIP</div>
              <div className={`layer-item mini ${layers.state2024 ? 'active' : ''}`} onClick={() => toggleLayer('state2024')}>
                <div className="layer-legend" style={{ background: '#AE8C9F' }}></div>
                <span className="layer-name">State Ownership 2024</span>
                <input type="checkbox" checked={layers.state2024} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.muni2024 ? 'active' : ''}`} onClick={() => toggleLayer('muni2024')}>
                <div className="layer-legend" style={{ background: '#196E7D' }}></div>
                <span className="layer-name">Municipal Ownership 2024</span>
                <input type="checkbox" checked={layers.muni2024} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.relig2024 ? 'active' : ''}`} onClick={() => toggleLayer('relig2024')}>
                <div className="layer-legend" style={{ background: '#D51747' }}></div>
                <span className="layer-name">Religious Ownership 2024</span>
                <input type="checkbox" checked={layers.relig2024} onChange={() => {}} />
              </div>
            </>)}
          </section>

          <section className="stats-section">
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <span className="stat-label">TOTAL AREA</span>
              <span className="stat-value">2211.1 ha</span>
            </div>
          </section>

          {/* Charts Section — Slide 1 only */}
          {currentSlide === 0 && layers.plots2024 && (
            <section className="chart-section">
              <span className="chart-title">2024 Registration Status</span>
              <div className="chart-container" style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Registered', value: 53.5 },
                        { name: 'Non-Registered', value: 46.5 }
                      ]}
                      dataKey="value"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={65}
                      stroke="none"
                    >
                      <Cell fill="#ff4d4d" />
                      <Cell fill="#9e9e9e" />
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-dim)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {currentSlide === 0 && layers.plots2026 && (
            <section className="chart-section">
              <span className="chart-title">2026 Registration Status</span>
              <div className="chart-container" style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Registered', value: 58.2 },
                        { name: 'Non-Registered', value: 41.8 }
                      ]}
                      dataKey="value"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={65}
                      stroke="none"
                    >
                      <Cell fill="#ffeb3b" />
                      <Cell fill="#9e9e9e" />
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-dim)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
          {/* Ownership Bar Charts — Slide 2 only */}
          {currentSlide === 1 && (layers.state2026 || layers.state2024) && (
            <section className="chart-section">
              <span className="chart-title">State Ownership (ha)</span>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={[{ name: 'State', y2024: 375.5, y2026: 405.9 }]} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip formatter={(v) => `${v} ha`} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }} formatter={(v) => v === 'y2024' ? '2024' : '2026'} />
                    <Bar dataKey="y2024" name="y2024" fill="#AE8C9F" radius={[4,4,0,0]} />
                    <Bar dataKey="y2026" name="y2026" fill="#23ae93" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {currentSlide === 1 && (layers.muni2026 || layers.muni2024) && (
            <section className="chart-section">
              <span className="chart-title">Municipal Ownership (ha)</span>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={[{ name: 'Municipal', y2024: 95.1, y2026: 101.1 }]} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip formatter={(v) => `${v} ha`} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }} formatter={(v) => v === 'y2024' ? '2024' : '2026'} />
                    <Bar dataKey="y2024" name="y2024" fill="#196E7D" radius={[4,4,0,0]} />
                    <Bar dataKey="y2026" name="y2026" fill="#bbffd7" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {currentSlide === 1 && (layers.relig2026 || layers.relig2024) && (
            <section className="chart-section">
              <span className="chart-title">Religious Ownership (ha)</span>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={[{ name: 'Religious', y2024: 1.9, y2026: 1.8 }]} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip formatter={(v) => `${v} ha`} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: '11px', color: 'var(--text-dim)' }} formatter={(v) => v === 'y2024' ? '2024' : '2026'} />
                    <Bar dataKey="y2024" name="y2024" fill="#D51747" radius={[4,4,0,0]} />
                    <Bar dataKey="y2026" name="y2026" fill="#fff6b6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        <footer className="sidebar-footer">
          <span>Ozurgeti Geospatial v1.0</span>
        </footer>
      </aside>
    </div>
  )
}
