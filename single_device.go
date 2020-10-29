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
	"github.com/heroiclabs/nakama-common/api"
	"github.com/heroiclabs/nakama-common/runtime"
	"time"
)

const (
	notificationCodeSingleDevice = 101

	streamModeNotification = 0
)

func SingleDeviceLimiter(nk runtime.NakamaModule, initializer runtime.Initializer) error {
	if err := initializer.RegisterEventSessionStart(eventSessionStartFunc(nk)); err != nil {
		return err
	}

	return nil
}

// Limit the number of concurrent realtime sessions active for a user to just one.
func eventSessionStartFunc(nk runtime.NakamaModule) func(context.Context, runtime.Logger, *api.Event) {
	return func(ctx context.Context, logger runtime.Logger, evt *api.Event) {
		userID, ok := ctx.Value(runtime.RUNTIME_CTX_USER_ID).(string)
		if !ok {
			logger.Error("context did not contain user ID.")
			return
		}

		sessionID, ok := ctx.Value(runtime.RUNTIME_CTX_SESSION_ID).(string)
		if !ok {
			logger.Error("context did not contain session ID.")
			return
		}

		// Fetch all live presences for this user on their private notification stream.
		presences, err := nk.StreamUserList(streamModeNotification, userID, "", "", true, true)
		if err != nil {
			logger.WithField("err", err).Error("nk.StreamUserList error.")
			return
		}

		notifications := []*runtime.NotificationSend{
			{
				Code: notificationCodeSingleDevice,
				Content: map[string]interface{}{
					"kicked_by": sessionID,
				},
				Persistent: false,
				Sender:     userID,
				Subject:    "Another device is active!",
				UserID:     userID,
			},
		}
		for _, presence := range presences {
			if presence.GetUserId() == userID && presence.GetSessionId() == sessionID {
				// Ignore our current socket connection.
				continue
			}

			ctx2, _ := context.WithTimeout(context.Background(), 3*time.Second)
			if err := nk.NotificationsSend(ctx2, notifications); err != nil {
				logger.WithField("err", err).Error("nk.NotificationsSend error.")
				continue
			}

			// Force disconnect the socket for the user's other game client.
			if err := nk.SessionDisconnect(ctx2, presence.GetSessionId()); err != nil {
				logger.WithField("err", err).Error("nk.SessionDisconnect error.")
				continue
			}
		}
	}
}
