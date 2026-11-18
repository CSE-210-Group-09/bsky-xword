import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CellPosition, Clue, Direction, Friend, RankedFriend, Tab } from '../types';
import { EASY_PUZZLE } from '../lib/puzzles/puzzleData';
import { INITIAL_FRIENDS, CURRENT_USER } from '../lib/atproto/mockFriends';

export default function App() {
  const puzzle = EASY_PUZZLE;
  const size = puzzle.size;

  // Grid state: 5x5 array of strings (empty string for unfilled)
  const [grid, setGrid] = useState<string[][]>(() =>
    Array(size).fill(null).map(() => Array(size).fill(''))
  );

  // Selected cell & direction
  const [selectedCell, setSelectedCell] = useState<CellPosition>({ row: 0, col: 0 });
  const [direction, setDirection] = useState<Direction>('across');

  // Timer & completion states
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  // Not read yet; reserved for marking assisted solves on the leaderboard.
  const [_isAssisted, setIsAssisted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Active side panel tab: 'clues' or 'leaderboard'
  const [activeTab, setActiveTab] = useState<Tab>('clues');

  // Frozen first completion score (purely in-memory, resets on browser refresh)
  const [userFirstScore, setUserFirstScore] = useState<number | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timerActive && !isCompleted) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isCompleted]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number | null | undefined): string => {
    if (totalSeconds === null || totalSeconds === undefined) return '--:--';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to check if a cell is black
  const isBlack = useCallback(
    (r: number, c: number): boolean => {
      if (r < 0 || r >= size || c < 0 || c >= size) return true;
      return puzzle.solution[r][c] === '#';
    },
    [puzzle, size]
  );

  // Check puzzle completion
  const checkCompletion = useCallback(
    (currentGrid: string[][]): boolean => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!isBlack(r, c)) {
            if (currentGrid[r][c].toUpperCase() !== puzzle.solution[r][c].toUpperCase()) {
              return false;
            }
          }
        }
      }
      return true;
    },
    [puzzle, size, isBlack]
  );

  // Advance cursor to next white cell in current direction
  const advanceCursor = useCallback(
    (r: number, c: number, dir: Direction): CellPosition => {
      let nextR = r;
      let nextC = c;
      if (dir === 'across') {
        nextC += 1;
        while (nextC < size && isBlack(nextR, nextC)) nextC += 1;
        if (nextC < size) return { row: nextR, col: nextC };
      } else {
        nextR += 1;
        while (nextR < size && isBlack(nextR, nextC)) nextR += 1;
        if (nextR < size) return { row: nextR, col: nextC };
      }
      return { row: r, col: c };
    },
    [size, isBlack]
  );

  // Retreat cursor backward
  const retreatCursor = useCallback(
    (r: number, c: number, dir: Direction): CellPosition => {
      let prevR = r;
      let prevC = c;
      if (dir === 'across') {
        prevC -= 1;
        while (prevC >= 0 && isBlack(prevR, prevC)) prevC -= 1;
        if (prevC >= 0) return { row: prevR, col: prevC };
      } else {
        prevR -= 1;
        while (prevR >= 0 && isBlack(prevR, prevC)) prevR -= 1;
        if (prevR >= 0) return { row: prevR, col: prevC };
      }
      return { row: r, col: c };
    },
    [isBlack]
  );

  // Cell click
  const handleCellClick = (r: number, c: number) => {
    if (isBlack(r, c)) return;
    if (selectedCell.row === r && selectedCell.col === c) {
      setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ row: r, col: c });
    }
  };

  // Find active clue based on selected cell & direction
  const getActiveClue = useCallback((): Clue | undefined => {
    const list = puzzle.clues[direction];
    if (direction === 'across') {
      return (
        list.find(
          (clue) =>
            clue.row === selectedCell.row &&
            selectedCell.col >= clue.col &&
            selectedCell.col < clue.col + clue.length
        ) || list[0]
      );
    } else {
      return (
        list.find(
          (clue) =>
            clue.col === selectedCell.col &&
            selectedCell.row >= clue.row &&
            selectedCell.row < clue.row + clue.length
        ) || list[0]
      );
    }
  }, [puzzle, direction, selectedCell]);

  const activeClue = getActiveClue();

  // Check if cell is in active word
  const isCellInActiveWord = (r: number, c: number): boolean => {
    if (!activeClue) return false;
    if (direction === 'across') {
      return (
        r === activeClue.row &&
        c >= activeClue.col &&
        c < activeClue.col + activeClue.length
      );
    } else {
      return (
        c === activeClue.col &&
        r >= activeClue.row &&
        r < activeClue.row + activeClue.length
      );
    }
  };

  // Keyboard navigation & typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showModal) return;

      const { row, col } = selectedCell;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        let c = col + 1;
        while (c < size && isBlack(row, c)) c++;
        if (c < size) setSelectedCell({ row, col: c });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let c = col - 1;
        while (c >= 0 && isBlack(row, c)) c--;
        if (c >= 0) setSelectedCell({ row, col: c });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let r = row + 1;
        while (r < size && isBlack(r, col)) r++;
        if (r < size) setSelectedCell({ row: r, col });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let r = row - 1;
        while (r >= 0 && isBlack(r, col)) r--;
        if (r >= 0) setSelectedCell({ row: r, col });
      } else if (e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const currentLetter = grid[row][col];
        if (currentLetter !== '') {
          const newGrid = grid.map((rArr, rIdx) =>
            rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? '' : val))
          );
          setGrid(newGrid);
        } else {
          const prev = retreatCursor(row, col, direction);
          const newGrid = grid.map((rArr, rIdx) =>
            rArr.map((val, cIdx) => (rIdx === prev.row && cIdx === prev.col ? '' : val))
          );
          setGrid(newGrid);
          setSelectedCell(prev);
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        const char = e.key.toUpperCase();
        const newGrid = grid.map((rArr, rIdx) =>
          rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? char : val))
        );
        setGrid(newGrid);

        // Check if finished
        if (checkCompletion(newGrid)) {
          setIsCompleted(true);
          setTimerActive(false);

          // Freeze first completion time (never overwritten on reattempt)
          setUserFirstScore((prev) => {
            if (prev === null) {
              return secondsElapsed;
            }
            return prev;
          });

          setShowModal(true);
        } else {
          const next = advanceCursor(row, col, direction);
          setSelectedCell(next);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, direction, grid, isBlack, size, advanceCursor, retreatCursor, checkCompletion, showModal, secondsElapsed]);

  // Clue item click
  const handleClueClick = (clue: Clue, dir: Direction) => {
    setActiveTab('clues');
    setDirection(dir);
    setSelectedCell({ row: clue.row, col: clue.col });
  };

  // Quick Auto-Fill for testing
  const handleAutoFill = () => {
    const solved = puzzle.solution.map((row) =>
      row.map((cell) => (cell === '#' ? '' : cell))
    );
    setGrid(solved);
    setIsAssisted(true);
    setIsCompleted(true);
    setTimerActive(false);

    // Freeze first completion score
    setUserFirstScore((prev) => {
      if (prev === null) {
        return secondsElapsed > 0 ? secondsElapsed : 45;
      }
      return prev;
    });

    setShowModal(true);
  };

  // Reset grid for a reattempt (does NOT reset userFirstScore)
  const handleReset = () => {
    setGrid(Array(size).fill(null).map(() => Array(size).fill('')));
    setSecondsElapsed(0);
    setTimerActive(true);
    setIsCompleted(false);
    setIsAssisted(false);
    setShowModal(false);
    setSelectedCell({ row: 0, col: 0 });
    setDirection('across');
    // Note: userFirstScore stays intact for reattempts!
  };

  // Compute the Leaderboard ranking purely by elapsed time
  const leaderboardData = useMemo(() => {
    // Current user entry
    const userEntry: Friend = {
      ...CURRENT_USER,
      timeSeconds: userFirstScore,
    };

    // Combine mock friends with current user
    const all = [...INITIAL_FRIENDS, userEntry];

    // Filter completed (has time) vs uncompleted (null)
    const completed = all
      .filter((item): item is Friend & { timeSeconds: number } => item.timeSeconds !== null)
      .sort((a, b) => a.timeSeconds - b.timeSeconds);

    const unranked = all.filter((item) => item.timeSeconds === null);

    // Assign 1-based ranks (purely by time); tied times share the earlier rank
    const ranked: RankedFriend[] = [];
    completed.forEach((item, index) => {
      const prev = ranked[index - 1];
      const rank = prev && prev.timeSeconds === item.timeSeconds ? prev.rank : index + 1;
      ranked.push({ ...item, rank });
    });

    return { ranked, unranked };
  }, [userFirstScore]);

  // Find user's current rank
  const currentUserRank = useMemo(() => {
    if (userFirstScore === null) return null;
    const match = leaderboardData.ranked.find((e) => e.isCurrentUser);
    return match ? match.rank : null;
  }, [leaderboardData, userFirstScore]);

  return (
    <div className="app-container" ref={gridContainerRef}>
      {/* Top Header */}
      <header className="header">
        <div className="brand">
          <span className="brand-icon">🧩</span>
          <div className="title-group">
            <h1>Bluesky Xword Prototype</h1>
            <p>5x5 Mini &bull; Branch: <code>aarons_prototype</code></p>
          </div>
        </div>

        <div className="timer-box">
          <span>⏱️</span>
          <span>{formatTime(secondsElapsed)}</span>
        </div>
      </header>

      {/* Current Clue Bar */}
      <div className="current-clue-bar">
        {activeClue ? (
          <span>
            <strong>{activeClue.number} {direction.toUpperCase()}:</strong> {activeClue.text}
          </span>
        ) : (
          <span>Select a square to begin solving!</span>
        )}
      </div>

      {/* Crossword Grid & Side Panel */}
      <main className="puzzle-layout">
        <div className="grid-container">
          <div className="grid">
            {grid.map((rowArr, r) =>
              rowArr.map((letter, c) => {
                const black = isBlack(r, c);
                const isSelected = selectedCell.row === r && selectedCell.col === c;
                const isHighlighted = isCellInActiveWord(r, c);
                const cellNum = puzzle.numbers[r][c];

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`cell ${black ? 'black' : ''} ${
                      isSelected ? 'selected' : isHighlighted ? 'highlighted' : ''
                    }`}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {!black && cellNum && <span className="cell-number">{cellNum}</span>}
                    {!black && <span className="cell-letter">{letter}</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick testing controls */}
          <div className="controls-bar">
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset Puzzle
            </button>
            <button
              className="btn btn-test"
              onClick={handleAutoFill}
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
              {currentUserRank !== null && (
                <span className="tab-pill">#{currentUserRank}</span>
              )}
            </button>
          </div>

          <div className="panel-content">
            {/* Clues Tab View */}
            {activeTab === 'clues' && (
              <>
                <div className="clue-section">
                  <h3>Across</h3>
                  <ul className="clue-list">
                    {puzzle.clues.across.map((clue) => {
                      const isActive =
                        direction === 'across' && activeClue?.number === clue.number;
                      return (
                        <li
                          key={`across-${clue.number}`}
                          className={`clue-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleClueClick(clue, 'across')}
                        >
                          <span className="clue-number">{clue.number}.</span>
                          <span>{clue.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="clue-section">
                  <h3>Down</h3>
                  <ul className="clue-list">
                    {puzzle.clues.down.map((clue) => {
                      const isActive =
                        direction === 'down' && activeClue?.number === clue.number;
                      return (
                        <li
                          key={`down-${clue.number}`}
                          className={`clue-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleClueClick(clue, 'down')}
                        >
                          <span className="clue-number">{clue.number}.</span>
                          <span>{clue.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Friends Leaderboard Tab View */}
            {activeTab === 'leaderboard' && (
              <div className="leaderboard-view">
                <div className="leaderboard-meta">
                  <span>Bluesky Friends &bull; Today's Mini</span>
                  <span>{leaderboardData.ranked.length} solved</span>
                </div>

                {userFirstScore !== null && (
                  <div className="leaderboard-notice">
                    <span>🏆</span>
                    <span>
                      You placed <strong>#{currentUserRank}</strong> with your first completion of{' '}
                      <strong>{formatTime(userFirstScore)}</strong>!
                    </span>
                  </div>
                )}

                {/* Ranked Solvers */}
                <ul className="leaderboard-list">
                  {leaderboardData.ranked.map((friend) => (
                    <li
                      key={friend.did}
                      className={`leaderboard-item ${friend.isCurrentUser ? 'is-current-user' : ''}`}
                    >
                      <span className={`leaderboard-rank rank-${friend.rank}`}>
                        {friend.rank === 1 ? '🥇' : friend.rank === 2 ? '🥈' : friend.rank === 3 ? '🥉' : `#${friend.rank}`}
                      </span>

                      <div className="user-avatar" style={{ backgroundColor: friend.color }}>
                        {friend.initials}
                      </div>

                      <div className="user-details">
                        <div className="user-name-line">
                          <span className="user-name">{friend.displayName}</span>
                          {friend.isCurrentUser && <span className="you-tag">YOU</span>}
                        </div>
                        <span className="user-handle">@{friend.handle}</span>
                      </div>

                      <span className="user-time-pill">{formatTime(friend.timeSeconds)}</span>
                    </li>
                  ))}
                </ul>

                {/* Friends yet to solve */}
                {leaderboardData.unranked.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="leaderboard-meta" style={{ marginBottom: '6px' }}>
                      <span>In Progress / Not Yet Solved</span>
                    </div>
                    <ul className="leaderboard-list">
                      {leaderboardData.unranked.map((friend) => (
                        <li
                          key={friend.did}
                          className={`leaderboard-item ${friend.isCurrentUser ? 'is-current-user' : ''}`}
                          style={{ opacity: 0.7 }}
                        >
                          <span className="leaderboard-rank">-</span>

                          <div className="user-avatar" style={{ backgroundColor: friend.color }}>
                            {friend.initials}
                          </div>

                          <div className="user-details">
                            <div className="user-name-line">
                              <span className="user-name">{friend.displayName}</span>
                              {friend.isCurrentUser && <span className="you-tag">YOU</span>}
                            </div>
                            <span className="user-handle">@{friend.handle}</span>
                          </div>

                          <span className="user-time-pill pending">
                            {friend.isCurrentUser ? 'Solving...' : 'Not played'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Completion Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">🎉</div>
            <h2 className="modal-title">Puzzle Complete!</h2>
            <p className="modal-subtitle">
              You finished today's mini crossword!
            </p>

            <div className="stats-card">
              <div className="stat-item">
                <span className="stat-label">Your Time</span>
                <span className="stat-value">{formatTime(secondsElapsed)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Friend Rank</span>
                <span className="stat-value" style={{ color: '#0085ff' }}>
                  #{currentUserRank}
                </span>
              </div>
            </div>

            {/* Modal Mini Leaderboard */}
            <div className="modal-leaderboard-card">
              <div className="modal-lb-title">
                <span>Friend Leaderboard (Today)</span>
                <span>Ranked by Time</span>
              </div>

              <div className="modal-lb-list">
                {leaderboardData.ranked.map((item) => (
                  <div
                    key={item.did}
                    className={`modal-lb-row ${item.isCurrentUser ? 'highlight-user' : ''}`}
                  >
                    <div className="modal-lb-left">
                      <span className="modal-lb-rank">
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                      </span>
                      <span>{item.displayName}</span>
                      {item.isCurrentUser && <span className="you-tag">YOU</span>}
                    </div>
                    <strong>{formatTime(item.timeSeconds)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowModal(false);
                  setActiveTab('leaderboard');
                }}
              >
                View Friends Leaderboard Tab
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Inspect Grid
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Play Again (Reattempt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
