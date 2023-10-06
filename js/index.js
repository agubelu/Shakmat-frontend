import { Board } from "./board.js"; 
import { Game } from "./game.js"; 
import initShakmat, * as shakmat from './shakmat_wasm.js';

let board = null;
let evalBar = null;

async function main() {
    board = new Board();
    evalBar = document.getElementById("eval-bar");
    document.getElementById("create-game-form").onsubmit = startNewGame;

    // Wait for Shakmat-WASM to load, then enable the submit button
    await initShakmat();
    enableForm();
}

function enableForm() {
    let startBtn = document.getElementById("start-game");
    startBtn.disabled = false;
    startBtn.innerHTML = "Start new game";
}

async function startNewGame(event) {
    event.preventDefault();

    let form = document.getElementById("create-game-form");
    let formData = new FormData(form);

    let fen = formData.get("fen");
    let moveTime = formData.get("move-ms");
    let playerColor = formData.get("color");
    let useBook = formData.get("use-book") === "on";
    let randomOpenings = formData.get("randomize-openings") === "on";

    // Make sure that moveTime is a valid floating point number and
    // convert it to milliseconds
    let moveSecs = parseFloat(moveTime);
    if (moveSecs == NaN) {
        alert("Invalid value for seconds per move.");
        return;
    }

    let moveMs = Math.round(moveSecs * 1000);

    if (fen.length == 0) {
        fen = null;
    }

    let game = new Game(moveMs, fen, playerColor, useBook, randomOpenings, board, evalBar, shakmat);
    game.startGame();

    // Un-gray the board
    document.getElementById("board").classList.remove("board-disabled");
}

document.addEventListener("DOMContentLoaded", main);