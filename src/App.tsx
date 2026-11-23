import { useEffect, useState, useMemo } from 'react';
import type { Clue, Direction, Friend, Tab } from '../types';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
import { clearStaleProgress, loadProgress, PROGRESS_VERSION, saveProgress } from '../lib/puzzles/progress';
import { INITIAL_FRIENDS, CURRENT_USER } from '../lib/atproto/mockFriends';
import { getCurrentUserRank, rankLeaderboard } from '../lib/leaderboard';
import { useCrossword } from '../hooks/useCrossword';
import { useTimer } from '../hooks/useTimer';
import { Header } from '../components/layout/Header';
import { CurrentClueBar } from '../components/crossword/CurrentClueBar';
import { Grid } from '../components/crossword/Grid';
import { CluesPanel } from '../components/crossword/CluesPanel';
import { LeaderboardPanel } from '../components/leaderboard/LeaderboardPanel';
import { CompletionModal } from '../components/modals/CompletionModal';

export default function App() {
  const puzzle = EASY_PUZZLE;

  // Progress saved in this browser for today's puzzle (ADR 0013), read once before the
  // first render so the grid and timer start where the player left off.
  const [saved] = useState(() => {
    clearStaleProgress(puzzle.date);
    return loadProgress(puzzle);
  });

  const [showModal, setShowModal] = useState(false);
  // Active side panel tab: 'clues' or 'leaderboard'
  const [activeTab, setActiveTab] = useState<Tab>('clues');
  // Frozen first completion score, saved with the rest of the progress
  const [userFirstScore, setUserFirstScore] = useState<number | null>(saved?.finalSeconds ?? null);

  const [timerActive, setTimerActive] = useState(!saved?.completed);
  const timer = useTimer({
    running: timerActive,
    initialElapsed: saved?.elapsedSeconds,
    initialPenalties: saved?.penaltySeconds,
  });

  // Stop the timer, freeze the first completion time (never overwritten on reattempt)
  // and show the modal. Auto-fill falls back to 45s if the timer has not ticked yet.
  // getTotalSeconds() includes a penalty from the same click, e.g. revealing the last square.
  const handleComplete = (assisted: boolean) => {
    setTimerActive(false);
    const total = timer.getTotalSeconds();
    setUserFirstScore((prev) => {
      if (prev === null) {
        return assisted && total <= 0 ? 45 : total;
      }
      return prev;
    });
    setShowModal(true);
  };

  const crossword = useCrossword(puzzle, {
    disabled: showModal,
    onComplete: handleComplete,
    onPenalty: timer.addPenalty,
    initial: saved ?? undefined,
  });

  // Save on every change, including each timer tick (about 10-20 µs a write, ADR 0013)
  useEffect(() => {
    saveProgress({
      version: PROGRESS_VERSION,
      date: puzzle.date,
      grid: crossword.grid,
      revealed: crossword.revealed,
      incorrect: crossword.incorrect,
      elapsedSeconds: timer.elapsedSeconds,
      penaltySeconds: timer.penaltySeconds,
      revealCount: crossword.revealCount,
      checkCount: crossword.checkCount,
      completed: crossword.isCompleted,
      finalSeconds: userFirstScore,
    });
  }, [
    puzzle.date, crossword.grid, crossword.revealed, crossword.incorrect, timer.elapsedSeconds,
    timer.penaltySeconds, crossword.revealCount, crossword.checkCount, crossword.isCompleted, userFirstScore,
  ]);

  const handleClueClick = (clue: Clue, dir: Direction) => {
    setActiveTab('clues');
    crossword.selectClue(clue, dir);
  };

  // Reset grid for a reattempt (does NOT reset userFirstScore)
  const handleReset = () => {
    crossword.reset();
    timer.reset();
    setTimerActive(true);
    setShowModal(false);
  };

  // Compute the Leaderboard ranking purely by elapsed time
  const leaderboard = useMemo(() => {
    const userEntry: Friend = { ...CURRENT_USER, timeSeconds: userFirstScore };
    return rankLeaderboard([...INITIAL_FRIENDS, userEntry]);
  }, [userFirstScore]);
  const currentUserRank = getCurrentUserRank(leaderboard.ranked);

  return (
    <div className="app-container">
      <Header secondsElapsed={timer.displayedSeconds} recentPenalty={timer.recentPenalty} />
      <CurrentClueBar activeClue={crossword.activeClue} direction={crossword.direction} />

      <main className="puzzle-layout">
        <div className="grid-container">
          <Grid
            puzzle={puzzle}
            grid={crossword.grid}
            revealed={crossword.revealed}
            incorrect={crossword.incorrect}
            selectedCell={crossword.selectedCell}
            direction={crossword.direction}
            activeClue={crossword.activeClue}
            onCellClick={crossword.selectCell}
          />

          {/* Solving help (ADR 0008 penalties) and quick testing controls */}
          <div className="controls-bar">
            <button
              className="btn btn-secondary"
              onClick={crossword.revealCell}
              disabled={crossword.isCompleted}
              title="Fill the selected square with its answer (+10s)"
            >
              Reveal square
            </button>
            <button
              className="btn btn-secondary"
              onClick={crossword.checkPuzzle}
              disabled={crossword.isCompleted}
              title="Mark every wrong letter in the grid (+30s)"
            >
              Check puzzle
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset Puzzle
            </button>
            <button
              className="btn btn-test"
              onClick={crossword.autoFill}
              title="Automatically fills the correct solution to test completion and leaderboard"
            >
              ⚡ Quick Fill (Test Solved)
            </button>
          </div>
        </div>

        {/* Side Panel with Tabs (Clues & Friends Leaderboard) */}
        <div className="side-panel">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'clues' ? 'active' : ''}`}
              onClick={() => setActiveTab('clues')}
            >
              📝 Clues
            </button>
            <button
              className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              👥 Friends Leaderboard
              {currentUserRank !== null && <span className="tab-pill">#{currentUserRank}</span>}
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'clues' && (
              <CluesPanel
                clues={puzzle.clues}
                direction={crossword.direction}
                activeClue={crossword.activeClue}
                onClueClick={handleClueClick}
              />
            )}
            {activeTab === 'leaderboard' && (
              <LeaderboardPanel
                ranked={leaderboard.ranked}
                unranked={leaderboard.unranked}
                userFirstScore={userFirstScore}
                currentUserRank={currentUserRank}
              />
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <CompletionModal
          secondsElapsed={timer.secondsElapsed}
          currentUserRank={currentUserRank}
          ranked={leaderboard.ranked}
          onViewLeaderboard={() => {
            setShowModal(false);
            setActiveTab('leaderboard');
          }}
          onClose={() => setShowModal(false)}
          onPlayAgain={handleReset}
        />
      )}
    </div>
  );
}
