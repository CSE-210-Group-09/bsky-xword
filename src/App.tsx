import { useState, useMemo } from 'react';
import type { Clue, Direction, Friend, Tab } from '../types';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
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

  const [showModal, setShowModal] = useState(false);
  // Active side panel tab: 'clues' or 'leaderboard'
  const [activeTab, setActiveTab] = useState<Tab>('clues');
  // Frozen first completion score (purely in-memory, resets on browser refresh)
  const [userFirstScore, setUserFirstScore] = useState<number | null>(null);

  const [timerActive, setTimerActive] = useState(true);
  const timer = useTimer(timerActive);

  // Stop the timer, freeze the first completion time (never overwritten on reattempt)
  // and show the modal. Auto-fill falls back to 45s if the timer has not ticked yet.
  const handleComplete = (assisted: boolean) => {
    setTimerActive(false);
    setUserFirstScore((prev) => {
      if (prev === null) {
        return assisted && timer.secondsElapsed <= 0 ? 45 : timer.secondsElapsed;
      }
      return prev;
    });
    setShowModal(true);
  };

  const crossword = useCrossword(puzzle, { disabled: showModal, onComplete: handleComplete });

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
      <Header secondsElapsed={timer.secondsElapsed} />
      <CurrentClueBar activeClue={crossword.activeClue} direction={crossword.direction} />

      <main className="puzzle-layout">
        <div className="grid-container">
          <Grid
            puzzle={puzzle}
            grid={crossword.grid}
            selectedCell={crossword.selectedCell}
            direction={crossword.direction}
            activeClue={crossword.activeClue}
            onCellClick={crossword.selectCell}
          />

          {/* Quick testing controls */}
          <div className="controls-bar">
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
