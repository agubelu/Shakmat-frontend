// Aux translation from Shakmat castling format to chessboard.js's format
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

    startGame(fen, playerColor, currentTurn) {
        this.playerColor = playerColor;
        this.currentTurn = currentTurn;
        this.htmlBoard.orientation(playerColor);
        this.htmlBoard.position(fen || "start", true);
    }

    dragStart(source, piece, position) {
        // Prevent the user from dragging pieces if they are not their
        // own pieces, or if it's the opponent's turn
        //return this.playerColor == this.currentTurn && piece.startsWith(this.playerColor[0]);
        return true && piece.startsWith(this.playerColor[0]);
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

        this.makeMove(source, target);
    }

    /** Makes a piece move, assuming that it is legal */
    makeMove(source, target, from_engine) {
        // TODO: castling, promotion, ep

        // Remove the previous move highlights, and highlight this move
        document.querySelectorAll(".highlight-last-move").forEach(e => e.classList.remove("highlight-last-move"));
        for (let sq of [source, target]) {
            document.querySelector(`.square-${sq}`).classList.add("highlight-last-move");
        }

        // Change the current turn
        this.flipTurn();

        // Physically make the move on the board if it's an engine move
        if (from_engine) {
            this.htmlBoard.move(`${source}-${target}`);
        }

        // TODO: notify the server of this move if it's a player move
    }
}

export { Board };