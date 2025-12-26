import React from 'react';
import { useGameStore } from '../store/gameStore';

function randD6() {
  return Math.floor(Math.random() * 6) + 1;
}

type RollingState = {
  d1: boolean;
  d2: boolean;
};

/**
 * Two independent D6 dice.
 * - Dice 1 (row 1) shows its current face + a button to roll it.
 * - Dice 2 (row 2) shows its current face + a button to roll it.
 * - A third button rolls both.
 * Includes a short animation (faces flicker) before settling.
 */
export function DiceD6() {
  const die1 = useGameStore((s) => s.die1 ?? 1);
  const die2 = useGameStore((s) => s.die2 ?? 1);
  const rollDie1 = useGameStore((s) => s.rollDie1);
  const rollDie2 = useGameStore((s) => s.rollDie2);
  const rollDice = useGameStore((s) => s.rollDice);
  const rollBoth = useGameStore((s) => s.rollBoth);

  const [rolling, setRolling] = React.useState<RollingState>({ d1: false, d2: false });
  const [display1, setDisplay1] = React.useState<number>(die1);
  const [display2, setDisplay2] = React.useState<number>(die2);

  React.useEffect(() => setDisplay1(die1), [die1]);
  React.useEffect(() => setDisplay2(die2), [die2]);

  const animate = React.useCallback(
    async (which: 'd1' | 'd2' | 'both') => {
      // prevent overlapping animations
      if (rolling.d1 || rolling.d2) return;

      const rollDurationMs = 750;
      const tickMs = 85;

      setRolling({ d1: which === 'd1' || which === 'both', d2: which === 'd2' || which === 'both' });

      const start = Date.now();
      const timer = window.setInterval(() => {
        if (which === 'd1' || which === 'both') setDisplay1(randD6());
        if (which === 'd2' || which === 'both') setDisplay2(randD6());

        if (Date.now() - start >= rollDurationMs) {
          window.clearInterval(timer);

          // Commit the real roll at the end so the UI feels consistent.
          if (which === 'd1') rollDie1();
          else if (which === 'd2') rollDie2();
          else rollDice();

          // rolling flags will be reset on the next tick.
          setTimeout(() => setRolling({ d1: false, d2: false }), 0);
        }
      }, tickMs);
    },
    [rollDie1, rollDie2, rollDice, rolling.d1, rolling.d2]
  );

  return (
    <div className="dicePanel">
      <div className="diceRow">
        <div className={"diceFace " + (rolling.d1 ? 'dice--rolling' : '')} aria-label="Dado 1">
          {display1}
        </div>
        <button className="btn" onClick={() => animate('d1')} disabled={rolling.d1 || rolling.d2}>
          Tirar dado 1
        </button>
      </div>

      <div className="diceRow">
        <div className={"diceFace " + (rolling.d2 ? 'dice--rolling' : '')} aria-label="Dado 2">
          {display2}
        </div>
        <button className="btn" onClick={() => animate('d2')} disabled={rolling.d1 || rolling.d2}>
          Tirar dado 2
        </button>
      </div>

      <div className="diceRow diceRow--both">
        <button className="btn" onClick={() => animate('both')} disabled={rolling.d1 || rolling.d2}>
          Tirar 2 dados
        </button>
      </div>
    </div>
  );
}

export default DiceD6;
