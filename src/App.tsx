import { useEffect, useState, useMemo } from 'react';
import type { AuthUser, Clue, Direction, Friend, Tab } from '../types';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
import { clearStaleProgress, loadProgress, PROGRESS_VERSION, saveProgress } from '../lib/puzzles/progress';
import { INITIAL_FRIENDS, CURRENT_USER } from '../lib/atproto/mockFriends';
import { getCurrentUserRank, rankLeaderboard } from '../lib/leaderboard';
import { useCrossword } from '../hooks/useCrossword';
import { useTimer } from '../hooks/useTimer';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/layout/Header';
import { LoginGate } from '../components/layout/LoginGate';
import { CurrentClueBar } from '../components/crossword/CurrentClueBar';
import { Grid } from '../components/crossword/Grid';
import { CluesPanel } from '../components/crossword/CluesPanel';
import { LeaderboardPanel } from '../components/leaderboard/LeaderboardPanel';
import { CompletionModal } from '../components/modals/CompletionModal';

export default function App() {
  const auth = useAuth();
  const locked = auth.status !== 'signed-in';

  return (
    <>
      {/* key resets the grid and timer so the next account doesn't inherit them */}
      <Game key={auth.user?.did ?? 'signed-out'} user={auth.user} locked={locked} onLogout={auth.logout} />
      {locked && <LoginGate status={auth.status} onLogin={auth.login} />}
    </>
  );
}

interface GameProps {
  user?: AuthUser;
  locked: boolean;
  onLogout: () => void;
}

function Game({ user, locked, onLogout }: GameProps) {
  const puzzle = EASY_PUZZLE;

  // The player's saved progress for today's puzzle (ADR 0013), read once before the first
  // render so the grid and timer start where they left off. Nothing is loaded behind the
  // login gate; Game remounts with the account's key once the player signs in.
  const [saved] = useState(() => {
    if (!user) return null;
    clearStaleProgress(puzzle.date);
    return loadProgress(puzzle, user.did);
  });

  const [showModal, setShowModal] = useState(false);
  // Active side panel tab: 'clues' or 'leaderboard'
  const [activeTab, setActiveTab] = useState<Tab>('clues');
  // Frozen first completion score, saved with the rest of the progress
  const [userFirstScore, setUserFirstScore] = useState<number | null>(saved?.finalSeconds ?? null);

  const [timerActive, setTimerActive] = useState(!saved?.completed);
  const timer = useTimer({
    running: timerActive && !locked,
    initialElapsed: saved?.elapsedSeconds,
    initialPenalties: saved?.penaltySeconds,
  });

  // Stop the timer, freeze the first completion time and show the modal. Auto-fill falls back to 45s if the timer has not ticked yet.
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
    disabled: showModal || locked,
    onComplete: handleComplete,
    onPenalty: timer.addPenalty,
    initial: saved ?? undefined,
  });

  // Save on every change, including each timer tick (about 10-20 µs a write, ADR 0013).
  // Nothing is saved behind the login gate.
  useEffect(() => {
    if (!user) return;
    saveProgress({
      version: PROGRESS_VERSION,
      date: puzzle.date,
      did: user.did,
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
    user, puzzle.date, crossword.grid, crossword.revealed, crossword.incorrect, timer.elapsedSeconds,
    timer.penaltySeconds, crossword.revealCount, crossword.checkCount, crossword.isCompleted, userFirstScore,
  ]);

  const handleClueClick = (clue: Clue, dir: Direction) => {
    setActiveTab('clues');
    crossword.selectClue(clue, dir);
  };
  
  // Compute the Leaderboard ranking purely by elapsed time
  const leaderboard = useMemo(() => {
    const userEntry: Friend = { ...CURRENT_USER, timeSeconds: userFirstScore };
    return rankLeaderboard([...INITIAL_FRIENDS, userEntry]);
  }, [userFirstScore]);
  const currentUserRank = getCurrentUserRank(leaderboard.ranked);

  return (
    <div className={`app-container ${locked ? 'app-locked' : ''}`} inert={locked}>
      <Header
        secondsElapsed={timer.displayedSeconds}
        recentPenalty={timer.recentPenalty}
        user={user}
        onLogout={onLogout}
      />
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

          {/* Solving help (ADR 0008 penalties), plus a dev-only testing control */}
          <div className="controls-bar">
            {/* Penalty buttons don't take focus on click, so a later Enter keypress
                can't trigger them again and charge the penalty twice. */}
            <button
              className="btn btn-secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={crossword.revealCell}
              disabled={crossword.isCompleted}
              title="Fill the selected square with its answer (+10s)"
            >
              Reveal square
            </button>
            <button
              className="btn btn-secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={crossword.checkPuzzle}
              disabled={crossword.isCompleted}
              title="Mark every wrong letter in the grid (+30s)"
            >
              Check puzzle
            </button>
            {/* Stripped from production builds */}
            {import.meta.env.DEV && (
              <button
                className="btn btn-test"
                onClick={crossword.autoFill}
                title="Automatically fills the correct solution to test completion and leaderboard"
              >
                ⚡ Quick Fill (Test Solved)
              </button>
            )}
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
          puzzleDate={puzzle.date}
          secondsElapsed={timer.secondsElapsed}
          currentUserRank={currentUserRank}
          ranked={leaderboard.ranked}
          onViewLeaderboard={() => {
            setShowModal(false);
            setActiveTab('leaderboard');
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
