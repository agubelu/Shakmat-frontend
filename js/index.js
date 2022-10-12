import { Board } from "/js/board.js"; 

let board = null;

function main() {
    board = new Board();
    board.startGame(null, "white", "white");
    board.updateLegalMoves([
        "g1h3",
        "g1f3",
        "b1c3",
        "b1a3",
        "h2h3",
        "h2h4",
        "g2g3",
        "g2g4",
        "f2f3",
        "f2f4",
        "e2e3",
        "e2e4",
        "d2d3",
        "d2d4",
        "c2c3",
        "c2c4",
        "b2b3",
        "b2b4",
        "a2a3",
        "a2a4"
    ]);
}

document.addEventListener("DOMContentLoaded", main);