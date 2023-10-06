class Game {
    constructor(moveMs, fen, playerColor, useBook, randomOpenings, board, evalBar, shakmat) {
        let currentTurn;

        if (fen === null || fen == "") {
            currentTurn = "white";
            fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        } else {
            let turn = fen.split(" ")[1];
            currentTurn = turn.toLowerCase() == "w" ? "white" : "black";
        }

        if (playerColor == "random") {
            playerColor = Math.random() > 0.5 ? "white" : "black";
        }

        
        this.history = [];
        this.moveMs = moveMs;
        this.playerColor = playerColor;
        this.currentTurn = currentTurn;
        this.startFen = fen;
        this.currentFen = this.startFen;
        this.useBook = useBook;
        this.alwaysTopOpening = !randomOpenings;
        this.board = board;
        this.evalBar = evalBar;
        this.engine = shakmat;
        this.updateEvalBar("0.0");
    }

    /** Gets the board information from the starting position and sets up the game */
    async startGame() {
        // Add the initial position into the position history
        let startHash = this.engine.fen2hash(this.startFen);
        this.history.push(startHash);

        // Ask Shakmat for the legal moves in this position
        let turnData = this.engine.get_turn_data(this.startFen, this.history);
        let legalMoves = turnData.moves;

        // Start up the game on the board and pass the legal moves
        this.board.startGame(this.startFen, this.playerColor, this.currentTurn, this);
        this.board.updateLegalMoves(legalMoves);

        if (turnData.in_check) {
            this.board.highlightCheck();
        }

        // If it's the computer's turn, and there are legal moves, make a move
        if (this.currentTurn != this.playerColor && !this.board.isFinished()) {
            // Get the computer's move and play it
            // We do it after a little timeout to allow the move animation to play out
            setTimeout(() => this.playComputerMove(), 100);
        }
    }

    /** Makes a move, updating the server and the board.
     * It is assumed that the move is legal, 
     * otherwise the server will just complain.
     */
    async makeMove(move) {
        // If this is a shakmat-style castling move coming from
        // the engine, convert it to UCI-style, e.g. "e1g1"
        move = this.board.translateShakmatCastle(move);

        // Check if this is a castling move, e.g. "e1g1", in that
        // case it has to be encoded to Shakmat's format
        // before it's sent to the engine.
        // I know this can lead to a move being converted back and forth if
        // it was sent by the computer, but this simplifies the
        // logic and that case can only happen once per game anyways.
        let moveSend = move;
        let moveCastling = this.board.getCastlingMove(move);
        if (moveCastling != null) {
            moveSend = moveCastling;
        }

        // Ask the engine for the new FEN after this move, and add the
        // new position hash to the history
        let newFen = this.engine.make_move(this.currentFen, moveSend);
        let newHash = this.engine.fen2hash(newFen);
        this.currentFen = newFen;
        this.history.push(newHash);

        // Ask the engine for the board information for the new position
        let data = this.engine.get_turn_data(newFen, this.history);

        // Update the board
        let inCheck = data.in_check;
        let legalMoves = data.moves;

        this.board.updateBoard(move, newFen, inCheck, legalMoves);
    }

    /** Performs an instance of user move -> computer reply */
    async handleUserMove(move) {
        // Send the user's move
        await this.makeMove(move);

        // If the game ends here, exit
        if (this.board.isFinished()) {
            return;
        }

        // Get the computer's move asynchronouysly and play it
        // We do it after a little timeout to allow the move animation to play out
        setTimeout(() => this.playComputerMove(), 100);
    }

    /** Asks the engine for a move */
    async playComputerMove() {
        let moveData = this.engine.get_computer_move(
            this.currentFen,
            this.history,
            this.moveMs,
            this.useBook,
            this.alwaysTopOpening
        );

        let compMove = moveData.best_move;
        this.makeMove(compMove);
        this.updateEvalBar(moveData.eval);
    }

    /** Updates the eval bar with the data sent by the engine */
    updateEvalBar(evaluation) {
        this.updateEvalText(evaluation);

        // The evaluation always comes from the point of view of the
        // computer. So, negative evaluations are good for the user,
        // and positive ones are good for the computer.
        let computerColor = this.playerColor == "white" ? "black" : "white";
        let userPercent;

        // If this is a mate, it's either 100% if it's for the user, or
        // 0% if it's for the computer.
        if (evaluation.startsWith("M")) {
            userPercent = 0;
        } else if(evaluation.startsWith("-M")) {
            userPercent = 100;
        } else {
            // Otherwise, its a numerical evaluation
            let evalNum = parseFloat(evaluation);
            let abs = Math.abs(evalNum);

            // If it's between [0, 5] we scale from 50% to 95%
            let diff;
            if (abs >= 0 && abs <= 5) {
                diff = Math.round(45.0 * (abs / 5.0));
            }
            // If it's between (5, inf) we max out at 20 and scale from 95% to 99%
            else {
                abs = Math.min(20.0, abs);
                diff = 45 + Math.round((abs - 5.0) / 15.0);
            }

            // If it's positive (favorable to computer), flip the sign on the diff
            if (evalNum > 0) diff *= -1;
            userPercent = 50 + diff;
        }
        
        let bgText = `linear-gradient(to top, var(--${this.playerColor}-bar) ${userPercent}%, var(--${computerColor}-bar) 0%)`;
        this.evalBar.style.background = bgText;
    }

    updateEvalText(evaluation) {
        console.log(evaluation);
        let playerWinning = evaluation.includes("-");
        let whiteWinning = playerWinning && this.playerColor == "white" ||
        !playerWinning && this.playerColor == "black";
        console.log(playerWinning, whiteWinning);

        let textDisplay;
        if (evaluation.includes("M")) {
            textDisplay = evaluation.replace("-", "");
        } else {
            let evalNum = Math.abs(parseFloat(evaluation));
            if (evalNum < 10) {
                textDisplay = evalNum.toFixed(1);
            } else {
                textDisplay = Math.round(evalNum);
            }
        }

        let evalText = document.getElementById("eval-text");    
            
        evalText.classList.remove("playerWinning");
        evalText.classList.remove("whiteLosing");
        evalText.classList.remove("whiteWinning");

        if (playerWinning) {
            evalText.classList.add("playerWinning");
        }

        if (whiteWinning) {
            evalText.classList.add("whiteWinning");
        } else {
            evalText.classList.add("whiteLosing");
        }

        evalText.textContent = textDisplay;
    }
}

export { Game };