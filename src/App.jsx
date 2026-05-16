import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet'
import L from 'leaflet'
import * as shp from 'shpjs'
import { Ruler, Map as MapIcon, Moon, Sun, Search, Layers, ChevronRight, ChevronLeft, Ambulance, Hospital as HospitalIcon, Baby, Trees, BookOpen, School, GraduationCap, Shield, Check, X } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet/dist/leaflet.css'
import './App.css'
import * as turf from '@turf/turf'

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

  // Social Infrastructure Layers (Points)
  const [dataEmergency, setDataEmergency] = useState(null)
  const [dataHospital, setDataHospital] = useState(null)
  const [dataKindergarten, setDataKindergarten] = useState(null)
  const [dataParks, setDataParks] = useState(null)
  const [dataPrivateSchool, setDataPrivateSchool] = useState(null)
  const [dataPublicSchool, setDataPublicSchool] = useState(null)
  const [dataSchoolsOutside, setDataSchoolsOutside] = useState(null)
  const [dataPolice, setDataPolice] = useState(null)

  // Service Area Layers (Buffers from Shapefiles)
  const [areaEmergency, setAreaEmergency] = useState(null)
  const [areaHospital, setAreaHospital] = useState(null)
  const [areaKindergarten, setAreaKindergarten] = useState(null)
  const [areaParks, setAreaParks] = useState(null)
  const [areaPrivateSchool, setAreaPrivateSchool] = useState(null)
  const [areaPublicSchool, setAreaPublicSchool] = useState(null)
  const [areaSchoolsOutside, setAreaSchoolsOutside] = useState(null)
  const [areaPolice, setAreaPolice] = useState(null)

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
    relig2024: false,
    // Social Infrastructure
    inf_emergency: true,
    inf_hospital: true,
    // Service Areas
    srv_emergency: true,
    srv_hospital: true,
    srv_kindergarten: true,
    srv_parks: true,
    srv_privateSchool: true,
    srv_publicSchool: true,
    srv_schoolsOutside: true,
    srv_police: true
  })

  const slideLayerSets = [
    // Slide 1: Land Plots overview
    { projectArea: true, plots2024: true, plots2026: true, state2026: false, muni2026: false, relig2026: false, state2024: false, muni2024: false, relig2024: false, inf_emergency: false, inf_hospital: false, inf_kindergarten: false, inf_parks: false, inf_privateSchool: false, inf_publicSchool: false, inf_schoolsOutside: false, inf_police: false, srv_emergency: false, srv_hospital: false, srv_kindergarten: false, srv_parks: false, srv_privateSchool: false, srv_publicSchool: false, srv_schoolsOutside: false, srv_police: false },
    // Slide 2: Ownership breakdown
    { projectArea: true, plots2024: false, plots2026: false, state2026: true, muni2026: true, relig2026: true, state2024: true, muni2024: true, relig2024: true, inf_emergency: false, inf_hospital: false, inf_kindergarten: false, inf_parks: false, inf_privateSchool: false, inf_publicSchool: false, inf_schoolsOutside: false, inf_police: false, srv_emergency: false, srv_hospital: false, srv_kindergarten: false, srv_parks: false, srv_privateSchool: false, srv_publicSchool: false, srv_schoolsOutside: false, srv_police: false },
    // Slide 3: Social Infrastructure
    { projectArea: true, plots2024: false, plots2026: false, state2026: false, muni2026: false, relig2026: false, state2024: false, muni2024: false, relig2024: false, inf_emergency: true, inf_hospital: true, inf_kindergarten: true, inf_parks: true, inf_privateSchool: true, inf_publicSchool: true, inf_schoolsOutside: true, inf_police: true, srv_emergency: true, srv_hospital: true, srv_kindergarten: true, srv_parks: true, srv_privateSchool: true, srv_publicSchool: true, srv_schoolsOutside: true, srv_police: true }
  ]

  const slides = [
    { id: 1, name: 'Land Plots Overview' },
    { id: 2, name: 'Ownership Breakdown' },
    { id: 3, name: 'Social Infrastructure Service Area' }
  ]

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchShapefile = async (baseUrl) => {
          const v = Date.now()
          const [shpRes, dbfRes, prjRes] = await Promise.all([
            fetch(`${baseUrl}.shp?v=${v}`),
            fetch(`${baseUrl}.dbf?v=${v}`),
            fetch(`${baseUrl}.prj?v=${v}`)
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
        const areaData = await shp.default(`/data/ozurgeti_sakvlevi_areali.zip?v=${Date.now()}`)
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

        // 4. Load Infrastructure Points
        setDataEmergency(await fetchShapefile('/data/Emergency_Medical_Services'))
        setDataHospital(await fetchShapefile('/data/Hospital'))
        setDataKindergarten(await fetchShapefile('/data/Kindergarten'))
        setDataParks(await fetchShapefile('/data/Park'))
        setDataPrivateSchool(await fetchShapefile('/data/Private_School'))
        setDataPublicSchool(await fetchShapefile('/data/Public_School'))
        setDataSchoolsOutside(await fetchShapefile('/data/Schools_outside'))
        setDataPolice(await fetchShapefile('/data/Police_Emergency_Services'))

        // 5. Load Service Area Buffers
        setAreaEmergency(await fetchShapefile('/data/Emergency Medical Services_2000m'))
        setAreaHospital(await fetchShapefile('/data/Hospital_1000m'))
        setAreaKindergarten(await fetchShapefile('/data/Kindergarten_500m'))
        setAreaParks(await fetchShapefile('/data/Parks_500m'))
        setAreaPrivateSchool(await fetchShapefile('/data/Private_School_750m'))
        setAreaPublicSchool(await fetchShapefile('/data/Public_School_750m'))
        setAreaSchoolsOutside(await fetchShapefile('/data/Outside_School_750m'))
        setAreaPolice(await fetchShapefile('/data/Police_Emergency Services_2000m'))

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

          {/* Infrastructure Points */}
          {dataEmergency && layers.inf_emergency && (
            <GeoJSON key={`inf-em-${dataEmergency.features?.length}-${Date.now()}`} data={dataEmergency}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#ff3d3d"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#ff3d3d" stroke="#fff" stroke-width="1"/><text x="12" y="13" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff" font-family="Arial">✚</text></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🚑 Emergency Service</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataHospital && layers.inf_hospital && (
            <GeoJSON key={`inf-hs-${dataHospital.features?.length}-${Date.now()}`} data={dataHospital}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#e040fb"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#e040fb" stroke="#fff" stroke-width="1"/><rect x="10" y="7" width="4" height="7" fill="#fff"/><rect x="8" y="9" width="8" height="3" fill="#fff"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🏥 Hospital</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataKindergarten && layers.inf_kindergarten && (
            <GeoJSON key={`inf-kg-${dataKindergarten.features?.length}-${Date.now()}`} data={dataKindergarten}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#ff9800"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#ff9800" stroke="#fff" stroke-width="1"/><circle cx="12" cy="9" r="2.5" fill="#fff"/><path d="M8 14c0-2 1.8-3 4-3s4 1 4 3" stroke="#fff" stroke-width="1.2" fill="none"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🧒 Kindergarten</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataParks && layers.inf_parks && (
            <GeoJSON key={`inf-pk-${dataParks.features?.length}-${Date.now()}`} data={dataParks}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#43a047"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#43a047" stroke="#fff" stroke-width="1"/><path d="M12 13.5V16" stroke="#fff" stroke-width="1.3"/><path d="M9 11c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.1-.6 2.06-1.5 2.57L12 14l-1.5-.43C9.6 13.06 9 12.1 9 11z" fill="#fff"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🌳 Park</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataPrivateSchool && layers.inf_privateSchool && (
            <GeoJSON key={`inf-ps-${dataPrivateSchool.features?.length}-${Date.now()}`} data={dataPrivateSchool}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#29b6f6"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#29b6f6" stroke="#fff" stroke-width="1"/><rect x="8" y="10" width="8" height="5.5" stroke="#fff" stroke-width="1.1" fill="none"/><path d="M8 10l4-3.5 4 3.5" stroke="#fff" stroke-width="1.1" fill="none"/><rect x="10.5" y="12" width="3" height="3.5" fill="#fff"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🏫 Private School</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataPublicSchool && layers.inf_publicSchool && (
            <GeoJSON key={`inf-pb-${dataPublicSchool.features?.length}-${Date.now()}`} data={dataPublicSchool}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#f9a825"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#f9a825" stroke="#fff" stroke-width="1"/><rect x="8" y="10" width="8" height="5.5" stroke="#fff" stroke-width="1.1" fill="none"/><path d="M8 10l4-3.5 4 3.5" stroke="#fff" stroke-width="1.1" fill="none"/><rect x="10.5" y="12" width="3" height="3.5" fill="#fff"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🏛️ Public School</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataSchoolsOutside && layers.inf_schoolsOutside && (
            <GeoJSON key={`inf-so-${dataSchoolsOutside.features?.length}-${Date.now()}`} data={dataSchoolsOutside}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#78909c"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#78909c" stroke="#fff" stroke-width="1"/><path d="M8 10.5l4-2.5 4 2.5" stroke="#fff" stroke-width="1.1" fill="none"/><rect x="8" y="10.5" width="8" height="5" stroke="#fff" stroke-width="1" fill="none"/><rect x="10.5" y="12.3" width="3" height="3.2" fill="#fff"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🎓 School Outside</h4></div>', { className: 'custom-popup' })} />
          )}
          {dataPolice && layers.inf_police && (
            <GeoJSON key={`inf-po-${dataPolice.features?.length}-${Date.now()}`} data={dataPolice}
              pointToLayer={(f, l) => L.marker(l, { icon: L.divIcon({ className: '', html: `<div class="svg-marker" style="--mc:#1565c0"><svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z" fill="#1565c0" stroke="#fff" stroke-width="1"/><path d="M12 6.5 L15.5 8 L15.5 11 Q15.5 13.5 12 14.5 Q8.5 13.5 8.5 11 L8.5 8 Z" fill="#fff" stroke="#1565c0" stroke-width="0.4"/><line x1="10.8" y1="10" x2="13.2" y2="10" stroke="#1565c0" stroke-width="1"/><line x1="12" y1="8.8" x2="12" y2="11.2" stroke="#1565c0" stroke-width="1"/></svg></div>`, iconSize: [34, 40], iconAnchor: [17, 40], popupAnchor: [0, -42] })})}
              onEachFeature={(f, l) => l.bindPopup('<div class="popup-content"><h4>🚔 Police / Emergency</h4></div>', { className: 'custom-popup' })} />
          )}

          {/* Service Areas (Polygons from Shapefiles) */}
          {areaEmergency && layers.srv_emergency && (
            <GeoJSON key={`srv-em-${areaEmergency.features?.length}-${Date.now()}`} data={areaEmergency} style={{ color: '#ff3d3d', weight: 1.5, dashArray: '5,4', fillColor: '#ff3d3d', fillOpacity: 0.12 }} />
          )}
          {areaHospital && layers.srv_hospital && (
            <GeoJSON key={`srv-hs-${areaHospital.features?.length}-${Date.now()}`} data={areaHospital} style={{ color: '#e040fb', weight: 1.5, dashArray: '5,4', fillColor: '#e040fb', fillOpacity: 0.12 }} />
          )}
          {areaKindergarten && layers.srv_kindergarten && (
            <GeoJSON key={`srv-kg-${areaKindergarten.features?.length}-${Date.now()}`} data={areaKindergarten} style={{ color: '#ff9800', weight: 1.5, dashArray: '5,4', fillColor: '#ff9800', fillOpacity: 0.12 }} />
          )}
          {areaParks && layers.srv_parks && (
            <GeoJSON key={`srv-pk-${areaParks.features?.length}-${Date.now()}`} data={areaParks} style={{ color: '#43a047', weight: 1.5, dashArray: '5,4', fillColor: '#43a047', fillOpacity: 0.12 }} />
          )}
          {areaPrivateSchool && layers.srv_privateSchool && (
            <GeoJSON key={`srv-ps-${areaPrivateSchool.features?.length}-${Date.now()}`} data={areaPrivateSchool} style={{ color: '#29b6f6', weight: 1.5, dashArray: '5,4', fillColor: '#29b6f6', fillOpacity: 0.12 }} />
          )}
          {areaPublicSchool && layers.srv_publicSchool && (
            <GeoJSON key={`srv-pb-${areaPublicSchool.features?.length}-${Date.now()}`} data={areaPublicSchool} style={{ color: '#f9a825', weight: 1.5, dashArray: '5,4', fillColor: '#f9a825', fillOpacity: 0.12 }} />
          )}
          {areaSchoolsOutside && layers.srv_schoolsOutside && (
            <GeoJSON key={`srv-so-${areaSchoolsOutside.features?.length}-${Date.now()}`} data={areaSchoolsOutside} style={{ color: '#78909c', weight: 1.5, dashArray: '5,4', fillColor: '#78909c', fillOpacity: 0.12 }} />
          )}
          {areaPolice && layers.srv_police && (
            <GeoJSON key={`srv-po-${areaPolice.features?.length}-${Date.now()}`} data={areaPolice} style={{ color: '#1565c0', weight: 1.5, dashArray: '5,4', fillColor: '#1565c0', fillOpacity: 0.12 }} />
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
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>LAYERS</h2>
              <span className="subtitle">{slides[currentSlide].name.toUpperCase()}</span>
            </div>
            <button 
              className="toggle-all-btn"
              onClick={() => {
                const preset = slideLayerSets[currentSlide]
                const relevantKeys = Object.keys(preset).filter(k => preset[k] === true)
                const allOn = relevantKeys.every(k => layers[k])
                const newState = { ...layers }
                relevantKeys.forEach(k => { newState[k] = !allOn })
                setLayers(newState)
              }}
              title="Toggle all layers in this view"
            >
              {(() => {
                const preset = slideLayerSets[currentSlide]
                const relevantKeys = Object.keys(preset).filter(k => preset[k] === true)
                const allOn = relevantKeys.every(k => layers[k])
                return allOn ? <X size={14} /> : <Check size={14} />
              })()}
              <span>
                {(() => {
                  const preset = slideLayerSets[currentSlide]
                  const relevantKeys = Object.keys(preset).filter(k => preset[k] === true)
                  const allOn = relevantKeys.every(k => layers[k])
                  return allOn ? 'Uncheck All' : 'Check All'
                })()}
              </span>
            </button>
          </div>
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

            {/* Slide 3: Social Infrastructure */}
            {currentSlide === 2 && (<>
              <div className="layer-group-label">HEALTH &amp; SAFETY</div>
              <div className={`layer-item mini ${layers.inf_police ? 'active' : ''}`} onClick={() => toggleLayer('inf_police')}>
                <div className="layer-icon-dot" style={{ background: '#1565c0' }}><Shield size={12} color="#fff" /></div>
                <span className="layer-name">Police / Emergency Services</span>
                <input type="checkbox" checked={layers.inf_police} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_police ? 'active' : ''}`} onClick={() => toggleLayer('srv_police')}>
                <div className="layer-legend-sq" style={{ background: '#1565c0' }}></div>
                <span className="layer-name">↳ Service Area 2000m</span>
                <input type="checkbox" checked={layers.srv_police} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.inf_emergency ? 'active' : ''}`} onClick={() => toggleLayer('inf_emergency')}>
                <div className="layer-icon-dot" style={{ background: '#ff3d3d' }}><Ambulance size={12} color="#fff" /></div>
                <span className="layer-name">Emergency Medical Services</span>
                <input type="checkbox" checked={layers.inf_emergency} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_emergency ? 'active' : ''}`} onClick={() => toggleLayer('srv_emergency')}>
                <div className="layer-legend-sq" style={{ background: '#ff3d3d' }}></div>
                <span className="layer-name">↳ Service Area 2000m</span>
                <input type="checkbox" checked={layers.srv_emergency} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.inf_hospital ? 'active' : ''}`} onClick={() => toggleLayer('inf_hospital')}>
                <div className="layer-icon-dot" style={{ background: '#e040fb' }}><HospitalIcon size={12} color="#fff" /></div>
                <span className="layer-name">Hospital</span>
                <input type="checkbox" checked={layers.inf_hospital} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_hospital ? 'active' : ''}`} onClick={() => toggleLayer('srv_hospital')}>
                <div className="layer-legend-sq" style={{ background: '#e040fb' }}></div>
                <span className="layer-name">↳ Service Area 1000m</span>
                <input type="checkbox" checked={layers.srv_hospital} onChange={() => {}} />
              </div>
              <div className="layer-group-label">EDUCATION</div>
              <div className={`layer-item mini ${layers.inf_kindergarten ? 'active' : ''}`} onClick={() => toggleLayer('inf_kindergarten')}>
                <div className="layer-icon-dot" style={{ background: '#ff9800' }}><Baby size={12} color="#fff" /></div>
                <span className="layer-name">Kindergarten</span>
                <input type="checkbox" checked={layers.inf_kindergarten} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_kindergarten ? 'active' : ''}`} onClick={() => toggleLayer('srv_kindergarten')}>
                <div className="layer-legend-sq" style={{ background: '#ff9800' }}></div>
                <span className="layer-name">↳ Kindergarten_500m</span>
                <input type="checkbox" checked={layers.srv_kindergarten} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.inf_privateSchool ? 'active' : ''}`} onClick={() => toggleLayer('inf_privateSchool')}>
                <div className="layer-icon-dot" style={{ background: '#29b6f6' }}><BookOpen size={12} color="#fff" /></div>
                <span className="layer-name">Private School</span>
                <input type="checkbox" checked={layers.inf_privateSchool} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_privateSchool ? 'active' : ''}`} onClick={() => toggleLayer('srv_privateSchool')}>
                <div className="layer-legend-sq" style={{ background: '#29b6f6' }}></div>
                <span className="layer-name">↳ Private_School_750m</span>
                <input type="checkbox" checked={layers.srv_privateSchool} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.inf_publicSchool ? 'active' : ''}`} onClick={() => toggleLayer('inf_publicSchool')}>
                <div className="layer-icon-dot" style={{ background: '#f9a825' }}><School size={12} color="#333" /></div>
                <span className="layer-name">Public School</span>
                <input type="checkbox" checked={layers.inf_publicSchool} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_publicSchool ? 'active' : ''}`} onClick={() => toggleLayer('srv_publicSchool')}>
                <div className="layer-legend-sq" style={{ background: '#f9a825' }}></div>
                <span className="layer-name">↳ Public_School_750m</span>
                <input type="checkbox" checked={layers.srv_publicSchool} onChange={() => {}} />
              </div>
              <div className={`layer-item mini ${layers.inf_schoolsOutside ? 'active' : ''}`} onClick={() => toggleLayer('inf_schoolsOutside')}>
                <div className="layer-icon-dot" style={{ background: '#78909c' }}><GraduationCap size={12} color="#fff" /></div>
                <span className="layer-name">Schools Outside</span>
                <input type="checkbox" checked={layers.inf_schoolsOutside} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_schoolsOutside ? 'active' : ''}`} onClick={() => toggleLayer('srv_schoolsOutside')}>
                <div className="layer-legend-sq" style={{ background: '#78909c' }}></div>
                <span className="layer-name">↳ Service Area 750m</span>
                <input type="checkbox" checked={layers.srv_schoolsOutside} onChange={() => {}} />
              </div>
              <div className="layer-group-label">GREEN SPACE</div>
              <div className={`layer-item mini ${layers.inf_parks ? 'active' : ''}`} onClick={() => toggleLayer('inf_parks')}>
                <div className="layer-icon-dot" style={{ background: '#43a047' }}><Trees size={12} color="#fff" /></div>
                <span className="layer-name">Parks</span>
                <input type="checkbox" checked={layers.inf_parks} onChange={() => {}} />
              </div>
              <div className={`layer-item mini service-area ${layers.srv_parks ? 'active' : ''}`} onClick={() => toggleLayer('srv_parks')}>
                <div className="layer-legend-sq" style={{ background: '#43a047' }}></div>
                <span className="layer-name">↳ Parks_500m</span>
                <input type="checkbox" checked={layers.srv_parks} onChange={() => {}} />
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

