import { Board } from "./board.js"; 
import { Game } from "./game.js"; 

let board = null;
let game = null;

function main() {
    board = new Board();
    game = new Game(8000, 1000, null, "black", board);
    game.startGame();
}

document.addEventListener("DOMContentLoaded", main);