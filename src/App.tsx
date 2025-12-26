import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ToastOverlay } from './components/ToastOverlay';
import HomePage from './pages/HomePage';
import EmpirePage from './pages/EmpirePage';
import ShipPage from './pages/ShipPage';
import PlanetPage from './pages/PlanetPage';
import CharacterPage from './pages/CharacterPage';
import CombatPlanetaryPage from './pages/CombatPlanetaryPage';
import CombatFleetsPage from './pages/CombatFleetsPage';
import VictoryPage from './pages/VictoryPage';
import GameOverPage from './pages/GameOverPage';
import { useGameStore } from './store/gameStore';

export default function App() {
  const setup = useGameStore(s => s.setup);
  const winner = useGameStore(s => s.winnerEmpireId);
  const gameOverMessage = useGameStore(s => s.gameOverMessage);

  return (
    <div className="app">
      {setup ? <TopBar /> : null}
      <ToastOverlay />
      <div className="content">
        <Routes>
          {winner ? <Route path="/victory" element={<VictoryPage />} /> : null}
          {!winner && gameOverMessage ? <Route path="/gameover" element={<GameOverPage />} /> : null}
          <Route path="/" element={<HomePage />} />
          <Route path="/turn" element={setup ? (winner ? <Navigate to="/victory" replace /> : (gameOverMessage ? <Navigate to="/gameover" replace /> : <EmpirePage />)) : <Navigate to="/" replace />} />
          <Route path="/ship/:shipId" element={setup ? <ShipPage /> : <Navigate to="/" replace />} />
          <Route path="/planet/:planetId" element={setup ? <PlanetPage /> : <Navigate to="/" replace />} />
          <Route path="/character/:charId" element={setup ? <CharacterPage /> : <Navigate to="/" replace />} />
          <Route path="/combat/planetary" element={setup ? <CombatPlanetaryPage /> : <Navigate to="/" replace />} />
          <Route path="/combat/fleets" element={setup ? <CombatFleetsPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to={setup ? (winner ? '/victory' : (gameOverMessage ? '/gameover' : '/turn')) : '/'} replace />} />
        </Routes>
      </div>
    </div>
  );
}
