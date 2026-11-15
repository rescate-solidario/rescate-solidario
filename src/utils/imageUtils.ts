import React from 'react';

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Lácteos: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
  Panadería: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
  'Frutas y Verduras': 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=600&auto=format&fit=crop&q=80',
  Abarrotes: 'https://images.unsplash.com/photo-1584473457406-6df3a6372104?w=600&auto=format&fit=crop&q=80',
  'Platos Preparados': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
};

export const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
export const DEFAULT_STORE_LOGO = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=150&auto=format&fit=crop&q=80';

const CATEGORY_EMOJI: Record<string, [string, string, string]> = {
  Lácteos: ['🥛', '#e0f2fe', '#bae6fd'],
  Panadería: ['🥖', '#fef3c7', '#fde68a'],
  'Frutas y Verduras': ['🥬', '#dcfce7', '#bbf7d0'],
  Abarrotes: ['🥫', '#fee2e2', '#fecaca'],
  'Platos Preparados': ['🍲', '#ffedd5', '#fed7aa'],
  'Mix Variado': ['🧺', '#ede9fe', '#ddd6fe'],
};

/** Imagen dibujada localmente (sin internet) para cuando las fotos remotas no cargan */
export function localPlaceholder(category?: string, isLogo = false): string {
  const [emoji, c1, c2] = (category && CATEGORY_EMOJI[category]) || (isLogo ? ['🏪', '#dcfce7', '#bbf7d0'] : ['🥗', '#dcfce7', '#bbf7d0']);
  const w = isLogo ? 150 : 600;
  const h = isLogo ? 150 : 400;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="54%" font-size="${isLogo ? 80 : 160}" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string
) {
  const target = e.currentTarget;
  const fallback = (category && CATEGORY_FALLBACK_IMAGES[category]) || DEFAULT_FOOD_IMAGE;
  if (target.dataset.fallbackStep === '2') return;
  if (target.dataset.fallbackStep !== '1' && target.src !== fallback) {
    target.dataset.fallbackStep = '1';
    target.src = fallback;
  } else {
    target.dataset.fallbackStep = '2';
    target.src = localPlaceholder(category);
  }
}

export function handleLogoError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.dataset.fallbackStep === '2') return;
  if (target.dataset.fallbackStep !== '1' && target.src !== DEFAULT_STORE_LOGO) {
    target.dataset.fallbackStep = '1';
    target.src = DEFAULT_STORE_LOGO;
  } else {
    target.dataset.fallbackStep = '2';
    target.src = localPlaceholder(undefined, true);
  }
}
