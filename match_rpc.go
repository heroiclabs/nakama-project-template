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
	"fmt"

	"github.com/heroiclabs/nakama-common/runtime"
	"github.com/heroiclabs/nakama-project-template/api"
	"google.golang.org/protobuf/encoding/protojson"
)

type nakamaRpcFunc func(context.Context, runtime.Logger, *sql.DB, runtime.NakamaModule, string) (string, error)

func rpcFindMatch(marshaler *protojson.MarshalOptions, unmarshaler *protojson.UnmarshalOptions) nakamaRpcFunc {
	return func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
		_, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
		if !ok {
			return "", errNoUserIdFound
		}

		request := &api.RpcFindMatchRequest{}
		if err := unmarshaler.Unmarshal([]byte(payload), request); err != nil {
			return "", errUnmarshal
		}

		// If AI flag is set just create a brand-new match
		if request.Ai {
			matchID, err := nk.MatchCreate(
				ctx, moduleName, map[string]interface{}{
					"ai": true, "fast": request.Fast})
			if err != nil {
				logger.Error("error creating match: %v", err)
				return "", errInternalError
			}

			response, err := marshaler.Marshal(&api.RpcFindMatchResponse{
				MatchIds: []string{matchID}})
			if err != nil {
				logger.Error("error marshaling response payload: %v", err.Error())
				return "", errMarshal
			}

			logger.Info("new AI match created %s", matchID)

			return string(response), nil
		}

		maxSize := 1
		var fast int
		if request.Fast {
			fast = 1
		}
		query := fmt.Sprintf("+label.open:1 +label.fast:%d", fast)

		matchIDs := make([]string, 0, 10)
		matches, err := nk.MatchList(ctx, 10, true, "", nil, &maxSize, query)
		if err != nil {
			logger.Error("error listing matches: %v", err)
			return "", errInternalError
		}
		if len(matches) > 0 {
			// There are one or more ongoing matches the user could join.
			for _, match := range matches {
				matchIDs = append(matchIDs, match.MatchId)
			}
		} else {
			// No available matches found, create a new one.
			matchID, err := nk.MatchCreate(ctx, moduleName, map[string]interface{}{"fast": request.Fast})
			if err != nil {
				logger.Error("error creating match: %v", err)
				return "", errInternalError
			}
			matchIDs = append(matchIDs, matchID)
		}

		response, err := marshaler.Marshal(&api.RpcFindMatchResponse{MatchIds: matchIDs})
		if err != nil {
			logger.Error("error marshaling response payload: %v", err.Error())
			return "", errMarshal
		}

		return string(response), nil
	}
}
