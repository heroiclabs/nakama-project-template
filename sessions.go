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
	"github.com/heroiclabs/nakama-common/runtime"
	"time"
)

// Refresh a session token which is close to expiry.
func rpcRefresh(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	userID, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
	if !ok {
		return "", errNoUserIdFound
	}

	if len(payload) > 0 {
		return "", errNoInputAllowed
	}

	exp, ok := ctx.Value(runtime.RUNTIME_CTX_USER_SESSION_EXP).(int64)
	if !ok || time.Now().Sub(time.Unix(exp, 0)) < 6*time.Hour {
		// 0 uses system expiry settings.
		exp = 0
	}

	vars, ok := ctx.Value(runtime.RUNTIME_CTX_VARS).(map[string]string)
	if !ok {
		vars = map[string]string{} // No session vars so set default.
	}

	users, err := nk.UsersGetId(ctx, []string{userID})
	if err != nil {
		logger.Error("UsersGetId error: %v", err)
		return "", errInternalError
	}

	// Use the latest username in the new token.
	token, exp, err := nk.AuthenticateTokenGenerate(userID, users[0].GetUsername(), exp, vars)
	if err != nil {
		logger.Error("AuthenticateTokenGenerate error: %v", err)
		return "", errInternalError
	}

	logger.Debug("New session with %d expiry time: %v", exp, token)

	var resp struct {
		Session string `json:"token"`
	}
	resp.Session = token

	out, err := json.Marshal(resp)
	if err != nil {
		logger.Error("Marshal error: %v", err)
		return "", errMarshal
	}

	logger.Debug("rpcRefresh resp: %v", string(out))
	return string(out), nil
}
