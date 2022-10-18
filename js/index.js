import { Board } from "./board.js"; 
import { Game } from "./game.js"; 

let board = null;

function main() {
    board = new Board();
    document.getElementById("create-game-form").onsubmit = startNewGame;
}

async function startNewGame(event) {
    event.preventDefault();

    let form = document.getElementById("create-game-form");
    let formData = new FormData(form);

    let fen = formData.get("fen");
    let moveMs = formData.get("move-ms");
    let port = formData.get("port");
    let playerColor = formData.get("color");

    if (fen.length == 0) {
        fen = null;
    }

    let game = new Game(port, moveMs, fen, playerColor, board);
    game.startGame();
}

document.addEventListener("DOMContentLoaded", main);