export const EASY_PUZZLE = {
  id: "mini-test-01",
  title: "Aaron's Test Mini",
  date: "Today's Mini",
  size: 5,
  // 5x5 grid. '#' represents black square
  solution: [
    ['C', 'H', 'E', 'F', '#'],
    ['R', 'A', 'V', 'E', 'R'],
    ['A', 'B', 'O', 'D', 'E'],
    ['B', 'I', 'K', 'E', 'S'],
    ['#', 'T', 'E', 'X', 'T'],
  ],
  // Cell numbers (null if no number)
  numbers: [
    [1, 2, 3, 4, null],
    [5, null, null, null, 6],
    [7, null, null, null, null],
    [8, null, null, null, null],
    [null, 9, null, null, null],
  ],
  clues: {
    across: [
      { number: 1, text: "Kitchen leader / head cook", answer: "CHEF", row: 0, col: 0, length: 4 },
      { number: 5, text: "Dance party enthusiast", answer: "RAVER", row: 1, col: 0, length: 5 },
      { number: 7, text: "Home or dwelling ('humble ___')", answer: "ABODE", row: 2, col: 0, length: 5 },
      { number: 8, text: "Two-wheeled pedal vehicles", answer: "BIKES", row: 3, col: 0, length: 5 },
      { number: 9, text: "Send an SMS message", answer: "TEXT", row: 4, col: 1, length: 4 },
    ],
    down: [
      { number: 1, text: "Ocean creature with claws", answer: "CRAB", row: 0, col: 0, length: 4 },
      { number: 2, text: "Daily routine or tendency", answer: "HABIT", row: 0, col: 1, length: 5 },
      { number: 3, text: "Bring to mind, as a memory", answer: "EVOKE", row: 0, col: 2, length: 5 },
      { number: 4, text: "Package delivery rival of UPS", answer: "FEDEX", row: 0, col: 3, length: 5 },
      { number: 6, text: "Take a breather and relax", answer: "REST", row: 1, col: 4, length: 4 },
    ],
  },
};
