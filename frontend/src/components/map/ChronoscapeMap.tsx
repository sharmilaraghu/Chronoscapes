import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';

const vintageIcon = L.divIcon({
  className: '',
  html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#8b1a1a"/>
    <circle cx="12" cy="12" r="5" fill="#f0e6c8"/>
  </svg>`,
  iconSize: [24, 32],
  iconAnchor: [12, 32],
  popupAnchor: [0, -34],
});

function ZoomControls() {
  const map = useMap();

  function handleZoomIn(e: React.MouseEvent) {
    e.stopPropagation();
    map.zoomIn();
  }

  function handleZoomOut(e: React.MouseEvent) {
    e.stopPropagation();
    map.zoomOut();
  }

  return (
    <div className="map-zoom-controls" onClick={(e) => e.stopPropagation()}>
      <button className="map-zoom-btn" onClick={handleZoomIn} aria-label="Zoom in" type="button">+</button>
      <button className="map-zoom-btn" onClick={handleZoomOut} aria-label="Zoom out" type="button">−</button>
    </div>
  );
}

interface FlyToProps {
  center: [number, number];
}

function FlyTo({ center }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 12, { duration: 1.8 });
  }, [center, map]);
  return null;
}

interface MapClickHandlerProps {
  onLocationSelect: (placeName: string, coords: [number, number]) => void;
  disabled?: boolean;
}

function MapClickHandler({ onLocationSelect, disabled }: MapClickHandlerProps) {
  const [geocoding, setGeocoding] = useState(false);

  useMapEvents({
    click(e) {
      if (disabled || geocoding) return;
      const { lat, lng } = e.latlng;
      setGeocoding(true);

      // Reverse geocode via Nominatim (free, no API key needed)
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
        .then((res) => res.json())
        .then((data) => {
          const parts: string[] = [];
          if (data.address?.city) parts.push(data.address.city);
          else if (data.address?.town) parts.push(data.address.town);
          else if (data.address?.village) parts.push(data.address.village);
          if (data.address?.state && !parts.includes(data.address.state)) {
            parts.push(data.address.state);
          }
          const placeName = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',')[0] ?? 'Unknown';
          onLocationSelect(placeName, [lat, lng]);
        })
        .catch(() => {
          onLocationSelect(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, [lat, lng]);
        })
        .finally(() => setGeocoding(false));
    },
  });

  return null;
}

interface ChronoscapeMapProps {
  center?: [number, number];
  locationLabel?: string;
  onLocationSelect?: (placeName: string, coords: [number, number]) => void;
}

const DEFAULT_CENTER: [number, number] = [40.7831, -73.9712];

export default function ChronoscapeMap({
  center,
  locationLabel,
  onLocationSelect,
}: ChronoscapeMapProps) {
  const mapCenter = center ?? DEFAULT_CENTER;
  const isInteractive = !!onLocationSelect;

  return (
    <div className="map-frame" style={{ height: '100%', minHeight: '300px' }}>
      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: '100%', width: '100%', filter: 'sepia(75%) brightness(88%) contrast(1.05)' }}
        zoomControl={false}
        attributionControl={false}
        dragging={isInteractive}
        scrollWheelZoom={isInteractive}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {center && (
          <>
            <FlyTo center={center} />
            <Marker position={center} icon={vintageIcon}>
              {locationLabel && <Popup>{locationLabel}</Popup>}
            </Marker>
          </>
        )}

        <ZoomControls />

        {onLocationSelect && (
          <MapClickHandler
            onLocationSelect={onLocationSelect}
            disabled={false}
          />
        )}
      </MapContainer>

      {isInteractive && (
        <p
          style={{
            fontFamily: 'var(--font-caption)',
            fontSize: '0.55rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-faded)',
            textAlign: 'center',
            padding: '0.25rem 0',
          }}
        >
          Click map to select a location
        </p>
      )}
    </div>
  );
}
