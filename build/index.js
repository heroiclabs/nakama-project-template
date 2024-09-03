'use strict';

var Mark;
(function (Mark) {
  Mark[Mark["UNDEFINED"] = 0] = "UNDEFINED";
  Mark[Mark["X"] = 1] = "X";
  Mark[Mark["O"] = 2] = "O";
})(Mark || (Mark = {}));
var OpCode;
(function (OpCode) {
  OpCode[OpCode["START"] = 1] = "START";
  OpCode[OpCode["UPDATE"] = 2] = "UPDATE";
  OpCode[OpCode["DONE"] = 3] = "DONE";
  OpCode[OpCode["MOVE"] = 4] = "MOVE";
  OpCode[OpCode["REJECTED"] = 5] = "REJECTED";
  OpCode[OpCode["OPPONENT_LEFT"] = 6] = "OPPONENT_LEFT";
  OpCode[OpCode["INVITE_AI"] = 7] = "INVITE_AI";
})(OpCode || (OpCode = {}));

function rpcReward(context, logger, nk, payload) {
  if (!context.userId) {
    throw Error('No user ID in context');
  }
  if (payload) {
    throw Error('no input allowed');
  }
  var objectId = {
    collection: 'reward',
    key: 'daily',
    userId: context.userId
  };
  var objects;
  try {
    objects = nk.storageRead([objectId]);
  } catch (error) {
    logger.error('storageRead error: %s', error);
    throw error;
  }
  var dailyReward = {
    lastClaimUnix: 0
  };
  objects.forEach(function (object) {
    if (object.key == 'daily') {
      dailyReward = object.value;
    }
  });
  var resp = {
    coinsReceived: 0
  };
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  if (dailyReward.lastClaimUnix < msecToSec(d.getTime())) {
    resp.coinsReceived = 500;
    var changeset = {
      coins: resp.coinsReceived
    };
    try {
      nk.walletUpdate(context.userId, changeset, {}, false);
    } catch (error) {
      logger.error('walletUpdate error: %q', error);
      throw error;
    }
    var notification = {
      code: 1001,
      content: changeset,
      persistent: true,
      subject: "You've received your daily reward!",
      userId: context.userId
    };
    try {
      nk.notificationsSend([notification]);
    } catch (error) {
      logger.error('notificationsSend error: %q', error);
      throw error;
    }
    dailyReward.lastClaimUnix = msecToSec(Date.now());
    var write = {
      collection: 'reward',
      key: 'daily',
      permissionRead: 1,
      permissionWrite: 0,
      value: dailyReward,
      userId: context.userId
    };
    if (objects.length > 0) {
      write.version = objects[0].version;
    }
    try {
      nk.storageWrite([write]);
    } catch (error) {
      logger.error('storageWrite error: %q', error);
      throw error;
    }
  }
  var result = JSON.stringify(resp);
  logger.debug('rpcReward resp: %q', result);
  return result;
}
function msecToSec(n) {
  return Math.floor(n / 1000);
}

var aiUserId = "ai-user-id";
var tfServingAddress = "http://tf:8501/v1/models/ttt:predict";
var aiPresence = {
  userId: aiUserId,
  sessionId: "",
  username: aiUserId,
  node: ""
};
function aiMessage(code, data) {
  return {
    sender: aiPresence,
    persistence: true,
    status: "",
    opCode: code,
    data: data,
    reliable: true,
    receiveTimeMs: Date.now()
  };
}
function aiTurn(state, logger, nk) {
  var aiCell = [1, 0];
  var playerCell = [0, 1];
  var undefCell = [0, 0];
  var b = [[undefCell, undefCell, undefCell], [undefCell, undefCell, undefCell], [undefCell, undefCell, undefCell]];
  state.board.forEach(function (mark, idx) {
    var rowIdx = Math.floor(idx / 3);
    var cellIdx = idx % 3;
    if (mark === state.marks[aiUserId]) b[rowIdx][cellIdx] = aiCell;else if (mark === null || mark === Mark.UNDEFINED) b[rowIdx][cellIdx] = undefCell;else b[rowIdx][cellIdx] = playerCell;
  });
  var headers = {
    'Accept': 'application/json'
  };
  var resp = nk.httpRequest(tfServingAddress, 'post', headers, JSON.stringify({
    instances: [b]
  }));
  var body = JSON.parse(resp.body);
  var predictions = [];
  try {
    predictions = body.predictions[0];
  } catch (error) {
    logger.error("received unexpected TF response: %v: %v", error, body);
    return;
  }
  var maxVal = -Infinity;
  var aiMovePos = -1;
  predictions.forEach(function (val, idx) {
    if (val > maxVal) {
      maxVal = val;
      aiMovePos = idx;
    }
  });
  if (aiMovePos > -1) {
    var move = nk.stringToBinary(JSON.stringify({
      position: aiMovePos
    }));
    state.aiMessage = aiMessage(OpCode.MOVE, move);
  }
}

var moduleName = "tic-tac-toe_js";
var tickRate = 5;
var maxEmptySec = 30;
var delaybetweenGamesSec = 5;
var turnTimeFastSec = 10;
var turnTimeNormalSec = 20;
var winningPositions = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
var matchInit = function matchInit(ctx, logger, nk, params) {
  var fast = !!params['fast'];
  var ai = !!params['ai'];
  var label = {
    open: 1,
    fast: 0
  };
  if (fast) {
    label.fast = 1;
  }
  var state = {
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
    aiMessage: null
  };
  if (ai) {
    state.presences[aiUserId] = aiPresence;
  }
  return {
    state: state,
    tickRate: tickRate,
    label: JSON.stringify(label)
  };
};
var matchJoinAttempt = function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (presence.userId in state.presences) {
    if (state.presences[presence.userId] === null) {
      state.joinsInProgress++;
      return {
        state: state,
        accept: false
      };
    } else {
      return {
        state: state,
        accept: false,
        rejectMessage: 'already joined'
      };
    }
  }
  if (connectedPlayers(state) + state.joinsInProgress >= 2) {
    return {
      state: state,
      accept: false,
      rejectMessage: 'match full'
    };
  }
  state.joinsInProgress++;
  return {
    state: state,
    accept: true
  };
};
var matchJoin = function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  var t = msecToSec(Date.now());
  for (var _i = 0, presences_1 = presences; _i < presences_1.length; _i++) {
    var presence = presences_1[_i];
    state.emptyTicks = 0;
    state.presences[presence.userId] = presence;
    state.joinsInProgress--;
    if (state.playing) {
      var update = {
        board: state.board,
        mark: state.mark,
        deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate)
      };
      dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(update));
    } else if (state.board.length !== 0 && Object.keys(state.marks).length !== 0 && state.marks[presence.userId]) {
      logger.debug('player %s rejoined game', presence.userId);
      var done = {
        board: state.board,
        winner: state.winner,
        winnerPositions: state.winnerPositions,
        nextGameStart: t + Math.floor(state.nextGameRemainingTicks / tickRate)
      };
      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(done));
    }
  }
  if (Object.keys(state.presences).length >= 2 && state.label.open != 0) {
    state.label.open = 0;
    var labelJSON = JSON.stringify(state.label);
    dispatcher.matchLabelUpdate(labelJSON);
  }
  return {
    state: state
  };
};
var matchLeave = function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (var _i = 0, presences_2 = presences; _i < presences_2.length; _i++) {
    var presence = presences_2[_i];
    logger.info("Player: %s left match: %s.", presence.userId, ctx.matchId);
    state.presences[presence.userId] = null;
  }
  var humanPlayersRemaining = [];
  Object.keys(state.presences).forEach(function (userId) {
    if (userId !== aiUserId && state.presences[userId] !== null) humanPlayersRemaining.push(state.presences[userId]);
  });
  if (humanPlayersRemaining.length === 1) {
    dispatcher.broadcastMessage(OpCode.OPPONENT_LEFT, null, humanPlayersRemaining, null, true);
  } else if (state.ai && humanPlayersRemaining.length === 0) {
    delete state.presences[aiUserId];
    state.ai = false;
  }
  return {
    state: state
  };
};
var matchLoop = function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  var _a;
  logger.debug('Running match loop. Tick: %d', tick);
  if (connectedPlayers(state) + state.joinsInProgress === 0) {
    state.emptyTicks++;
    if (state.emptyTicks >= maxEmptySec * tickRate) {
      logger.info('closing idle match');
      return null;
    }
  }
  var t = msecToSec(Date.now());
  if (!state.playing) {
    for (var userID in state.presences) {
      if (state.presences[userID] === null) {
        delete state.presences[userID];
      }
    }
    if (Object.keys(state.presences).length < 2 && state.label.open != 1) {
      state.label.open = 1;
      var labelJSON = JSON.stringify(state.label);
      dispatcher.matchLabelUpdate(labelJSON);
    }
    if (Object.keys(state.presences).length < 2) {
      return {
        state: state
      };
    }
    if (state.nextGameRemainingTicks > 0) {
      state.nextGameRemainingTicks--;
      return {
        state: state
      };
    }
    state.playing = true;
    state.board = new Array(9);
    state.marks = {};
    var marks_1 = [Mark.X, Mark.O];
    Object.keys(state.presences).forEach(function (userId) {
      var _a;
      if (state.ai) {
        if (userId === aiUserId) {
          state.marks[userId] = Mark.O;
        } else {
          state.marks[userId] = Mark.X;
        }
      } else {
        state.marks[userId] = (_a = marks_1.shift()) !== null && _a !== void 0 ? _a : null;
      }
    });
    state.mark = Mark.X;
    state.winner = Mark.UNDEFINED;
    state.winnerPositions = null;
    state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
    state.nextGameRemainingTicks = 0;
    var msg = {
      board: state.board,
      marks: state.marks,
      mark: state.mark,
      deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate)
    };
    dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg));
    return {
      state: state
    };
  }
  if (state.aiMessage !== null) {
    messages.push(state.aiMessage);
    state.aiMessage = null;
  }
  var _loop_1 = function _loop_1(message) {
    var _b;
    switch (message.opCode) {
      case OpCode.MOVE:
        logger.debug('Received move message from user: %v', state.marks);
        var mark = (_a = state.marks[message.sender.userId]) !== null && _a !== void 0 ? _a : null;
        var sender = message.sender.userId == aiUserId ? null : [message.sender];
        if (mark === null || state.mark !== mark) {
          dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
          return "continue";
        }
        var msg = {};
        try {
          msg = JSON.parse(nk.binaryToString(message.data));
        } catch (error) {
          dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
          logger.debug('Bad data received: %v', error);
          return "continue";
        }
        if (state.board[msg.position]) {
          dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
          return "continue";
        }
        state.board[msg.position] = mark;
        state.mark = mark === Mark.O ? Mark.X : Mark.O;
        state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
        var winner = (_b = winCheck(state.board, mark), _b[0]),
          winningPos = _b[1];
        if (winner) {
          state.winner = mark;
          state.winnerPositions = winningPos;
          state.playing = false;
          state.deadlineRemainingTicks = 0;
          state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
        }
        var tie = state.board.every(function (v) {
          return v !== null;
        });
        if (tie) {
          state.playing = false;
          state.deadlineRemainingTicks = 0;
          state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
        }
        var opCode = void 0;
        var outgoingMsg = void 0;
        if (state.playing) {
          opCode = OpCode.UPDATE;
          var msg_1 = {
            board: state.board,
            mark: state.mark,
            deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate)
          };
          outgoingMsg = msg_1;
        } else {
          opCode = OpCode.DONE;
          var msg_2 = {
            board: state.board,
            winner: state.winner,
            winnerPositions: state.winnerPositions,
            nextGameStart: t + Math.floor(state.nextGameRemainingTicks / tickRate)
          };
          outgoingMsg = msg_2;
        }
        dispatcher.broadcastMessage(opCode, JSON.stringify(outgoingMsg));
        break;
      case OpCode.INVITE_AI:
        if (state.ai) {
          logger.error('AI player is already playing');
          return "continue";
        }
        var activePlayers_1 = [];
        Object.keys(state.presences).forEach(function (userId) {
          var p = state.presences[userId];
          if (p === null) {
            delete state.presences[userId];
          } else {
            activePlayers_1.push(p);
          }
        });
        logger.debug('active users: %d', activePlayers_1.length);
        if (activePlayers_1.length != 1) {
          logger.error('one active player is required to enable AI mode');
          return "continue";
        }
        state.ai = true;
        state.presences[aiUserId] = aiPresence;
        if (state.marks[activePlayers_1[0].userId] == Mark.O) {
          state.marks[aiUserId] = Mark.X;
        } else {
          state.marks[aiUserId] = Mark.O;
        }
        logger.info('AI player joined match');
        break;
      default:
        dispatcher.broadcastMessage(OpCode.REJECTED, null, [message.sender]);
        logger.error('Unexpected opcode received: %d', message.opCode);
    }
  };
  for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
    var message = messages_1[_i];
    _loop_1(message);
  }
  if (state.playing) {
    state.deadlineRemainingTicks--;
    if (state.deadlineRemainingTicks <= 0) {
      state.playing = false;
      state.winner = state.mark === Mark.O ? Mark.X : Mark.O;
      state.deadlineRemainingTicks = 0;
      state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;
      var msg = {
        board: state.board,
        winner: state.winner,
        nextGameStart: t + Math.floor(state.nextGameRemainingTicks / tickRate),
        winnerPositions: null
      };
      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
    }
  }
  if (state.ai && state.mark === state.marks[aiUserId]) {
    aiTurn(state, logger, nk);
  }
  return {
    state: state
  };
};
var matchTerminate = function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return {
    state: state
  };
};
var matchSignal = function matchSignal(ctx, logger, nk, dispatcher, tick, state) {
  return {
    state: state
  };
};
function calculateDeadlineTicks(l) {
  if (l.fast === 1) {
    return turnTimeFastSec * tickRate;
  } else {
    return turnTimeNormalSec * tickRate;
  }
}
function winCheck(board, mark) {
  for (var _i = 0, winningPositions_1 = winningPositions; _i < winningPositions_1.length; _i++) {
    var wp = winningPositions_1[_i];
    if (board[wp[0]] === mark && board[wp[1]] === mark && board[wp[2]] === mark) {
      return [true, wp];
    }
  }
  return [false, null];
}
function connectedPlayers(s) {
  var count = 0;
  for (var _i = 0, _a = Object.keys(s.presences); _i < _a.length; _i++) {
    var p = _a[_i];
    if (s.presences[p] !== null) {
      count++;
    }
  }
  return count;
}

var rpcFindMatch = function rpcFindMatch(ctx, logger, nk, payload) {
  if (!ctx.userId) {
    throw Error('No user ID in context');
  }
  if (!payload) {
    throw Error('Expects payload.');
  }
  var request = {};
  try {
    request = JSON.parse(payload);
  } catch (error) {
    logger.error('Error parsing json message: %q', error);
    throw error;
  }
  if (request.ai) {
    var matchId = nk.matchCreate(moduleName, {
      fast: request.fast,
      ai: true
    });
    var res_1 = {
      matchIds: [matchId]
    };
    return JSON.stringify(res_1);
  }
  var matches;
  try {
    var query = "+label.open:1 +label.fast:".concat(request.fast ? 1 : 0);
    matches = nk.matchList(10, true, null, null, 1, query);
  } catch (error) {
    logger.error('Error listing matches: %v', error);
    throw error;
  }
  var matchIds = [];
  if (matches.length > 0) {
    matchIds = matches.map(function (m) {
      return m.matchId;
    });
  } else {
    try {
      matchIds.push(nk.matchCreate(moduleName, {
        fast: request.fast
      }));
    } catch (error) {
      logger.error('Error creating match: %v', error);
      throw error;
    }
  }
  var res = {
    matchIds: matchIds
  };
  return JSON.stringify(res);
};

var contentful = require('contentful');
var siwe = require('siwe');
var rpcIdRewards = 'rewards_js';
var rpcIdFindMatch = 'find_match_js';
var scheme = "https";
var domain = "localhost";
var origin = "https://localhost/login";
function InitModule(ctx, logger, nk, initializer) {
  initializer.registerRpc(rpcIdRewards, rpcReward);
  initializer.registerRpc(rpcIdFindMatch, rpcFindMatch);
  initializer.registerMatch(moduleName, {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal
  });
  var client = contentful.createClient({
    space: 'developer_bookshelf',
    accessToken: '0b7f6x59a0'
  });
  logger.debug('client: ' + JSON.stringify(client));
  logger.info('JavaScript logic loaded.');
  console.log(createSiweMessage("0x6Ee9894c677EFa1c56392e5E7533DE76004C8D94", "This is a test statement."));
}
function createSiweMessage(address, statement) {
  var siweMessage = new siwe.SiweMessage({
    scheme: scheme,
    domain: domain,
    address: address,
    statement: statement,
    uri: origin,
    version: '1',
    chainId: '1'
  });
  return siweMessage.prepareMessage();
}
!InitModule && InitModule.bind(null);
