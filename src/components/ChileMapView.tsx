import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import { FoodPackage } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Polyline, GeoJSON } from 'react-leaflet';
import { santiagoComunas } from '../data/santiagoComunas';
import { SantiagoBaseMap, METRO_LEGEND } from './SantiagoBaseMap';
import L from 'leaflet';
import { MapPin, Clock, Store, Footprints, Navigation, RefreshCw, ShieldAlert, ExternalLink, Crosshair } from 'lucide-react';
import { useGeolocation, LocationStatus } from '../hooks/useGeolocation';

const urgencyColor = (urgency?: string) => (urgency === 'red' ? '#d63427' : urgency === 'yellow' ? '#c4860f' : '#3a8730');

const createCustomIcon = (urgency?: 'green' | 'yellow' | 'red', units = 0, active = false, label = '') => {
  const color = units <= 0 ? '#9ca3af' : urgencyColor(urgency);
  const w = active ? 36 : 28;
  const h = active ? 50 : 40;
  const text = units > 9 ? '9+' : String(Math.max(0, units));
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${w}" height="${h}" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="7" fill="#fff"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="800" font-family="system-ui,sans-serif" fill="${color}">${text}</text></svg>`;
  const tag = active && label ? `<div class="pin-label">${label.replace(/</g, '&lt;')}</div>` : '';
  return L.divIcon({ className: active ? 'pin-active' : '', html: svgString + tag, iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h + 4] });
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatWalk = (km: number) => {
  const cuadras = Math.max(1, Math.round(km / 0.12));
  const min = Math.max(1, Math.round(km * 12.5));
  return { cuadras, min };
};

const decodePolyline = (t: string): [number, number][] => {
  const pts: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < t.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
};

const getUrgencyBadge = (urgency?: string) => {
  if (urgency === 'red') return <span className="text-2xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">Retirar pronto</span>;
  if (urgency === 'yellow') return <span className="text-2xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Pocas horas</span>;
  return <span className="text-2xs font-bold text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full border border-success-200">Con tiempo</span>;
};

interface ChileMapViewProps {
  packages: FoodPackage[];
  onSelectPackage?: (pkg: FoodPackage) => void;
  locationTrackingEnabled?: boolean;
}

function ViewController({ center, home, target }: { center: [number, number]; home: [number, number]; target: [number, number] | null }) {
  const map = useMap();
  const lastFitKey = useRef<string>('');
  useEffect(() => {
    if (target) {
      const key = `${home.map((v) => v.toFixed(3)).join(',')}|${target.map((v) => v.toFixed(3)).join(',')}`;
      if (key !== lastFitKey.current) {
        lastFitKey.current = key;
        map.fitBounds([home, target], { padding: [48, 48], maxZoom: 14 });
      }
    } else {
      map.setView(home, 13);
    }
  }, [center, home, target, map]);
  return null;
}

interface RouteInfo {
  points: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export const ChileMapView: React.FC<ChileMapViewProps> = ({ packages, onSelectPackage, locationTrackingEnabled = true }) => {
  const defaultCenter: [number, number] = [-33.4489, -70.6693];
  // El mapa muestra solo Santiago de Chile
  const selectedCity = 'Santiago' as const;
  const [activePackage, setActivePackage] = useState<FoodPackage | null>(
    () => packages.find((p) => p.lat && p.lng && haversineKm(-33.4489, -70.6693, p.lat, p.lng) < 40) || null
  );
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  // true cuando cargan las calles de OpenStreetMap (con internet); si no, usamos el mapa dibujado localmente
  const [tilesOk, setTilesOk] = useState(false);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const { coords: geoCoords, status: geoStatus, refresh } = useGeolocation({ enabled: locationTrackingEnabled });

  // Debounce para OSRM: evita spam de peticiones al mover el mapa/GPS
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cityCenters: Record<string, [number, number]> = {
    Santiago: [-33.4489, -70.6693],
  };

  const homePoints: Record<string, [number, number]> = {
    Santiago: [-33.4435, -70.6465],
  };

  const homePoint = homePoints[selectedCity];
  const locationReady = locationTrackingEnabled && geoStatus === 'granted' && geoCoords !== null;
  const realUserLatLng: [number, number] | null = locationReady && geoCoords ? [geoCoords.lat, geoCoords.lng] : null;

  // Detecta si el GPS real está cerca de la zona demo (radio 5 km del centro de la ciudad)
  const isNearDemoZone = realUserLatLng ? haversineKm(realUserLatLng[0], realUserLatLng[1], cityCenters[selectedCity][0], cityCenters[selectedCity][1]) <= 5 : false;

  // Para cálculos de distancia/ruta: usa GPS real solo si está cerca de la zona demo; si no, usa hogar simulado
  const userLatLng: [number, number] = (realUserLatLng && isNearDemoZone) ? realUserLatLng : homePoint;
  const usingDemoLocation = locationReady && (!realUserLatLng || !isNearDemoZone);

  const locationUi: 'ready' | 'loading' | 'denied' | 'off' =
    locationReady
      ? 'ready'
      : !locationTrackingEnabled
        ? 'off'
        : geoStatus === 'loading' || geoStatus === 'idle'
          ? 'loading'
          : geoStatus === 'unsupported' || geoStatus === 'denied' || geoStatus === 'error'
            ? 'denied'
            : 'loading';

  // toFixed(3) ≈ 110 m → evita re-fetch por micro-movimientos GPS
  const routeGeoKey = geoCoords ? `${geoCoords.lat.toFixed(3)},${geoCoords.lng.toFixed(3)}` : null;

  const currentCenter = activePackage?.lat && activePackage?.lng
    ? [activePackage.lat, activePackage.lng] as [number, number]
    : cityCenters[selectedCity];

  const activeTarget: [number, number] | null =
    activePackage?.lat && activePackage?.lng ? [activePackage.lat, activePackage.lng] : null;

  // Con GPS: distancias reales. Sin GPS: aproximadas desde el centro de la ciudad.
  const sorted = packages
    .filter((p) => p.lat && p.lng && haversineKm(cityCenters[selectedCity][0], cityCenters[selectedCity][1], p.lat, p.lng) < 40)
    .map((p) => ({ pkg: p, km: haversineKm(userLatLng[0], userLatLng[1], p.lat!, p.lng!) }))
    .sort((a, b) => a.km - b.km);
  const distancesApprox = locationUi !== 'ready' || usingDemoLocation;

  const activeWalk = activeTarget
    ? formatWalk(haversineKm(userLatLng[0], userLatLng[1], activeTarget[0], activeTarget[1]))
    : null;

  useEffect(() => {
    let cancelled = false;
    const loadRoute = async () => {
      // Usa userLatLng (demo o real según proximidad) para consistencia con el marcador del mapa
      if (!locationReady || !activeTarget) {
        setRoute(null);
        setRouteLoading(false);
        return;
      }
      setRoute(null);
      setRouteLoading(true);
      try {
        const url =
          `https://router.project-osrm.org/route/v1/foot/${userLatLng[1]},${userLatLng[0]};` +
          `${activeTarget[1]},${activeTarget[0]}?overview=full&geometries=polyline`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('osrm');
        const data = await res.json();
        if (cancelled) return;
        if (!data.routes || data.routes.length === 0) throw new Error('no-route');
        const r = data.routes[0];
        if (!r.geometry) throw new Error('no-geometry');
        const pts = decodePolyline(r.geometry);
        setRoute({ points: pts, distanceKm: r.distance / 1000, durationMin: r.duration / 60 });
      } catch {
        if (!cancelled) setRoute(null);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    // Debounce 2s para evitar spam a OSRM
    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    routeDebounceRef.current = setTimeout(loadRoute, 2000);

    return () => {
      cancelled = true;
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    };
  }, [locationReady, activeTarget, routeGeoKey, locationTrackingEnabled, userLatLng]);

  const polylinePoints: [number, number][] =
    route && route.points.length > 1
      ? route.points
      : activeTarget
        ? [userLatLng, activeTarget]
        : [];

  const showDirectFallback = locationUi === 'ready' && !!activeTarget && !route && !routeLoading;

  const renderLocationChip = () => {
    if (locationUi === 'ready') {
      if (usingDemoLocation) {
        return (
          <p className="flex items-center gap-1.5 text-2xs text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-3 h-3" /> Modo demo: distancias desde {selectedCity} Centro
          </p>
        );
      }
      return (
        <p className="flex items-center gap-1.5 text-2xs text-stone-500">
          <span className="inline-block w-2 h-2 rounded-full border-2 border-white dark:border-stone-900 bg-brand-600 shadow-sm animate-pulse-dot" />
          Ubicación real activada <Navigation className="w-3 h-3 text-brand-500" />
        </p>
      );
    }
    if (locationUi === 'off') {
      return (
        <p className="flex items-center gap-1.5 text-2xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-3 h-3" /> Seguimiento de ubicación apagado · actívalo en Configuración
        </p>
      );
    }
    if (locationUi === 'loading') {
      return (
        <p className="flex items-center gap-1.5 text-2xs text-stone-500">
          <RefreshCw className="w-3 h-3 animate-spin" /> Buscando tu ubicación…
        </p>
      );
    }
    return (
      <p className="flex items-center gap-1.5 text-2xs text-amber-600 dark:text-amber-400">
        <ShieldAlert className="w-3 h-3" /> Ubicación no disponible
        <button onClick={refresh} className="ml-1 text-2xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-500/20 active:scale-95 transition-all">
          Actualizar
        </button>
      </p>
    );
  };

  const renderBlockedCard = () => {
    if (locationUi === 'off') {
      return (
        <p className="text-xs text-stone-400 flex items-center gap-1.5 py-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Activa el seguimiento en Configuración para ver distancias reales y la ruta.
        </p>
      );
    }
    if (locationUi === 'loading') {
      return (
        <p className="text-xs text-stone-400 flex items-center gap-1.5 py-2">
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" /> Obteniendo tu ubicación…
        </p>
      );
    }
    return (
      <div className="py-2">
        <p className="text-xs text-stone-400 flex items-center gap-1.5 mb-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Distancias aproximadas. Permite la ubicación para calcularlas desde donde estás.
        </p>
        <button onClick={refresh} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-[0.98]">
          Volver a pedir permiso
        </button>
      </div>
    );
  };

  return (
    <div className="bg-card dark:bg-stone-900 rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-sm overflow-hidden animate-slide-up">
      <div className="p-3 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Mapa</span>
          </div>
          <span className="px-3 py-1.5 rounded-lg text-2xs font-bold bg-brand-600 text-white shadow-sm">Santiago de Chile</span>
        </div>
        {renderLocationChip()}
      </div>

      <div className="h-[340px] sm:h-[400px] relative">
        {/* Centrar en mí */}
        <button
          onClick={() => setActivePackage(null)}
          aria-label="Centrar en mi ubicación"
          className="absolute top-2 right-2 z-[500] w-9 h-9 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-center text-stone-700 dark:text-stone-200 active:scale-95"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <MapContainer center={defaultCenter} zoom={12} scrollWheelZoom={false} className="w-full h-full santiago-map">
          <ViewController center={currentCenter} home={userLatLng} target={activeTarget} />
          {/* Comunas de Santiago dibujadas localmente: el mapa se ve aunque no carguen las calles */}
          {!tilesOk && <SantiagoBaseMap dark={isDark} />}
          <GeoJSON
            data={santiagoComunas}
            style={(feature) => ({
              color: '#2c6b25',
              weight: 1.2,
              opacity: 0.55,
              fillColor: feature?.properties?.name === 'Santiago' ? '#9fd48f' : '#cfe8c4',
              fillOpacity: tilesOk ? 0.06 : 0.12,
              dashArray: '4 4',
            })}
            onEachFeature={(feature, layer) => {
              layer.bindTooltip(feature.properties?.name ?? '', {
                permanent: true,
                direction: 'center',
                className: 'comuna-label',
              });
            }}
          />
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileload: () => setTilesOk(true) }} />
          {polylinePoints.length > 0 && (
            <Polyline
              positions={polylinePoints}
              pathOptions={route ? { color: '#2563eb', weight: 4, opacity: 0.75 } : { color: '#2c6b25', weight: 4, opacity: 0.65, dashArray: '6 8' }}
            />
          )}
          <CircleMarker center={userLatLng} radius={9} pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#141914', fillOpacity: 1 }}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-stone-900">Tú estás aquí</p>
                <p className="text-2xs text-stone-500">
                  {usingDemoLocation ? `Modo demo: ${selectedCity} Centro` : locationUi === 'ready' ? 'Ubicación en tiempo real' : 'Ubicación estimada para la zona'}
                </p>
              </div>
            </Popup>
          </CircleMarker>
          {packages.map((pkg) => {
            if (!pkg.lat || !pkg.lng) return null;
            const walkInfo = locationUi === 'ready' ? formatWalk(haversineKm(userLatLng[0], userLatLng[1], pkg.lat, pkg.lng)) : null;
            return (
              <Marker key={pkg.id} position={[pkg.lat, pkg.lng]} icon={createCustomIcon(pkg.urgency, pkg.availableUnits, activePackage?.id === pkg.id, pkg.storeName)} zIndexOffset={activePackage?.id === pkg.id ? 1000 : 0} eventHandlers={{ click: () => setActivePackage(pkg) }}>
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs max-w-[200px]">
                    <div className="flex items-center gap-1 font-bold text-brand-600"><Store className="w-3 h-3" /> <span className="truncate">{pkg.storeName}</span></div>
                    <p className="font-bold text-stone-900 text-xs">{pkg.title}</p>
                    <p className="text-2xs text-stone-500">{pkg.commune}</p>
                    <div className="flex items-center gap-1 text-2xs"><Clock className="w-3 h-3 text-brand-500" /> {pkg.pickupTimeStart}-{pkg.pickupTimeEnd}</div>
                    {walkInfo && (
                      <p className="flex items-center gap-1 text-2xs text-brand-600 font-bold">
                        <Footprints className="w-3 h-3" /> a {walkInfo.cuadras} cuadras · {walkInfo.min} min
                      </p>
                    )}
                    {onSelectPackage && (
                      <button onClick={() => onSelectPackage(pkg)} disabled={pkg.availableUnits <= 0} className={`w-full mt-1 font-bold py-2 rounded-xl text-xs transition-all ${pkg.availableUnits <= 0 ? 'bg-stone-200 text-stone-400' : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'}`}>
                        {pkg.availableUnits <= 0 ? 'Agotado' : 'Solicitar $0'}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Leyenda */}
      <div className="px-3 py-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-stone-600 dark:text-stone-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#d63427' }} /> Retirar pronto</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#c4860f' }} /> Pocas horas</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3a8730' }} /> Con tiempo</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-stone-900 ring-2 ring-white shadow" /> Tú</span>
        {!tilesOk && (
          <span className="flex items-center gap-1">Metro {METRO_LEGEND.map((m) => <span key={m.id} className="w-2.5 h-1 rounded-full inline-block" style={{ background: m.color }} />)}</span>
        )}
        <span className="text-stone-400">· número del pin = raciones</span>
      </div>

      <div className="p-3 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5 mb-2">
          <Footprints className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Cerca de ti</span>
          <span className="ml-auto text-2xs text-stone-400">{distancesApprox ? `aprox. desde ${selectedCity} Centro` : 'de más cerca a más lejos'}</span>
        </div>
        {locationUi !== 'ready' && <div className="mb-1">{renderBlockedCard()}</div>}
        {sorted.length === 0 ? (
          <p className="text-xs text-stone-400 flex items-center gap-1.5 py-2"><MapPin className="w-3.5 h-3.5" /> Aún no hay alimentos con ubicación en esta zona.</p>
        ) : (
          sorted.map(({ pkg, km }, index) => {
            const w = formatWalk(km);
            const isActive = activePackage?.id === pkg.id;
            return (
              <button key={pkg.id} onClick={() => setActivePackage(pkg)} className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all mb-1.5 ${isActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 ring-1 ring-brand-500/20' : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 hover:border-stone-200 dark:hover:border-stone-700'}`}>
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black text-white" style={{ background: pkg.availableUnits <= 0 ? '#9ca3af' : urgencyColor(pkg.urgency) }}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{pkg.title}</p>
                  <p className="text-2xs text-stone-500 truncate">{pkg.storeName} · {pkg.availableUnits <= 0 ? 'agotado' : `${pkg.availableUnits} raciones`}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xs font-black text-brand-700 dark:text-brand-300">{w.cuadras} cuadras</p>
                  <p className="text-2xs text-stone-400 flex items-center justify-end gap-0.5"><Clock className="w-3 h-3" /> {w.min} min</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {activePackage && (
        <div className="p-3 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{activePackage.storeName}</span>
            </div>
            {getUrgencyBadge(activePackage.urgency)}
          </div>
          {activeWalk && (
            <div className="mb-2 space-y-1">
              {route ? (
                <p className="flex items-center gap-1 text-2xs text-blue-600 dark:text-blue-400 font-bold">
                  <Navigation className="w-3 h-3" /> Ruta por calles · {route.distanceKm.toFixed(1)} km · {Math.max(1, Math.round(route.durationMin))} min caminando
                </p>
              ) : routeLoading ? (
                <p className="flex items-center gap-1 text-2xs text-brand-600 dark:text-brand-400 font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Calculando la mejor ruta…
                </p>
              ) : (
                <p className="flex items-center gap-1 text-2xs text-brand-600 dark:text-brand-400 font-bold">
                  <Footprints className="w-3 h-3" /> {showDirectFallback ? 'Ruta directa (línea recta) · ' : ''}Tú ➜ tienda · {activeWalk.cuadras} cuadras · {activeWalk.min} min caminando
                </p>
              )}
            </div>
          )}
          {locationUi === 'ready' && !route && !routeLoading && (
            <p className="text-2xs text-stone-400 mb-2">{showDirectFallback ? 'Sin servicio de mapas en línea: distancia calculada en línea recta.' : ''}</p>
          )}
          <div className="flex items-center gap-3 text-2xs text-stone-500 mb-2 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {activePackage.storeAddress ? `${activePackage.storeAddress}, ` : ''}{activePackage.commune}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activePackage.pickupTimeStart}-{activePackage.pickupTimeEnd}</span>
          </div>
          {activePackage.lat && activePackage.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activePackage.lat},${activePackage.lng}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mb-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-500" /> Cómo llegar (Google Maps) <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {onSelectPackage && (
            <button onClick={() => onSelectPackage(activePackage)} disabled={activePackage.availableUnits <= 0} className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${activePackage.availableUnits <= 0 ? 'bg-stone-200 dark:bg-stone-700 text-stone-400' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'}`}>
              {activePackage.availableUnits <= 0 ? 'Agotado' : 'Reservar gratis'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};