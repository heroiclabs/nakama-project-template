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

	"github.com/gofrs/uuid/v5"
	"github.com/heroiclabs/nakama-common/runtime"
)

// A daily reward storage object for a user.
type dailyReward struct {
	LastClaimUnix int64 `json:"last_claim_unix"` // The last time the user claimed the reward in UNIX time.
}

// Fetch daily reward for the player. If a new reward is available send it to the player over a notification.
func rpcRewards(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	_, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
	if !ok {
		return "", errNoUserIdFound
	}

	if len(payload) > 0 {
		return "", errNoInputAllowed
	}

	ip := ctx.Value(runtime.RUNTIME_CTX_CLIENT_IP)
	uid := uuid.Must(uuid.NewV4())

	logger.Info("ctx ip: %s", ip)
	if err := nk.GetSatori().Authenticate(ctx, uid.String()); err != nil {
		logger.WithField("error", err.Error()).Error("Failed to call Satori authenticate")
		return "", err
	}

	return "", nil
}
