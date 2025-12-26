import React from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { PlanetSheet } from '../components/PlanetSheet';
import { useGameStore } from '../store/gameStore';

export default function PlanetPage() {
  const { planetId } = useParams();
  const store = useGameStore();
  const planet = planetId ? store.planets[planetId] : undefined;

  if (!planetId || !planet) {
    return (
      <div className="page">
        <p>Planeta no encontrado.</p>
        <BackButton />
      </div>
    );
  }

  const beforeBack = () => {
    // If the user opened an empty planet slot but never assigned a number, discard the placeholder.
    // Never discard a natal-planet slot (slot index 0 for any empire).
    const isNatalSlot = Object.values(store.empirePlanetSlots).some((slots) => slots?.[0] === planetId);
    if (!isNatalSlot && (planet.number === undefined || planet.number === null)) {
      store.discardPlanetIfUnnumbered(planetId);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="row between">
          <h2>Ficha de planeta</h2>
          <BackButton beforeBack={beforeBack} />
        </div>
        <PlanetSheet planetId={planetId} mode="full" />
      </div>
    </div>
  );
}
