// Aux translation from Shakmat castling format to chessboard.js's format and back
const CASTLING = {
    "white": {
        "O-O": "e1g1",
        "O-O-O": "e1c1",
    },
    "black": {
        "O-O": "e8g8",
        "O-O-O": "e8c8",
    }
};

const CASTLING_INV = {
    "e1g1": "O-O",
    "e1c1": "O-O-O",
    "e8g8": "O-O",
    "e8c8": "O-O-O",
};

class Board {
    constructor() {
        let config = {
            draggable: true,
            dropOffBoard: "snapback",
            position: "start",
            pieceTheme: "img/pieces/{piece}.svg",
            onMouseoutSquare: this.removeLegalHighlights,
            onDragStart: (s, p, ps) => this.dragStart(s, p, ps),
            onMouseoverSquare: (p, s) => this.onMouseoverSquare(p, s),
            onDrop: (f, t) => this.pieceMoved(f, t),
        };

        this.currentTurn = null;
        this.playerColor = null;
        this.htmlBoard = Chessboard("board", config);
        this.legalMoves = new Map();
    }

    startGame(fen, playerColor, currentTurn, gameInstance) {
        this.playerColor = playerColor;
        this.currentTurn = currentTurn;
        this.htmlBoard.orientation(playerColor);
        this.htmlBoard.position(fen || "start", true);
        this.gameInstance = gameInstance;
    }

    dragStart(source, piece, position) {
        // Prevent the user from dragging pieces if they are not their
        // own pieces, or if it's the opponent's turn, or if the game has finished
        return !this.isFinished() && this.playerColor == this.currentTurn && piece.startsWith(this.playerColor[0]);
    }

    setMoveAllowed(moveAllowed) {
        this.playerCanMove = moveAllowed;
    }

    /** Updates the set of legal moves for the current position */
    updateLegalMoves(legalMoveList) {
        this.legalMoves = new Map();

        for (let move of legalMoveList) {
            // If it's a castling move, transform it to the standard format
            if (move.startsWith("O-")) {
                move = CASTLING[this.currentTurn][move];
            }

            let from = move.slice(0, 2);
            let to = move.slice(2, 4);

            if (!this.legalMoves.has(from)) {
                this.legalMoves.set(from, [to]);
            } else {
                this.legalMoves.get(from).push(to);
            }
        }
    }

    /** Flips the current turn's color after a move */
    flipTurn() {
        this.currentTurn = (this.currentTurn == "white" ? "black" : "white");
    }

    /** Handles the cursor hovering over any of the squares, highlights legal moves */
    onMouseoverSquare(square, piece) {
        // If the piece in the square has legal moves,
        // highlight the square and the possible moves
        let moves = this.legalMoves.get(square);

        if (moves !== undefined) {
            // Legal moves, highlight them
            document.querySelector(`.square-${square}`).classList.add("highlight-hover");
            moves.forEach(sq => document.querySelector(`.square-${sq}`).classList.add("highlight-dest"));
        }
    }

    /** Removes all legal move highlights from the board */
    removeLegalHighlights() {
        document.querySelectorAll(".highlight-hover, .highlight-dest")
            .forEach(e => {
                e.classList.remove("highlight-hover");
                e.classList.remove("highlight-dest");
            });
    }

    /** Handles the user dropping a piece in a square, in practice,
     * this means that the user has made a move. Checks for legality
     * before allowing the move to go through.
     */
    pieceMoved(source, target) {
        this.removeLegalHighlights();

        // Check move legality
        let moves = this.legalMoves.get(source);
        if (moves === undefined || !moves.includes(target)) {
            return "snapback";
        }

        this.gameInstance.handleUserMove(source + target);
    }

    updateBoard(move, newFen, inCheck, legalMoves) {
        let from = move.slice(0, 2);
        let to = move.slice(2, 4);

        // Remove all previous check highlights
        document.querySelectorAll(".highlight-check").forEach(e => e.classList.remove("highlight-check"));

        // Remove the previous move highlights, and highlight this move
        document.querySelectorAll(".highlight-last-move").forEach(e => e.classList.remove("highlight-last-move"));
        for (let sq of [from, to]) {
            document.querySelector(`.square-${sq}`).classList.add("highlight-last-move");
        }

        // Change the current turn
        this.flipTurn();

        // Update the list of legal moves
        this.updateLegalMoves(legalMoves);

        // Update the board to reflect the new position
        this.htmlBoard.position(newFen, true);
        

        // If the player is in check, determine where their king is and highlight it
        if (inCheck) {
            let kingSq = this.findKing(this.currentTurn);
            document.querySelector(`.square-${kingSq}`).classList.add("highlight-check");
        }

        // Check if an end state has been reached
        if (this.isFinished()) {
            if (inCheck) {
                alert("Checkmate!");
            } else {
                alert("Draw");
            }
        }
    }

    /** Determines if a move is a castling move and returns it in
     * Shakmat's format, or null if the move is not a castling move.
     */
    getCastlingMove(move) {
        // Determine if there is a king in the source square
        let from = move.slice(0, 2);
        let kingSq = this.findKing(this.currentTurn);

        if (from == kingSq && CASTLING_INV.hasOwnProperty(move)) {
            return CASTLING_INV[move];
        }

        return null;
    }

    /** Converts a Shakmat-style castling move to the board's format
     * or returns the move itself it it's not a castling move
     */
    translateShakmatCastle(move) {
        if (move.startsWith("O-")) {
            return CASTLING[this.currentTurn][move];
        } else {
            return move;
        }
    }

    /** Determines whether the game has finished, when there are no
     * more legal moves for the side to move.
     */
    isFinished() {
        return this.legalMoves.size === 0;
    }

    /** Finds the king of a given color and returns its square */
    findKing(color) {
        for (let [sq, piece] of Object.entries(this.htmlBoard.position())) {
            if (piece == color[0] + "K") {
                return sq;
            }
        }
    }
}

export { Board };