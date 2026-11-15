import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EASY_PUZZLE } from './puzzleData';

export default function App() {
  const puzzle = EASY_PUZZLE;
  const size = puzzle.size;

  // Grid state: 5x5 array of strings (empty string for unfilled)
  const [grid, setGrid] = useState(() =>
    Array(size).fill(null).map(() => Array(size).fill(''))
  );

  // Selected cell & direction
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [direction, setDirection] = useState('across'); // 'across' or 'down'

  // Timer & Assistance state
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAssisted, setIsAssisted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const gridContainerRef = useRef(null);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && !isCompleted) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isCompleted]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to check if a cell is black
  const isBlack = useCallback(
    (r, c) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return true;
      return puzzle.solution[r][c] === '#';
    },
    [puzzle, size]
  );

  // Check puzzle completion
  const checkCompletion = useCallback(
    (currentGrid) => {
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

  // Advance to next cell in current direction
  const advanceCursor = useCallback(
    (r, c, dir) => {
      let nextR = r;
      let nextC = c;
      if (dir === 'across') {
        nextC += 1;
        while (nextC < size && isBlack(nextR, nextC)) {
          nextC += 1;
        }
        if (nextC < size) return { row: nextR, col: nextC };
      } else {
        nextR += 1;
        while (nextR < size && isBlack(nextR, nextC)) {
          nextR += 1;
        }
        if (nextR < size) return { row: nextR, col: nextC };
      }
      return { row: r, col: c };
    },
    [size, isBlack]
  );

  // Move backward
  const retreatCursor = useCallback(
    (r, c, dir) => {
      let prevR = r;
      let prevC = c;
      if (dir === 'across') {
        prevC -= 1;
        while (prevC >= 0 && isBlack(prevR, prevC)) {
          prevC -= 1;
        }
        if (prevC >= 0) return { row: prevR, col: prevC };
      } else {
        prevR -= 1;
        while (prevR >= 0 && isBlack(prevR, prevC)) {
          prevR -= 1;
        }
        if (prevR >= 0) return { row: prevR, col: prevC };
      }
      return { row: r, col: c };
    },
    [isBlack]
  );

  // Handle cell click
  const handleCellClick = (r, c) => {
    if (isBlack(r, c)) return;
    if (selectedCell.row === r && selectedCell.col === c) {
      // Toggle direction if clicked same cell
      setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
    } else {
      setSelectedCell({ row: r, col: c });
    }
  };

  // Find active clue based on selected cell & direction
  const getActiveClue = useCallback(() => {
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

  // Highlight cells belonging to current clue
  const isCellInActiveWord = (r, c) => {
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

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture if completed modal is open
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
          // Clear current letter
          const newGrid = grid.map((rArr, rIdx) =>
            rArr.map((val, cIdx) => (rIdx === row && cIdx === col ? '' : val))
          );
          setGrid(newGrid);
        } else {
          // Retreat and clear
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
          setShowModal(true);
        } else {
          // Advance cursor
          const next = advanceCursor(row, col, direction);
          setSelectedCell(next);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, direction, grid, isBlack, size, advanceCursor, retreatCursor, checkCompletion, showModal]);

  // Clue item click
  const handleClueClick = (clue, dir) => {
    setDirection(dir);
    setSelectedCell({ row: clue.row, col: clue.col });
  };

  // Test Auto-Fill (to test victory state immediately without typing)
  const handleAutoFill = () => {
    const solved = puzzle.solution.map((row) =>
      row.map((cell) => (cell === '#' ? '' : cell))
    );
    setGrid(solved);
    setIsAssisted(true);
    setIsCompleted(true);
    setTimerActive(false);
    setShowModal(true);
  };

  // Reset grid
  const handleReset = () => {
    setGrid(Array(size).fill(null).map(() => Array(size).fill('')));
    setSecondsElapsed(0);
    setTimerActive(true);
    setIsCompleted(false);
    setIsAssisted(false);
    setShowModal(false);
    setSelectedCell({ row: 0, col: 0 });
    setDirection('across');
  };

  return (
    <div className="app-container" ref={gridContainerRef}>
      {/* Top Header */}
      <header className="header">
        <div className="brand">
          <span className="brand-icon">🧩</span>
          <div className="title-group">
            <h1>Bluesky Xword Prototype</h1>
            <p>5x5 Mini Crossword Spike &bull; Branch: <code>aarons_prototype</code></p>
          </div>
        </div>

        <div className="timer-box">
          <span>⏱️</span>
          <span>{formatTime(secondsElapsed)}</span>
        </div>
      </header>

      {/* Active Clue Highlight Bar */}
      <div className="current-clue-bar">
        {activeClue ? (
          <span>
            <strong>{activeClue.number} {direction.toUpperCase()}:</strong> {activeClue.text}
          </span>
        ) : (
          <span>Select a square to begin solving!</span>
        )}
      </div>

      {/* Crossword Grid & Clues */}
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
              title="Automatically fills the correct solution to test victory modal"
            >
              ⚡ Quick Fill (Test Solved)
            </button>
          </div>
        </div>

        {/* Clues side column */}
        <div className="clues-container">
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
        </div>
      </main>

      {/* Completion Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">🎉</div>
            <h2 className="modal-title">Puzzle Complete!</h2>
            <p className="modal-subtitle">
              You completed today's 5x5 test mini crossword!
            </p>

            <div className="stats-card">
              <div className="stat-item">
                <span className="stat-label">Final Time</span>
                <span className="stat-value">{formatTime(secondsElapsed)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Status</span>
                <span className="stat-value" style={{ color: isAssisted ? '#ea580c' : '#16a34a' }}>
                  {isAssisted ? 'Assisted' : 'Clean'}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(false)}
              >
                Inspect Grid
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
