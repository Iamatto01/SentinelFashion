import { useState, useEffect, useCallback } from 'react';
import { db, initDb } from './lib/db';
import { askStylist } from './lib/groq';

// ========== Local Storage Helpers (Fallback) ==========
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

// ========== Custom Hook: useStore ==========
const initialWardrobe = [
  { id: 'w1', name: 'Black Graphic Tee', category: 'tops', subcategory: 't-shirt', colors: ['#000000'], pattern: 'graphic', season: ['summer', 'all'], occasion: ['casual'], image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400', brand: 'Nike', wearCount: 12 },
  { id: 'w2', name: 'Blue Denim Jacket', category: 'outerwear', subcategory: 'jacket', colors: ['#3b82f6'], pattern: 'solid', season: ['fall', 'spring'], occasion: ['casual'], image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400', brand: "Levi's", wearCount: 5 },
  { id: 'w3', name: 'Slim Fit Chinos', category: 'bottoms', subcategory: 'pants', colors: ['#d1d5db'], pattern: 'solid', season: ['all'], occasion: ['casual', 'work'], image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400', brand: 'Uniqlo', wearCount: 8 },
  { id: 'w4', name: 'White Sneakers', category: 'shoes', subcategory: 'sneakers', colors: ['#ffffff'], pattern: 'solid', season: ['all'], occasion: ['casual'], image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', brand: 'Adidas', wearCount: 20 },
  { id: 'w5', name: 'Silk Blouse', category: 'tops', subcategory: 'blouse', colors: ['#f472b6'], pattern: 'solid', season: ['spring', 'summer'], occasion: ['work', 'event'], image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=400', brand: 'Zara', wearCount: 3 },
  { id: 'w6', name: 'Tailored Trousers', category: 'bottoms', subcategory: 'pants', colors: ['#000000'], pattern: 'solid', season: ['all'], occasion: ['work', 'event'], image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', brand: 'H&M', wearCount: 15 },
  { id: 'w7', name: 'Leather Boots', category: 'shoes', subcategory: 'boots', colors: ['#000000'], pattern: 'solid', season: ['fall', 'winter'], occasion: ['casual', 'work'], image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=400', brand: 'Dr. Martens', wearCount: 7 },
  { id: 'w8', name: 'Silver Watch', category: 'accessories', subcategory: 'watch', colors: ['#e5e7eb'], pattern: 'solid', season: ['all'], occasion: ['casual', 'work', 'event'], image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', brand: 'Fossil', wearCount: 50 },
];

const initialOutfits = [
  { id: 'o1', name: 'Casual Weekend', items: ['w1', 'w2', 'w3', 'w4', 'w8'], rating: 4, wornCount: 5, aiScore: 85, lastWorn: new Date().toISOString() },
  { id: 'o2', name: 'Office Ready', items: ['w5', 'w6', 'w7', 'w8'], rating: 5, wornCount: 12, aiScore: 92, lastWorn: new Date(Date.now() - 86400000).toISOString() },
  { id: 'o3', name: 'Street Style', items: ['w1', 'w3', 'w4', 'w8'], rating: 3, wornCount: 2, aiScore: 78, lastWorn: new Date(Date.now() - 172800000).toISOString() }
];

export function useStore() {
  const [wardrobe, setWardrobe] = useState(() => {
    const stored = loadFromStorage('ss_wardrobe_v2', null);
    return stored && stored.length > 0 ? stored : initialWardrobe;
  });
  const [outfits, setOutfits] = useState(() => {
    const stored = loadFromStorage('ss_outfits_v2', null);
    return stored && stored.length > 0 ? stored : initialOutfits;
  });
  const [history, setHistory] = useState(() => loadFromStorage('ss_history_v2', []));
  const [isDbReady, setIsDbReady] = useState(false);
  const [profile, setProfile] = useState(() => loadFromStorage('ss_profile_v2', {
    name: 'Sarah',
    stylePersona: 'Modern Glass',
    preferences: { formalitySplit: 40, colorfulness: 50, trendiness: 60 }
  }));

  // Initialize Turso DB
  useEffect(() => {
    async function setup() {
      const ready = await initDb();
      setIsDbReady(ready);
      if (ready && db) {
        try {
          const w = await db.execute('SELECT * FROM wardrobe');
          if (w.rows.length > 0) {
            const mappedWardrobe = w.rows.map(r => ({
              ...r,
              colors: JSON.parse(r.colors || '[]'),
              season: JSON.parse(r.season || '[]'),
              occasion: JSON.parse(r.occasion || '[]')
            }));
            setWardrobe(mappedWardrobe);
          }
          const o = await db.execute('SELECT * FROM outfits');
          if (o.rows.length > 0) {
            setOutfits(o.rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]') })));
          }
        } catch (e) {
          console.error("Failed to load from Turso DB:", e);
        }
      }
    }
    setup();
  }, []);

  // Persist locally as fallback
  useEffect(() => { saveToStorage('ss_wardrobe_v2', wardrobe); }, [wardrobe]);
  useEffect(() => { saveToStorage('ss_outfits_v2', outfits); }, [outfits]);
  useEffect(() => { saveToStorage('ss_history_v2', history); }, [history]);
  useEffect(() => { saveToStorage('ss_profile_v2', profile); }, [profile]);

  // DB Sync helpers
  const syncToDb = useCallback(async (table, data) => {
    if (!isDbReady || !db) return;
    try {
      if (table === 'wardrobe') {
        await db.execute({
          sql: `INSERT OR REPLACE INTO wardrobe (id, name, category, subcategory, colors, pattern, season, occasion, image, brand, wearCount, lastWorn, createdAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [data.id, data.name, data.category, data.subcategory || '', JSON.stringify(data.colors), data.pattern || '', JSON.stringify(data.season), JSON.stringify(data.occasion), data.image || '', data.brand || '', data.wearCount || 0, data.lastWorn || '', data.createdAt || '']
        });
      } else if (table === 'outfits') {
        await db.execute({
          sql: `INSERT OR REPLACE INTO outfits (id, name, items, rating, wornCount, lastWorn, aiScore) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [data.id, data.name, JSON.stringify(data.items), data.rating || 0, data.wornCount || 0, data.lastWorn || '', data.aiScore || 0]
        });
      }
    } catch (error) {
      console.error(`DB Sync error for ${table}:`, error);
    }
  }, [isDbReady]);

  // Wardrobe CRUD
  const addItem = useCallback((item) => {
    const newItem = { ...item, id: Date.now().toString(), wearCount: 0, lastWorn: null, createdAt: new Date().toISOString() };
    setWardrobe(prev => [newItem, ...prev]);
    syncToDb('wardrobe', newItem);
    return newItem;
  }, [syncToDb]);

  const updateItem = useCallback((id, updates) => {
    setWardrobe(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      const target = updated.find(i => i.id === id);
      if (target) syncToDb('wardrobe', target);
      return updated;
    });
  }, [syncToDb]);

  const deleteItem = useCallback((id) => {
    setWardrobe(prev => prev.filter(item => item.id !== id));
    if (isDbReady && db) db.execute({ sql: `DELETE FROM wardrobe WHERE id = ?`, args: [id] }).catch(console.error);
  }, [isDbReady]);

  // Outfit CRUD
  const saveOutfit = useCallback((outfit) => {
    const newOutfit = { ...outfit, id: 'o' + Date.now(), rating: 0, wornCount: 0, aiScore: outfit.aiScore || 0 };
    setOutfits(prev => [newOutfit, ...prev]);
    syncToDb('outfits', newOutfit);
    return newOutfit;
  }, [syncToDb]);

  // Analytics
  const getStats = useCallback(() => {
    const totalItems = wardrobe.length;
    const totalOutfits = outfits.length;
    let historyCount = history ? history.length : 0;
    
    // Compute utilization
    const wornItems = wardrobe.filter(w => w.wearCount > 0).length;
    const utilization = totalItems > 0 ? Math.round((wornItems / totalItems) * 100) : 0;

    // Compute maps
    const colorMap = {};
    const categoryMap = {};
    wardrobe.forEach(w => {
      // colors
      if (w.colors && w.colors.length) {
         w.colors.forEach(c => { colorMap[c] = (colorMap[c] || 0) + 1; });
      } else {
         colorMap['Unknown'] = (colorMap['Unknown'] || 0) + 1;
      }
      
      // categories
      const cat = w.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const mostWorn = [...wardrobe].sort((a,b) => (b.wearCount || 0) - (a.wearCount || 0)).slice(0, 3);

    return { totalItems, totalOutfits, historyCount, utilization, colorMap, categoryMap, mostWorn };
  }, [wardrobe, outfits, history]);

  return {
    wardrobe, outfits, history, profile,
    addItem, updateItem, deleteItem,
    saveOutfit, setProfile, getStats,
  };
}

// ========== AI Functions ==========
export async function getGroqStylistAdvice(wardrobe, prompt) {
  const context = wardrobe.map(w => ({ id: w.id, category: w.category, colors: w.colors, subcategory: w.subcategory }));
  const response = await askStylist(prompt, context);
  return response;
}

// Mock fallback for immediate UX
export function generateOutfitSuggestion(wardrobe, occasion, weather, preferences) {
  const filtered = wardrobe.filter(item => {
    if (occasion && item.occasion && !item.occasion.includes(occasion)) return false;
    return true;
  });

  const tops = filtered.filter(i => i.category === 'tops');
  const bottoms = filtered.filter(i => i.category === 'bottoms');
  const shoes = filtered.filter(i => i.category === 'shoes');
  const accessories = filtered.filter(i => i.category === 'accessories');

  const pick = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
  const items = [pick(tops), pick(bottoms), pick(shoes), pick(accessories)].filter(Boolean);

  const score = 75 + Math.floor(Math.random() * 21);
  return {
    items: items.map(i => i.id),
    itemDetails: items,
    score,
    reason: 'This combination maximizes versatility and hits the aesthetic you requested.',
    occasion: occasion || 'casual',
    weather: weather || { temp: 28, condition: 'sunny' },
  };
}

export function compareOutfits(outfit1Items, outfit2Items, wardrobe, context) {
  const score1 = 70 + Math.floor(Math.random() * 26);
  const score2 = 70 + Math.floor(Math.random() * 26);
  return {
    outfitA: { items: outfit1Items, score: score1, style: 85, weather: 80, occasion: 75 },
    outfitB: { items: outfit2Items, score: score2, style: 80, weather: 85, occasion: 80 },
    winner: score1 >= score2 ? 'A' : 'B',
    reason: 'Outfit A has better color coordination.',
  };
}

export function autoTagClothing(file) {
  const categories = ['tops', 'bottoms', 'shoes', 'accessories', 'outerwear'];
  const colors = ['#FFFFFF', '#000000', '#1e3a5f'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  return {
    category,
    colors: [colors[Math.floor(Math.random() * colors.length)]],
    occasion: ['casual'],
    season: ['all'],
  };
}

export function getCategoryIcon(category) {
  const map = { tops: '👕', bottoms: '👖', shoes: '👟', accessories: '⌚', outerwear: '🧥' };
  return map[category] || '👔';
}

export function getOccasionEmoji(occasion) {
  const map = { casual: '😊', work: '💼', date: '❤️', gym: '💪', event: '🎉', formal: '👔' };
  return map[occasion] || '✨';
}

export function getColorHex(color) {
  if (color && color.startsWith('#')) return color;
  const map = { Black: '#000000', White: '#ffffff', Red: '#ef4444', Blue: '#3b82f6', Green: '#10b981' };
  return map[color] || color;
}
