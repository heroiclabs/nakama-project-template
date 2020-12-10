--[[
 Copyright 2020 The Nakama Authors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
--]]

local nk = require("nakama")

local M = {
}

--- Fetch daily reward for the player. If a new reward is available send it to the player over a notification.
function M.rpcReward(context, payload)
    if (not context.user_id or #context.user_id < 1) then
        error({ "no user ID in context", 3 })
    end

    if (#payload > 0) then
        error({ "no input allowed", 3 })
    end

    local objectid = {
        collection = "reward",
        key = "daily",
        user_id = context.user_id
    }
    local success, objects = pcall(nk.storage_read, { objectid })
    if (not success) then
        nk.logger_error(string.format("storage_read error: %q", objects))
        error({ "internal server error", 13 })
    end

    local dailyReward = {
        ["last_claim_unix"] = 0
    }
    for _, object in ipairs(objects)
    do
        if (object.key == "daily") then
            dailyReward = object.value
            break
        end
    end

    local resp = {
        ["coins_received"] = 0
    }

    local dt = os.date("*t")
    local elapsed_sec_from_midnight = (dt.hour * 3600 + dt.min * 60 + dt.sec) % 86400

    -- If last claimed is before the new day grant a new reward!
    if (dailyReward.last_claim_unix < (os.time() - elapsed_sec_from_midnight)) then
        resp.coins_received = 500

        -- Update player wallet.
        local changeset = {
            ["coins"] = resp.coins_received
        }
        local success, result = pcall(nk.wallet_update, context.user_id, changeset, {}, false)
        if (not success) then
            nk.logger_error(string.format("wallet_update error: %q", result))
            error({ "internal server error", 13 })
        end

        local notification = {
            code = 1001,
            content = changeset,
            persistent = true,
            sender = "",
            subject = "You've received your daily reward!",
            user_id = context.user_id
        }
        local success, result = pcall(nk.notifications_send, { notification })
        if (not success) then
            nk.logger_error(string.format("notifications_send error: %q", result))
            error({ "internal server error", 13 })
        end

        dailyReward.last_claim_unix = os.time()

        local version = nil
        if (#objects > 0) then
            -- Use OCC to prevent concurrent writes.
            version = objects[1].version
        end

        -- Update daily reward storage object for user.
        local write = {
            collection = "reward",
            key = "daily",
            permission_read = 1,
            permission_write = 0,
            value = dailyReward,
            version = version,
            user_id = context.user_id
        }
        local success, result = pcall(nk.storage_write, { write })
        if (not success) then
            nk.logger_error(string.format("storage_write error: %q", result))
            error({ "internal server error", 13 })
        end
    end

    local success, result = pcall(nk.json_encode, resp)
    if (not success) then
        nk.logger_error(string.format("json_encode error: %q", result))
        error({ "internal server error", 13 })
    end

    nk.logger_debug(string.format("rpcReward resp: %q", result))
    return result
end

return M
