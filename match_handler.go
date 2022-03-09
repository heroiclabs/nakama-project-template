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

package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"math/rand"
	"time"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/heroiclabs/nakama-common/runtime"
	"github.com/heroiclabs/nakama-project-template/api"
)

const (
	moduleName = "tic-tac-toe"

	tickRate = 5

	maxEmptySec = 30

	delayBetweenGamesSec = 5
	turnTimeFastSec      = 10
	turnTimeNormalSec    = 20
)

var winningPositions = [][]int32{
	{0, 1, 2},
	{3, 4, 5},
	{6, 7, 8},
	{0, 3, 6},
	{1, 4, 7},
	{2, 5, 8},
	{0, 4, 8},
	{2, 4, 6},
}

// Compile-time check to make sure all required functions are implemented.
var _ runtime.Match = &MatchHandler{}

type MatchLabel struct {
	Open int `json:"open"`
	Fast int `json:"fast"`
}

type MatchHandler struct {
	marshaler   *protojson.MarshalOptions
	unmarshaler *protojson.UnmarshalOptions
}

type MatchState struct {
	random     *rand.Rand
	label      *MatchLabel
	emptyTicks int

	// Currently connected users, or reserved spaces.
	presences map[string]runtime.Presence
	// Number of users currently in the process of connecting to the match.
	joinsInProgress int

	// True if there's a game currently in progress.
	playing bool
	// Current state of the board.
	board []api.Mark
	// Mark assignments to player user IDs.
	marks map[string]api.Mark
	// Whose turn it currently is.
	mark api.Mark
	// Ticks until they must submit their move.
	deadlineRemainingTicks int64
	// The winner of the current game.
	winner api.Mark
	// The winner positions.
	winnerPositions []int32
	// Ticks until the next game starts, if applicable.
	nextGameRemainingTicks int64
}

func (ms *MatchState) ConnectedCount() int {
	count := 0
	for _, p := range ms.presences {
		if p != nil {
			count++
		}
	}
	return count
}

func (m *MatchHandler) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	fast, ok := params["fast"].(bool)
	if !ok {
		logger.Error("invalid match init parameter \"fast\"")
		return nil, 0, ""
	}

	label := &MatchLabel{
		Open: 1,
	}
	if fast {
		label.Fast = 1
	}
	labelJSON, err := json.Marshal(label)
	if err != nil {
		logger.WithField("error", err).Error("match init failed")
		labelJSON = []byte("{}")
	}

	return &MatchState{
		random: rand.New(rand.NewSource(time.Now().UnixNano())),
		label:  label,

		presences: make(map[string]runtime.Presence, 2),
	}, tickRate, string(labelJSON)
}

func (m *MatchHandler) MatchJoinAttempt(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presence runtime.Presence, metadata map[string]string) (interface{}, bool, string) {
	s := state.(*MatchState)

	// Check if it's a user attempting to rejoin after a disconnect.
	if presence, ok := s.presences[presence.GetUserId()]; ok {
		if presence == nil {
			// User rejoining after a disconnect.
			s.joinsInProgress++
			return s, true, ""
		} else {
			// User attempting to join from 2 different devices at the same time.
			return s, false, "already joined"
		}
	}

	// Check if match is full.
	if len(s.presences)+s.joinsInProgress >= 2 {
		return s, false, "match full"
	}

	// New player attempting to connect.
	s.joinsInProgress++
	return s, true, ""
}

func (m *MatchHandler) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	s := state.(*MatchState)
	t := time.Now().UTC()

	for _, presence := range presences {
		s.emptyTicks = 0
		s.presences[presence.GetUserId()] = presence
		s.joinsInProgress--

		// Check if we must send a message to this user to update them on the current game state.
		var opCode api.OpCode
		var msg proto.Message
		if s.playing {
			// There's a game still currently in progress, the player is re-joining after a disconnect. Give them a state update.
			opCode = api.OpCode_OPCODE_UPDATE
			msg = &api.Update{
				Board:    s.board,
				Mark:     s.mark,
				Deadline: t.Add(time.Duration(s.deadlineRemainingTicks/tickRate) * time.Second).Unix(),
			}
		} else if s.board != nil && s.marks != nil && s.marks[presence.GetUserId()] > api.Mark_MARK_UNSPECIFIED {
			// There's no game in progress but we still have a completed game that the user was part of.
			// They likely disconnected before the game ended, and have since forfeited because they took too long to return.
			opCode = api.OpCode_OPCODE_DONE
			msg = &api.Done{
				Board:           s.board,
				Winner:          s.winner,
				WinnerPositions: s.winnerPositions,
				NextGameStart:   t.Add(time.Duration(s.nextGameRemainingTicks/tickRate) * time.Second).Unix(),
			}
		}

		// Send a message to the user that just joined, if one is needed based on the logic above.
		if msg != nil {
			buf, err := m.marshaler.Marshal(msg)
			if err != nil {
				logger.Error("error encoding message: %v", err)
			} else {
				_ = dispatcher.BroadcastMessage(int64(opCode), buf, []runtime.Presence{presence}, nil, true)
			}
		}
	}

	// Check if match was open to new players, but should now be closed.
	if len(s.presences) >= 2 && s.label.Open != 0 {
		s.label.Open = 0
		if labelJSON, err := json.Marshal(s.label); err != nil {
			logger.Error("error encoding label: %v", err)
		} else {
			if err := dispatcher.MatchLabelUpdate(string(labelJSON)); err != nil {
				logger.Error("error updating label: %v", err)
			}
		}
	}

	return s
}

func (m *MatchHandler) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	s := state.(*MatchState)

	for _, presence := range presences {
		s.presences[presence.GetUserId()] = nil
	}

	return s
}

func (m *MatchHandler) MatchLoop(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, messages []runtime.MatchData) interface{} {
	s := state.(*MatchState)

	if s.ConnectedCount()+s.joinsInProgress == 0 {
		s.emptyTicks++
		if s.emptyTicks >= maxEmptySec*tickRate {
			// Match has been empty for too long, close it.
			logger.Info("closing idle match")
			return nil
		}
	}

	t := time.Now().UTC()

	// If there's no game in progress check if we can (and should) start one!
	if !s.playing {
		// Between games any disconnected users are purged, there's no in-progress game for them to return to anyway.
		for userID, presence := range s.presences {
			if presence == nil {
				delete(s.presences, userID)
			}
		}

		// Check if we need to update the label so the match now advertises itself as open to join.
		if len(s.presences) < 2 && s.label.Open != 1 {
			s.label.Open = 1
			if labelJSON, err := json.Marshal(s.label); err != nil {
				logger.Error("error encoding label: %v", err)
			} else {
				if err := dispatcher.MatchLabelUpdate(string(labelJSON)); err != nil {
					logger.Error("error updating label: %v", err)
				}
			}
		}

		// Check if we have enough players to start a game.
		if len(s.presences) < 2 {
			return s
		}

		// Check if enough time has passed since the last game.
		if s.nextGameRemainingTicks > 0 {
			s.nextGameRemainingTicks--
			return s
		}

		// We can start a game! Set up the game state and assign the marks to each player.
		s.playing = true
		s.board = make([]api.Mark, 9, 9)
		s.marks = make(map[string]api.Mark, 2)
		marks := []api.Mark{api.Mark_MARK_X, api.Mark_MARK_O}
		for userID := range s.presences {
			s.marks[userID] = marks[0]
			marks = marks[1:]
		}
		s.mark = api.Mark_MARK_X
		s.winner = api.Mark_MARK_UNSPECIFIED
		s.winnerPositions = nil
		s.deadlineRemainingTicks = calculateDeadlineTicks(s.label)
		s.nextGameRemainingTicks = 0

		// Notify the players a new game has started.
		buf, err := m.marshaler.Marshal(&api.Start{
			Board:    s.board,
			Marks:    s.marks,
			Mark:     s.mark,
			Deadline: t.Add(time.Duration(s.deadlineRemainingTicks/tickRate) * time.Second).Unix(),
		})
		if err != nil {
			logger.Error("error encoding message: %v", err)
		} else {
			_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_START), buf, nil, nil, true)
		}
		return s
	}

	// There's a game in progress. Check for input, update match state, and send messages to clients.
	for _, message := range messages {
		switch api.OpCode(message.GetOpCode()) {
		case api.OpCode_OPCODE_MOVE:
			mark := s.marks[message.GetUserId()]
			if s.mark != mark {
				// It is not this player's turn.
				_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_REJECTED), nil, []runtime.Presence{message}, nil, true)
				continue
			}

			msg := &api.Move{}
			err := m.unmarshaler.Unmarshal(message.GetData(), msg)
			if err != nil {
				// Client sent bad data.
				_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_REJECTED), nil, []runtime.Presence{message}, nil, true)
				continue
			}
			if msg.Position < 0 || msg.Position > 8 || s.board[msg.Position] != api.Mark_MARK_UNSPECIFIED {
				// Client sent a position outside the board, or one that has already been played.
				_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_REJECTED), nil, []runtime.Presence{message}, nil, true)
				continue
			}

			// Update the game state.
			s.board[msg.Position] = mark
			switch mark {
			case api.Mark_MARK_X:
				s.mark = api.Mark_MARK_O
			case api.Mark_MARK_O:
				s.mark = api.Mark_MARK_X
			}
			s.deadlineRemainingTicks = calculateDeadlineTicks(s.label)

			// Check if game is over through a winning move.
		winCheck:
			for _, winningPosition := range winningPositions {
				for _, position := range winningPosition {
					if s.board[position] != mark {
						continue winCheck
					}
				}

				// Update state to reflect the winner, and schedule the next game.
				s.winner = mark
				s.winnerPositions = winningPosition
				s.playing = false
				s.deadlineRemainingTicks = 0
				s.nextGameRemainingTicks = delayBetweenGamesSec * tickRate
			}
			// Check if game is over because no more moves are possible.
			tie := true
			for _, mark := range s.board {
				if mark == api.Mark_MARK_UNSPECIFIED {
					tie = false
					break
				}
			}
			if tie {
				// Update state to reflect the tie, and schedule the next game.
				s.playing = false
				s.deadlineRemainingTicks = 0
				s.nextGameRemainingTicks = delayBetweenGamesSec * tickRate
			}

			var opCode api.OpCode
			var outgoingMsg proto.Message
			if s.playing {
				opCode = api.OpCode_OPCODE_UPDATE
				outgoingMsg = &api.Update{
					Board:    s.board,
					Mark:     s.mark,
					Deadline: t.Add(time.Duration(s.deadlineRemainingTicks/tickRate) * time.Second).Unix(),
				}
			} else {
				opCode = api.OpCode_OPCODE_DONE
				outgoingMsg = &api.Done{
					Board:           s.board,
					Winner:          s.winner,
					WinnerPositions: s.winnerPositions,
					NextGameStart:   t.Add(time.Duration(s.nextGameRemainingTicks/tickRate) * time.Second).Unix(),
				}
			}

			buf, err := m.marshaler.Marshal(outgoingMsg)
			if err != nil {
				logger.Error("error encoding message: %v", err)
			} else {
				_ = dispatcher.BroadcastMessage(int64(opCode), buf, nil, nil, true)
			}
		default:
			// No other opcodes are expected from the client, so automatically treat it as an error.
			_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_REJECTED), nil, []runtime.Presence{message}, nil, true)
		}
	}

	// Keep track of the time remaining for the player to submit their move. Idle players forfeit.
	if s.playing {
		s.deadlineRemainingTicks--
		if s.deadlineRemainingTicks <= 0 {
			// The player has run out of time to submit their move.
			s.playing = false
			switch s.mark {
			case api.Mark_MARK_X:
				s.winner = api.Mark_MARK_O
			case api.Mark_MARK_O:
				s.winner = api.Mark_MARK_X
			}
			s.deadlineRemainingTicks = 0
			s.nextGameRemainingTicks = delayBetweenGamesSec * tickRate

			buf, err := m.marshaler.Marshal(&api.Done{
				Board:         s.board,
				Winner:        s.winner,
				NextGameStart: t.Add(time.Duration(s.nextGameRemainingTicks/tickRate) * time.Second).Unix(),
			})
			if err != nil {
				logger.Error("error encoding message: %v", err)
			} else {
				_ = dispatcher.BroadcastMessage(int64(api.OpCode_OPCODE_DONE), buf, nil, nil, true)
			}
		}
	}

	return s
}

func (m *MatchHandler) MatchSignal(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, data string) (interface{}, string) {
	return state, ""
}

func (m *MatchHandler) MatchTerminate(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, graceSeconds int) interface{} {
	return state
}

func calculateDeadlineTicks(l *MatchLabel) int64 {
	if l.Fast == 1 {
		return turnTimeFastSec * tickRate
	} else {
		return turnTimeNormalSec * tickRate
	}
}
