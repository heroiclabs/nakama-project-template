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

// A daily reward storage object for a user.
type dailyReward struct {
	LastClaimUnix int64 `json:"last_claim_unix"` // The last time the user claimed the reward in UNIX time.
}

// Fetch daily reward for the player. If a new reward is available send it to the player over a notification.
func rpcRewards(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, payload string) (string, error) {
	userID, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
	if !ok {
		return "", errNoUserIdFound
	}

	if len(payload) > 0 {
		return "", errNoInputAllowed
	}

	objects, err := nk.StorageRead(ctx, []*runtime.StorageRead{{
		Collection: "reward",
		Key:        "daily",
		UserID:     userID,
	}})
	if err != nil {
		logger.Error("StorageRead error: %v", err)
		return "", errInternalError
	}

	dailyReward := &dailyReward{
		LastClaimUnix: 0,
	}
	for _, object := range objects {
		switch object.GetKey() {
		case "daily":
			if err := json.Unmarshal([]byte(object.GetValue()), dailyReward); err != nil {
				logger.Error("Unmarshal error: %v", err)
				return "", errUnmarshal
			}
			break
		}
	}

	var resp struct {
		CoinsReceived int64 `json:"coins_received"`
	}
	resp.CoinsReceived = int64(0)

	// If last claimed is before the new day grant a new reward!
	t := time.Now()
	midnight := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local)
	if time.Unix(dailyReward.LastClaimUnix, 0).Before(midnight) {
		resp.CoinsReceived = 500

		// Update player wallet.
		changeset := map[string]int64{
			"coins": resp.CoinsReceived,
		}
		if _, _, err := nk.WalletUpdate(ctx, userID, changeset, map[string]interface{}{}, false); err != nil {
			logger.Error("WalletUpdate error: %v", err)
			return "", errInternalError
		}

		err := nk.NotificationsSend(ctx, []*runtime.NotificationSend{{
			Code: 1001,
			Content: map[string]interface{}{
				"coins": changeset["coins"],
			},
			Persistent: true,
			Sender:     "", // Server sent.
			Subject:    "You've received your daily reward!",
			UserID:     userID,
		}})
		if err != nil {
			logger.Error("NotificationsSend error: %v", err)
			return "", errInternalError
		}

		dailyReward.LastClaimUnix = time.Now().Unix()

		object, err := json.Marshal(dailyReward)
		if err != nil {
			logger.Error("Marshal error: %v", err)
			return "", errInternalError
		}

		version := ""
		if len(objects) > 0 {
			// Use OCC to prevent concurrent writes.
			version = objects[0].GetVersion()
		}

		// Update daily reward storage object for user.
		_, err = nk.StorageWrite(ctx, []*runtime.StorageWrite{{
			Collection:      "reward",
			Key:             "daily",
			PermissionRead:  1,
			PermissionWrite: 0, // No client write.
			Value:           string(object),
			Version:         version,
			UserID:          userID,
		}})
		if err != nil {
			logger.Error("StorageWrite error: %v", err)
			return "", errInternalError
		}
	}

	out, err := json.Marshal(resp)
	if err != nil {
		logger.Error("Marshal error: %v", err)
		return "", errMarshal
	}

	logger.Debug("rpcRewards resp: %v", string(out))
	return string(out), nil
}
