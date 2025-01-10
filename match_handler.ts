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

const moduleName = "tic-tac-toe_js";
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

interface State {
    // Match label
    label: MatchLabel
    // Ticks where no actions have occurred.
    emptyTicks: number
    // Currently connected users, or reserved spaces.
    presences: {[userId: string]: nkruntime.Presence | null}
    // Number of users currently in the process of connecting to the match.
    joinsInProgress: number
    // True if there's a game currently in progress.
    playing: boolean
    // Current state of the board.
    board: Board
    // Mark assignments to player user IDs.
    marks: {[userId: string]: Mark | null}
    // Whose turn it currently is.
    mark: Mark
    // Ticks until they must submit their move.
    deadlineRemainingTicks: number
    // The winner of the current game.
    winner: Mark | null
    // The winner positions.
    winnerPositions: BoardPosition[] | null
    // Ticks until the next game starts, if applicable.
    nextGameRemainingTicks: number
    // AI playing mode
    ai: boolean
    // A move message from AI player
    aiMessage: nkruntime.MatchMessage | null
}

let matchInit: nkruntime.MatchInitFunction<State> = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: string}) {
    const fast = !!params['fast'];
    const ai = !!params['ai'];

    let label: MatchLabel = {
        open: 1,
        fast: 0,
    }
    if (fast) {
        label.fast = 1;
    }

    let state: State = {
        label: label,
        emptyTicks: 0,
        presences: {},
        joinsInProgress: 0,
        playing: false,
        board: [],
        marks: {},
        mark: Mark.UNDEFINED,
        deadlineRemainingTicks: 0,
        winner: null,
        winnerPositions: null,
        nextGameRemainingTicks: 0,
        ai: ai,
        aiMessage: null,
    }

    if(ai) {
        state.presences[aiUserId] = aiPresence;
    }

    logger.debug('Match init: tickRate: %d, fast: %t, ai: %t', tickRate, fast, ai);

    return {
        state,
        tickRate,
        label: JSON.stringify(label),
    }
}

let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<State> = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State, presence: nkruntime.Presence, metadata: {[key: string]: any}) {
    // Check if it's a user attempting to rejoin after a disconnect.
    if (presence.userId in state.presences) {
        if (state.presences[presence.userId] === null) {
            // User rejoining after a disconnect.
            state.joinsInProgress++;
            return {
                state: state,
                accept: false,
            }
        } else {
            // User attempting to join from 2 different devices at the same time.
            return {
                state: state,
                accept: false,
                rejectMessage: 'already joined',
            }
        }
    }

    // Check if match is full.
    if (connectedPlayers(state) + state.joinsInProgress >= 2) {
        return {
            state: state,
            accept: false,
            rejectMessage: 'match full',
        };
    }

    // New player attempting to connect.
    state.joinsInProgress++;
    return {
        state,
        accept: true,
    }
}

let matchJoin: nkruntime.MatchJoinFunction<State> = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State, presences: nkruntime.Presence[]) {
    const t = msecToSec(Date.now());

    for (const presence of presences) {
        state.emptyTicks = 0;
        state.presences[presence.userId] = presence;
        state.joinsInProgress--;

        // Check if we must send a message to this user to update them on the current game state.
        if (state.playing) {
            // There's a game still currently in progress, the player is re-joining after a disconnect. Give them a state update.
            let update: UpdateMessage = {
                board: state.board,
                mark: state.mark,
                deadline: t + Math.floor(state.deadlineRemainingTicks/tickRate),
            }
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(update));
        } else if (state.board.length !== 0 && Object.keys(state.marks).length !== 0 && state.marks[presence.userId]) {
            logger.debug('player %s rejoined game', presence.userId);
            // There's no game in progress but we still have a completed game that the user was part of.
            // They likely disconnected before the game ended, and have since forfeited because they took too long to return.
            let done: DoneMessage = {
                board: state.board,
                winner: state.winner,
                winnerPositions: state.winnerPositions,
                nextGameStart: t + Math.floor(state.nextGameRemainingTicks/tickRate)
            }
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(done))
        }
    }

    // Check if match was open to new players, but should now be closed.
    if (Object.keys(state.presences).length >= 2 && state.label.open != 0) {
        state.label.open = 0;
        const labelJSON = JSON.stringify(state.label);
        dispatcher.matchLabelUpdate(labelJSON);
    }

    return {state};
}

let matchLeave: nkruntime.MatchLeaveFunction<State> = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State, presences: nkruntime.Presence[]) {
    for (let presence of presences) {
        logger.info("Player: %s left match: %s.", presence.userId, ctx.matchId);
        state.presences[presence.userId] = null;
    }

    let humanPlayersRemaining: nkruntime.Presence[] = [];
    Object.keys(state.presences).forEach((userId) => {
        if(userId !== aiUserId && state.presences[userId] !== null)
            humanPlayersRemaining.push(state.presences[userId]!);
    });

    // Notify remaining player that the opponent has left the game
    if (humanPlayersRemaining.length === 1) {
        dispatcher.broadcastMessage(
            OpCode.OPPONENT_LEFT, null, humanPlayersRemaining, null, true)
    } else if(state.ai && humanPlayersRemaining.length === 0) {
        delete(state.presences[aiUserId]);
        state.ai = false;
    }

    return {state};
}

let matchLoop: nkruntime.MatchLoopFunction<State> = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State, messages: nkruntime.MatchMessage[]) {
    logger.debug('Running match loop. Tick: %d', tick);

    if (connectedPlayers(state) + state.joinsInProgress === 0) {
        state.emptyTicks++;
        if (state.emptyTicks >= maxEmptySec * tickRate) {
            // Match has been empty for too long, close it.
            logger.info('closing idle match');
            return null;
        }
    }

    let t = msecToSec(Date.now());

    // If there's no game in progress check if we can (and should) start one!
    if (!state.playing) {
        // Between games any disconnected users are purged, there's no in-progress game for them to return to anyway.
        for (let userID in state.presences) {
            if (state.presences[userID] === null) {
                delete state.presences[userID];
            }
        }

        // Check if we need to update the label so the match now advertises itself as open to join.
        if (Object.keys(state.presences).length < 2 && state.label.open != 1) {
            state.label.open = 1;
            let labelJSON = JSON.stringify(state.label);
            dispatcher.matchLabelUpdate(labelJSON);
        }

        // Check if we have enough players to start a game.
        if (Object.keys(state.presences).length < 2) {
            return { state };
        }

        // Check if enough time has passed since the last game.
        if (state.nextGameRemainingTicks > 0) {
            state.nextGameRemainingTicks--
            return { state };
        }

        // We can start a game! Set up the game state and assign the marks to each player.
        state.playing = true;
        state.board = [null,null,null,null,null,null,null,null,null];
        state.marks = {};
        let marks = [Mark.X, Mark.O];
        Object.keys(state.presences).forEach(userId => {
            if(state.ai) {
                if(userId === aiUserId) {
                    state.marks[userId] = Mark.O;
                } else {
                    state.marks[userId] = Mark.X;
                }
            } else {
                state.marks[userId] = marks.shift() ?? null;
            }
        });
        state.mark = Mark.X;
        state.winner = Mark.UNDEFINED;
        state.winnerPositions = null;
        state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
        state.nextGameRemainingTicks = 0;

        // Notify the players a new game has started.
        let msg: StartMessage = {
            board: state.board,
            marks: state.marks,
            mark: state.mark,
            deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate),
        }
        dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg));

        return { state };
    }

    if(state.aiMessage !== null) {
        messages.push(state.aiMessage);
        state.aiMessage = null;
    }

    // There's a game in progress. Check for input, update match state, and send messages to clientstate.
    for (const message of messages) {
        switch (message.opCode) {
            case OpCode.MOVE:
                let mark = state.marks[message.sender.userId] ?? null;
                logger.debug('Received move message from user: %s (mark: %s)', message.sender.userId, mark === Mark.X ? 'X' : 'O');
                let sender = message.sender.userId == aiUserId ? null : [message.sender];
                if (mark === null || state.mark != mark) {
                    // It is not this player's turn.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    continue;
                }

                let msg = {} as MoveMessage;
                try {
                    msg = JSON.parse(nk.binaryToString(message.data));
                } catch (error) {
                    // Client sent bad data.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    logger.debug('Bad data received: %v', error);
                    continue;
                }
                if (state.board[msg.position]) {
                    // Client sent a position outside the board, or one that has already been played.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    continue;
                }

                // Update the game state.
                state.board[msg.position] = mark;
                state.mark = mark === Mark.O ? Mark.X : Mark.O;
                state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);

                // Check if game is over through a winning move.
                const [winner, winningPos] = winCheck(state.board, mark);
                if (winner) {
                    state.winner = mark;
                    state.winnerPositions = winningPos;
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
                }
                // Check if game is over because no more moves are possible.
                let tie = state.board.every(v => v !== null);
                if (tie) {
                    // Update state to reflect the tie, and schedule the next game.
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
                }

                let opCode: OpCode
                let outgoingMsg: Message
                if (state.playing) {
                    opCode = OpCode.UPDATE
                    let msg: UpdateMessage = {
                        board: state.board,
                        mark: state.mark,
                        deadline: t + Math.floor(state.deadlineRemainingTicks/tickRate),
                    }
                    outgoingMsg = msg;
                } else {
                    opCode = OpCode.DONE
                    let msg: DoneMessage = {
                        board: state.board,
                        winner: state.winner,
                        winnerPositions: state.winnerPositions,
                        nextGameStart: t + Math.floor(state.nextGameRemainingTicks/tickRate),
                    }
                    outgoingMsg = msg;
                }
                dispatcher.broadcastMessage(opCode, JSON.stringify(outgoingMsg));
                break;
            case OpCode.INVITE_AI:
                if(state.ai) {
                    logger.error('AI player is already playing');
                    continue
                }

                let activePlayers: nkruntime.Presence[] = [];

                Object.keys(state.presences).forEach((userId) => {
                    let p = state.presences[userId];
                    if(p === null) {
                        delete state.presences[userId];
                    } else {
                        activePlayers.push(p);
                    }
                });

                logger.debug('active users: %d', activePlayers.length);

                if(activePlayers.length != 1) {
                    logger.error('one active player is required to enable AI mode')
                    continue
                }

                state.ai = true;
                state.presences[aiUserId] = aiPresence;

                if(state.marks[activePlayers[0].userId] == Mark.O) {
                    state.marks[aiUserId] = Mark.X
                } else {
                    state.marks[aiUserId] = Mark.O
                }

                logger.info('AI player joined match')
                break;

            default:
                // No other opcodes are expected from the client, so automatically treat it as an error.
                dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
                logger.error('Unexpected opcode received: %d', message.opCode);
        }
    }

    // Keep track of the time remaining for the player to submit their move. Idle players forfeit.
    if (state.playing) {
        state.deadlineRemainingTicks--;
        if (state.deadlineRemainingTicks <= 0 ) {
            // The player has run out of time to submit their move.
            state.playing = false;
            state.winner = state.mark === Mark.O ? Mark.X : Mark.O;
            state.deadlineRemainingTicks = 0;
            state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;

            let msg: DoneMessage = {
                board: state.board,
                winner: state.winner,
                nextGameStart: t + Math.floor(state.nextGameRemainingTicks/tickRate),
                winnerPositions: null,
            }
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
        }
    }

    // The next turn is AI's
    if(state.ai && state.mark === state.marks[aiUserId]) {
        aiTurn(state, logger, nk);
    }

    return { state };
}

let matchTerminate: nkruntime.MatchTerminateFunction<State> = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State, graceSeconds: number) {
    return { state };
}

let matchSignal: nkruntime.MatchSignalFunction<State> = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: State) {
    return { state };
}

function calculateDeadlineTicks(l: MatchLabel): number {
    if (l.fast === 1) {
        return turnTimeFastSec * tickRate;
    } else {
        return turnTimeNormalSec * tickRate;
    }
}

function winCheck(board: Board, mark: Mark): [boolean, Mark[] | null] {
    for(let wp of winningPositions) {
        if (board[wp[0]] === mark &&
            board[wp[1]] === mark &&
            board[wp[2]] === mark) {
            return [true, wp];
        }
    }

    return [false, null];
}

function connectedPlayers(s: State): number {
    let count = 0;
    for(const p of Object.keys(s.presences)) {
        if (s.presences[p] !== null) {
            count++;
        }
    }
    return count;
}
