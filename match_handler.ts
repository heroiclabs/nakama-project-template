// Copyright 2020 The Nakama Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const moduleName = "tic-tac-toe";
const tickRate = 5;
const maxEmptySec = 30;
const delaybetweenGamesSec = 5;
const turnTimeFastSec = 10;
const turnTimeNormalSec = 20;

const winningPositions: number[][] = [
    [0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
]

interface MatchLabel {
    open: number
    fast: number
}


interface MatchState {
    // Match label
    label: MatchLabel
    // Ticks where no actions have occurred.
    emptyTicks: number
    // Currently connected users, or reserved spaces.
    presences: {[userId: string]: nkruntime.Presence}
    // Number of users currently in the process of connecting to the match.
    joinsInProgress: number
    // True if there's a game currently in progress.
    playing: boolean
    // Current state of the board.
    board: Mark[]
    // Mark assignments to player user IDs.
    marks: {[userId: string]: Mark}
    // Whose turn it currently is.
    mark: Mark
    // Ticks until they must submit their move.
    deadlineRemainingTicks: number
    // The winner of the current game.
    winner: Mark
    // The winner positions.
    winnerPositions: BoardPosition[]
    // Ticks until the next game starts, if applicable.
    nextGameRemainingTicks: number
}

let matchInit: nkruntime.MatchInitFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: string}) {
    const fast = !!params['fast'];

    var label: MatchLabel = {
        open: 1,
        fast: 0,
    }
    if (fast) {
        label.fast = 1;
    }

    var state: MatchState = {
        label: label,
        emptyTicks: 0,
        presences: {},
        joinsInProgress: 0,
        playing: false,
        board: null,
        marks: null,
        mark: null,
        deadlineRemainingTicks: 0,
        winner: null,
        winnerPositions: null,
        nextGameRemainingTicks: 0,
    }

    return {
        state,
        tickRate,
        label: JSON.stringify(label),
    }
}

let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any}) {
    var s: MatchState = state as MatchState;

    // Check if it's a user attempting to rejoin after a disconnect.
    if (presence.userId in s.presences) {
        if (s.presences[presence.userId] === null) {
            // User rejoining after a disconnect.
            s.joinsInProgress++;
            return {
                state: s,
                accept: false,
            }
        } else {
            // User attempting to join from 2 different devices at the same time.
            return {
                state: s,
                accept: false,
                rejectMessage: 'already joined',
            }
        }
    }

    // Check if match is full.
    if (Object.keys(s.presences).length + s.joinsInProgress >= 2) {
        return {
            state: s,
            accept: false,
            rejectMessage: 'match full',
        };
    }

    // New player attempting to connect.
    s.joinsInProgress++;
    return {
        state: s,
        accept: true,
    }
}

let matchJoin: nkruntime.MatchJoinFunction = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]) {
    var s: MatchState = state as MatchState;
    const t = msecToSec(Date.now());

    for (const presence of presences) {
        s.emptyTicks = 0;
        s.presences[presence.userId] = presence;
        s.joinsInProgress--;

        // Check if we must send a message to this user to update them on the current game state.
        var opCode: OpCode;
        var msg: Message = null;

        if (s.playing) {
            // There's a game still currently in progress, the player is re-joining after a disconnect. Give them a state update.
            opCode = OpCode.UPDATE;
            let update: UpdateMessage = {
                board: s.board,
                mark: s.mark,
                deadline: t + Math.floor(s.deadlineRemainingTicks/tickRate),
            }
            msg = update;
        } else if (s.board != null && s.marks != null && s.marks != null) {
            // There's no game in progress but we still have a completed game that the user was part of.
            // They likely disconnected before the game ended, and have since forfeited because they took too long to return.
            opCode = OpCode.DONE
            let done: DoneMessage = {
                board: s.board,
                winner: s.winner,
                winnerPositions: s.winnerPositions,
                nextGameStart: t + Math.floor(s.nextGameRemainingTicks/tickRate)
            }
            msg = done;
        }

         // Send a message to the user that just joined, if one is needed based on the logic above.
        if (msg != null) {
            dispatcher.broadcastMessage(opCode, JSON.stringify(msg))
        }
    }

    const label: MatchLabel = s.label as MatchLabel;

    // Check if match was open to new players, but should now be closed.
    if (Object.keys(s.presences).length >= 2 && s.label.open != 0) {
        s.label.open = 0;
        const labelJSON = JSON.stringify(s.label);
        dispatcher.matchLabelUpdate(labelJSON);
    }

    return { state: s };
}

let matchLeave: nkruntime.MatchLeaveFunction = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presences: nkruntime.Presence[]) {
    var s: MatchState = state as MatchState;

    for (let presence of presences) {
        s.presences[presence.userId] = null;
    }

    return {state: s};
}

let matchLoop: nkruntime.MatchLoopFunction = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, messages: nkruntime.MatchMessage[]) {
    var s: MatchState = state as MatchState;

    if (Object.keys(s.presences).length + s.joinsInProgress === 0) {
        s.emptyTicks++;
        if (s.emptyTicks >= maxEmptySec * tickRate) {
            // Match has been empty for too long, close it.
            logger.info('closing idle match');
            return null;
        }
    }

    let t = msecToSec(Date.now());

    // If there's no game in progress check if we can (and should) start one!
    if (!s.playing) {
        // Between games any disconnected users are purged, there's no in-progress game for them to return to anyway.
        for (let userID in s.presences) {
            if (s.presences[userID] === null) {
                delete s.presences[userID];
            }
        }

        // Check if we need to update the label so the match now advertises itself as open to join.
        if (Object.keys(s.presences).length < 2 && s.label.open != 1) {
            s.label.open = 1;
            let labelJSON = JSON.stringify(s.label);
            dispatcher.matchLabelUpdate(labelJSON);
        }

        // Check if we have enough players to start a game.
        if (Object.keys(s.presences).length < 2) {
            return { state: s };
        }

        // Check if enough time has passed since the last game.
        if (s.nextGameRemainingTicks > 0) {
            s.nextGameRemainingTicks--
            return { state: s };
        }

        // We can start a game! Set up the game state and assign the marks to each player.
        s.playing = true;
        s.board = new Array(9);
        s.marks = {};
        let marks = [Mark.X, Mark.O];
        Object.keys(s.presences).forEach(userId => {
            s.marks[userId] = marks.shift();
        });
        s.mark = Mark.X;
        s.winner = null;
        s.winnerPositions = null;
        s.deadlineRemainingTicks = calculateDeadlineTicks(s.label);
        s.nextGameRemainingTicks = 0;

        // Notify the players a new game has started.
        let msg: StartMessage = {
            board: s.board,
            marks: s.marks,
            mark: s.mark,
            deadline: t + Math.floor(s.deadlineRemainingTicks / tickRate),
        }
        dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg));

        return { state: s };
    }

    // There's a game in progress. Check for input, update match state, and send messages to clients.
    for (const message of messages) {
        switch (message.opCode) {
            case OpCode.MOVE:
                let mark = s.marks[message.sender.userId];
                logger.debug('Received move message from user: %v', s.marks);
                if (s.mark != mark) {
                    // It is not this player's turn.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                    continue;
                }

                // TODO: Unsure what happens here if the message is not of type MoveMessage, will this raise an exception?
                let msg = {} as MoveMessage;
                try {
                    msg = JSON.parse(message.data);
                } catch (error) {
                    // Client sent bad data.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                    logger.debug('Bad data received: %v', error);
                    continue;
                }
                if (s.board[msg.position]) {
                    // Client sent a position outside the board, or one that has already been played.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                    continue;
                }

                // Update the game state.
                s.board[msg.position] = mark;
                s.mark = mark === Mark.O ? Mark.X : Mark.O;
                s.deadlineRemainingTicks = calculateDeadlineTicks(s.label);

                // Check if game is over through a winning move.
                const [winner, winningPos] = winCheck(s.board, mark);
                if (winner) {
                    s.winner = mark;
                    s.winnerPositions = winningPos;
                    s.playing = false;
                    s.deadlineRemainingTicks = 0;
                    s.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
                }
                // Check if game is over because no more moves are possible.
                let tie = s.board.every(v => v !== null);
                if (tie) {
                    // Update state to reflect the tie, and schedule the next game.
                    s.playing = false;
                    s.deadlineRemainingTicks = 0;
                    s.nextGameRemainingTicks = 0;
                }

                let opCode: OpCode
                let outgoingMsg: Message
                if (s.playing) {
                    logger.debug('Im here');
                    opCode = OpCode.UPDATE
                    let msg: UpdateMessage = {
                        board: s.board,
                        mark: s.mark,
                        deadline: t + Math.floor(s.deadlineRemainingTicks/tickRate),
                    }
                    outgoingMsg = msg;
                } else {
                    opCode = OpCode.DONE
                    let msg: DoneMessage = {
                        board: s.board,
                        winner: s.winner,
                        winnerPositions: s.winnerPositions,
                        nextGameStart: t + Math.floor(s.nextGameRemainingTicks/tickRate),
                    }
                    outgoingMsg = msg;
                }
                dispatcher.broadcastMessage(opCode, JSON.stringify(outgoingMsg));
                break;
            default:
                // No other opcodes are expected from the client, so automatically treat it as an error.
                dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                logger.error('Unexpected opcode received: %d', message.opCode);
        }
    }

    // Keep track of the time remaining for the player to submit their move. Idle players forfeit.
    if (s.playing) {
        s.deadlineRemainingTicks--;
        if (s.deadlineRemainingTicks <= 0 ) {
            // The player has run out of time to submit their move.
            s.playing = false;
            s.winner = Mark.O ? Mark.X : Mark.O;
            s.deadlineRemainingTicks = 0;
            s.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;

            let msg: DoneMessage = {
                board: s.board,
                winner: s.winner,
                nextGameStart: t + Math.floor(s.nextGameRemainingTicks/tickRate),
                winnerPositions: null,
            }
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
        }
    }

    return { state: s };
}

let matchTerminate: nkruntime.MatchTerminateFunction = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, graceSeconds: number) {
    return { state };
}

function calculateDeadlineTicks(l: MatchLabel): number {
    if (l.fast === 1) {
        return turnTimeFastSec * tickRate;
    } else {
        return turnTimeNormalSec * tickRate;
    }
}

function winCheck(board: Mark[], mark: Mark): [boolean, Mark[]] {
    for(let wp of winningPositions) {
        if (board[wp[0]] === mark &&
            board[wp[1]] === mark &&
            board[wp[2]] === mark) {
            return [true, wp];
        }
    }

    return [false, null];
}
