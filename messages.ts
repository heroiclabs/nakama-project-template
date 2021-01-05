enum Mark {
    X = 0,
    O = 1,
    UNDEFINED = 2,
}

// The complete set of opcodes used for communication between clients and server.
enum OpCode {
	// New game round starting.
	START = 1,
	// Update to the state of an ongoing round.
	UPDATE = 2,
	// A game round has just completed.
	DONE = 3,
	// A move the player wishes to make and sends to the server.
	MOVE = 4,
	// Move was rejected.
	REJECTED = 5
}

type BoardPosition = 0|1|2|3|4|5|6|7|8
type Message = StartMessage|UpdateMessage|DoneMessage|MoveMessage|RpcFindMatchRequest|RpcFindMatchResponse
type Board = (Mark|null)[]

// Message data sent by server to clients representing a new game round starting.
interface StartMessage {
    // The current state of the board.
    board: Board
    // The assignments of the marks to players for this round.
    marks: {[userID: string]: Mark | null}
    // Whose turn it is to play.
    mark: Mark
    // The deadline time by which the player must submit their move, or forfeit.
    deadline: number
}

// A game state update sent by the server to clients.
interface UpdateMessage {
    // The current state of the board.
    board: Board
    // Whose turn it is to play.
    mark: Mark
    // The deadline time by which the player must submit their move, or forfeit.
    deadline: number
}

// Complete game round with winner announcement.
interface DoneMessage {
    // The final state of the board.
    board: Board
    // The winner of the game, if any. Unspecified if it's a draw.
    winner: Mark | null
    // Winner board positions, if any. Used to display the row, column, or diagonal that won the game.
    // May be empty if it's a draw or the winner is by forfeit.
    winnerPositions: BoardPosition[] | null
    // Next round start time.
    nextGameStart: number
}

// A player intends to make a move.
interface MoveMessage {
    // The position the player wants to place their mark in.
    position: BoardPosition;
}

// Payload for an RPC request to find a match.
interface RpcFindMatchRequest {
    // User can choose a fast or normal speed match.
    fast: boolean
}

// Payload for an RPC response containing match IDs the user can join.
interface RpcFindMatchResponse {
    // One or more matches that fit the user's request.
    matchIds: string[]
}
