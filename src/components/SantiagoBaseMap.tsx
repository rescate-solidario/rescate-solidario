import React, { useMemo } from 'react';
import { Polyline, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import { santiagoStreets } from '../data/santiagoStreets';

type LatLng = [number, number];

// Colores oficiales aproximados de las líneas de Metro
const METRO_COLORS: Record<string, string> = {
  L1: '#e2231a',
  L2: '#f4b400',
  L4: '#1d4f9c',
  L4A: '#3fa9f5',
  L5: '#00a650',
};

const METRO_NAMES: Record<string, string> = {
  L1: 'Metro Línea 1',
  L2: 'Metro Línea 2',
  L4: 'Metro Línea 4',
  L4A: 'Metro Línea 4A',
  L5: 'Metro Línea 5',
};

// Puntos de referencia conocidos para orientarse
const LANDMARKS: { name: string; pos: LatLng }[] = [
  { name: 'Plaza de Armas', pos: [-33.4378, -70.6505] },
  { name: 'La Moneda', pos: [-33.4429, -70.6540] },
  { name: 'Plaza Baquedano', pos: [-33.4370, -70.6345] },
  { name: 'Cerro San Cristóbal', pos: [-33.4255, -70.6330] },
  { name: 'Costanera Center', pos: [-33.4175, -70.6065] },
  { name: 'Estación Central', pos: [-33.4519, -70.6797] },
  { name: 'Parque O’Higgins', pos: [-33.4645, -70.6610] },
  { name: 'Estadio Nacional', pos: [-33.4645, -70.6107] },
];

const landmarkIcon = (name: string) =>
  L.divIcon({
    className: '',
    html: `<div class="landmark-label"><span class="landmark-dot"></span>${name}</div>`,
    iconSize: [0, 0],
    iconAnchor: [4, 4],
  });

const toLatLng = (lines: number[][][]): LatLng[][] => lines.map((l) => l.map(([lng, lat]) => [lat, lng] as LatLng));

interface Props {
  dark?: boolean;
}

/** Calles, avenidas y Metro de Santiago dibujados localmente (no necesitan internet). */
export const SantiagoBaseMap: React.FC<Props> = ({ dark = false }) => {
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const calles = useMemo(() => toLatLng(santiagoStreets.calles), []);
  const avenidas = useMemo(() => toLatLng(santiagoStreets.avenidas), []);
  const principales = useMemo(() => toLatLng(santiagoStreets.principales), []);
  const metro = useMemo(
    () => Object.entries(santiagoStreets.metro).map(([k, v]) => ({ id: k, pts: v.map(([lng, lat]) => [lat, lng] as LatLng) })),
    []
  );

  const c = dark
    ? { calle: '#3a3f39', avCasing: '#2a2f29', av: '#5a6058', prCasing: '#4a3d1c', pr: '#a8873a' }
    : { calle: '#d9d6cf', avCasing: '#cfcac0', av: '#ffffff', prCasing: '#e0b85a', pr: '#fbd889' };

  return (
    <>
      <Polyline positions={calles} pathOptions={{ color: c.calle, weight: 1.2, opacity: 1, interactive: false }} renderer={renderer} />
      <Polyline positions={avenidas} pathOptions={{ color: c.avCasing, weight: 4, opacity: 1, interactive: false }} renderer={renderer} />
      <Polyline positions={avenidas} pathOptions={{ color: c.av, weight: 2.5, opacity: 1, interactive: false }} renderer={renderer} />
      <Polyline positions={principales} pathOptions={{ color: c.prCasing, weight: 5.5, opacity: 1, interactive: false }} renderer={renderer} />
      <Polyline positions={principales} pathOptions={{ color: c.pr, weight: 3.5, opacity: 1, interactive: false }} renderer={renderer} />
      {metro.map((m) => (
        <Polyline
          key={m.id}
          positions={m.pts}
          pathOptions={{ color: METRO_COLORS[m.id] ?? '#666', weight: 3, opacity: 0.75 }}
        >
          <Tooltip sticky>{METRO_NAMES[m.id] ?? m.id}</Tooltip>
        </Polyline>
      ))}
      {LANDMARKS.map((l) => (
        <Marker key={l.name} position={l.pos} icon={landmarkIcon(l.name)} interactive={false} />
      ))}
    </>
  );
};

export const METRO_LEGEND = Object.entries(METRO_COLORS).map(([id, color]) => ({ id, color }));
