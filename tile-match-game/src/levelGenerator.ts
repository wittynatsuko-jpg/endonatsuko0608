import { Tile } from './types';

export const TILE_SIZE = 48;

const SYMBOLS = ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🍍', '🥝', '🥥', '🍋', '🍉', '🍈'];

type LayerDef = { cols: number; rows: number };

function buildLayerDefs(layerCount: number, baseCols: number, baseRows: number): LayerDef[] {
  const defs: LayerDef[] = [];
  let cols = baseCols;
  let rows = baseRows;
  for (let i = 0; i < layerCount; i++) {
    if (cols < 1 || rows < 1) break;
    defs.push({ cols, rows });
    cols -= 1;
    rows -= 1;
  }
  return defs;
}

function layerCells(layerIndex: number, def: LayerDef) {
  const cells: { x: number; y: number }[] = [];
  const offset = layerIndex * (TILE_SIZE / 2);
  for (let r = 0; r < def.rows; r++) {
    for (let c = 0; c < def.cols; c++) {
      cells.push({ x: offset + c * TILE_SIZE, y: offset + r * TILE_SIZE });
    }
  }
  return cells;
}

export function generateLevel(
  layerCount = 3,
  baseCols = 6,
  baseRows = 5,
  numSymbolTypes = 8
): Tile[] {
  const defs = buildLayerDefs(layerCount, baseCols, baseRows);
  const cells: { x: number; y: number; layer: number }[] = [];
  defs.forEach((def, layer) => {
    layerCells(layer, def).forEach((c) => cells.push({ ...c, layer }));
  });

  // Trim down to a multiple of 3 (every symbol must appear in sets of 3),
  // removing from the base layer first since it has the most slack.
  while (cells.length % 3 !== 0) {
    const idx = cells.findIndex((c) => c.layer === 0);
    cells.splice(idx !== -1 ? idx : 0, 1);
  }

  const tripleCount = cells.length / 3;
  const typesCount = Math.max(1, Math.min(numSymbolTypes, SYMBOLS.length, tripleCount));
  const triplesPerType = new Array(typesCount).fill(0);
  for (let i = 0; i < tripleCount; i++) {
    triplesPerType[i % typesCount] += 1;
  }

  const symbolPool: string[] = [];
  triplesPerType.forEach((triples, i) => {
    for (let t = 0; t < triples * 3; t++) symbolPool.push(SYMBOLS[i]);
  });

  shuffleInPlace(symbolPool);

  const tiles: Tile[] = cells.map((cell, i) => ({
    id: `t${i}`,
    symbol: symbolPool[i],
    layer: cell.layer,
    x: cell.x,
    y: cell.y,
    removed: false,
  }));

  return shuffleUntilPlayable(tiles);
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function boardSize(tiles: Tile[]) {
  const maxX = Math.max(...tiles.map((t) => t.x)) + TILE_SIZE;
  const maxY = Math.max(...tiles.map((t) => t.y)) + TILE_SIZE;
  return { width: maxX, height: maxY };
}

export function isCovered(tile: Tile, tiles: Tile[]): boolean {
  if (tile.removed) return false;
  const threshold = TILE_SIZE * 0.75;
  return tiles.some(
    (other) =>
      !other.removed &&
      other.layer > tile.layer &&
      Math.abs(other.x - tile.x) < threshold &&
      Math.abs(other.y - tile.y) < threshold
  );
}

function isDeadlockedTiles(tiles: Tile[]): boolean {
  const available = tiles.filter((t) => !t.removed && !isCovered(t, tiles));
  const bySymbol: Record<string, number> = {};
  available.forEach((t) => (bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + 1));
  return available.length > 0 && !Object.values(bySymbol).some((c) => c >= 3);
}

/**
 * Reshuffles symbols among the non-removed tiles (keeping positions/layers)
 * until at least one triplet is reachable, so players never face an
 * immediate dead end with nothing clickable to do.
 */
export function shuffleUntilPlayable(tiles: Tile[], maxAttempts = 200): Tile[] {
  let result = tiles;
  for (let attempt = 0; attempt < maxAttempts && isDeadlockedTiles(result); attempt++) {
    const symbols = result.filter((t) => !t.removed).map((t) => t.symbol);
    shuffleInPlace(symbols);
    let i = 0;
    result = result.map((t) => (t.removed ? t : { ...t, symbol: symbols[i++] }));
  }
  return result;
}
