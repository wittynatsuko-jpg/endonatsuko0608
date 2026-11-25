import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { boardSize, generateLevel, isCovered, shuffleUntilPlayable, TILE_SIZE } from './levelGenerator';
import { Tile } from './types';

export default function GameScreen() {
  const [tiles, setTiles] = useState<Tile[]>(() => generateLevel());
  const [selected, setSelected] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const remaining = tiles.filter((t) => !t.removed).length;
  const total = tiles.length;
  const won = remaining === 0;

  const { width: boardW, height: boardH } = useMemo(() => boardSize(tiles), [tiles]);
  const { width: screenW } = useWindowDimensions();
  const scale = Math.min(1, (screenW - 32) / boardW);

  const isDeadlocked = useMemo(() => {
    const available = tiles.filter((t) => !t.removed && !isCovered(t, tiles));
    const bySymbol: Record<string, number> = {};
    available.forEach((t) => (bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + 1));
    return !won && !Object.values(bySymbol).some((c) => c >= 3);
  }, [tiles, won]);

  // Debug hooks for automated / web testing — harmless in production.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const available = tiles.filter((t) => !t.removed && !isCovered(t, tiles));
      // @ts-ignore
      window.__GAME_STATE__ = { tiles, selected, remaining, total, won, isDeadlocked, available };
    }
  }, [tiles, selected, remaining, total, won, isDeadlocked]);

  const handlePress = useCallback(
    (tile: Tile) => {
      if (tile.removed || won) return;
      if (isCovered(tile, tiles)) return;

      if (selected.includes(tile.id)) {
        setSelected((prev) => prev.filter((id) => id !== tile.id));
        return;
      }

      const nextSelected = [...selected, tile.id];
      setMoves((m) => m + 1);

      const sameSymbolIds = nextSelected.filter((id) => {
        const t = tiles.find((tt) => tt.id === id);
        return t && t.symbol === tile.symbol;
      });

      if (sameSymbolIds.length >= 3) {
        const toRemove = new Set(sameSymbolIds.slice(0, 3));
        setTiles((prev) => prev.map((t) => (toRemove.has(t.id) ? { ...t, removed: true } : t)));
        setSelected((prev) => prev.filter((id) => !toRemove.has(id)));
      } else {
        setSelected(nextSelected);
      }
    },
    [selected, tiles, won]
  );

  const handleShuffle = useCallback(() => {
    setTiles((prev) => shuffleUntilPlayable(prev));
    setSelected([]);
  }, []);

  const handleNewGame = useCallback(() => {
    setTiles(generateLevel());
    setSelected([]);
    setMoves(0);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>トリプルタイル</Text>
      <Text style={styles.status}>
        残り {remaining} / {total}　手数 {moves}
      </Text>

      <ScrollView contentContainerStyle={styles.boardScroll}>
        <View style={{ width: boardW * scale, height: boardH * scale }}>
          {tiles
            .filter((t) => !t.removed)
            .map((tile) => {
              const covered = isCovered(tile, tiles);
              const isSelected = selected.includes(tile.id);
              return (
                <TouchableOpacity
                  key={tile.id}
                  testID={tile.id}
                  disabled={covered}
                  onPress={() => handlePress(tile)}
                  style={[
                    styles.tile,
                    {
                      left: tile.x * scale,
                      top: tile.y * scale,
                      width: TILE_SIZE * scale,
                      height: TILE_SIZE * scale,
                      zIndex: tile.layer,
                      opacity: covered ? 0.45 : 1,
                      borderColor: isSelected ? '#ff5252' : '#333333',
                      borderWidth: isSelected ? 3 : 1,
                      backgroundColor: covered ? '#cfcfcf' : '#fffdf5',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 24 * scale }}>{tile.symbol}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>

      {isDeadlocked && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>揃えられる組み合わせがありません</Text>
          <TouchableOpacity style={styles.button} onPress={handleShuffle} testID="shuffle-button">
            <Text style={styles.buttonText}>シャッフル</Text>
          </TouchableOpacity>
        </View>
      )}

      {won && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>クリア！ 🎉（手数 {moves}）</Text>
          <TouchableOpacity style={styles.button} onPress={handleNewGame}>
            <Text style={styles.buttonText}>もう一度</Text>
          </TouchableOpacity>
        </View>
      )}

      {!won && !isDeadlocked && (
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShuffle} testID="shuffle-button">
          <Text style={styles.secondaryButtonText}>シャッフル</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1f2a37', alignItems: 'center', paddingTop: 56 },
  title: { fontSize: 28, color: '#f0e6c7', fontWeight: '600', marginBottom: 8 },
  status: { color: '#d9d0b7', marginBottom: 16 },
  boardScroll: { alignItems: 'center', paddingBottom: 24 },
  tile: {
    position: 'absolute',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { marginTop: 12, alignItems: 'center' },
  bannerText: { color: '#fff', marginBottom: 8, fontSize: 16 },
  button: { backgroundColor: '#b89d59', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  buttonText: { color: '#1f2a37', fontWeight: '700' },
  secondaryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d9d0b7',
    borderRadius: 16,
  },
  secondaryButtonText: { color: '#d9d0b7' },
});
