import React from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { useGameStore } from '../store/gameStore';
import { ShipSheet } from '../components/ShipSheet';

export default function ShipPage() {
  const { shipId } = useParams();
  const store = useGameStore();
  const ship = shipId ? store.ships[shipId] : undefined;

  if (!shipId || !ship) {
    return (
      <div className="page">
        <p>Nave no encontrada.</p>
        <BackButton />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h2>Ficha de nave</h2>
          <BackButton />
        </div>
        <ShipSheet shipId={shipId} mode="full" />
      </div>
    </div>
  );
}
