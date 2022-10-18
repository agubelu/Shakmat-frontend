class Game {
    constructor(port, moveMs, fen, playerColor, board) {
        let currentTurn;

        if (fen === null || fen == "") {
            currentTurn = "white";
        } else {
            let turn = fen.split(" ")[1];
            currentTurn = turn.toLowerCase() == "w" ? "white" : "black";
        }

        if (playerColor == "random") {
            playerColor = Math.random() > 0.5 ? "white" : "black";
        }

        this.port = port;
        this.moveMs = moveMs;
        this.gameKey = null;
        this.playerColor = playerColor;
        this.currentTurn = currentTurn;
        this.startFen = fen;
        this.board = board;
    }

    /** Sends the server a request to start the game and sets up the board */
    async startGame() {
        // Send a request to start the game
        let payload = this.startFen != null ? { "fen": this.startFen } : null;
        let resp;

        try {
            resp = await axios.post(`http://127.0.0.1:${this.port}/games`, payload);
        } catch (e) {
            alert("Something went wrong, is Shakmat listening in the correct port?");
            throw e;
        }

        this.gameKey = resp.data.key;
        let legalMoves = resp.data.turn_info.moves;

        // Start up the game on the board and pass the legal moves
        this.board.startGame(this.startFen, this.playerColor, this.currentTurn, this);
        this.board.updateLegalMoves(legalMoves);

        // If it's the computer's turn, and there are legal moves, make a move
        if (this.currentTurn != this.playerColor && !this.board.isFinished()) {
            // Get the computer's move and play it
            let compMove = await this.getComputerMove();
            await this.makeMove(compMove);
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
        // before it's sent to the server
        // I know this can lead to a move being converted twice if
        // it was sent by the computer, but this simplifies the
        // logic and that case can only happen once per game anyways
        let moveSend = move;
        let moveCastling = this.board.getCastlingMove(move);
        if (moveCastling != null) {
            moveSend = moveCastling;
        }

        let payload = { "move": moveSend };
        let resp;

        try {
            resp = await axios.post(`http://127.0.0.1:${this.port}/games/${this.gameKey}/move`, payload);
        } catch (e) {
            alert("Something went wrong, is Shakmat listening in the correct port?");
            throw e;
        }

        // Update the board
        let data = resp.data.turn_info;
        let newFen = data.fen;
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

        // Get the computer's move and play it
        let compMove = await this.getComputerMove();
        await this.makeMove(compMove);

        // If the game ends here, exit
        if (this.board.isFinished()) {
            return;
        }
    }

    /** Self explanatory */
    async getComputerMove() {
        let resp;

        try {
            resp = await axios.get(
                `http://127.0.0.1:${this.port}/games/${this.gameKey}/move_suggestion?move_ms=${this.moveMs}`
            );
        } catch (e) {
            alert("Something went wrong, is Shakmat listening in the correct port?");
            throw e;
        }

        return resp.data.move;
    }
}

export { Game };