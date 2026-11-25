import { StatusBar } from 'expo-status-bar';
import GameScreen from './src/GameScreen';

export default function App() {
  return (
    <>
      <GameScreen />
      <StatusBar style="light" />
    </>
  );
}
