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

--- Refresh a session token which is close to expiry.
function M.rpcRefresh(context, payload)
    if (not context.user_id or #context.user_id < 1) then
        error({ "no user ID in context", 3 })
    end

    if (#payload > 0) then
        error({ "no input allowed", 3 })
    end

    local vars = context.vars or {} -- No session vars so set default.

    local success, result = pcall(nk.users_get_id, { context.user_id })
    if (not success) then
        nk.logger_error(string.format("users_get_id error: %q", objects))
        error({ "internal server error", 13 })
    end

    -- Use the latest username in the new token.
    local token, exp = nk.authenticate_token_generate(context.user_id, result[1].username, 0, vars)

    nk.logger_debug(string.format("New session with %d expiry time: %q", exp, token))

    local resp = {
        ["session"] = token
    }

    local success, result = pcall(nk.json_encode, resp)
    if (not success) then
        nk.logger_error(string.format("json_encode error: %q", result))
        error({ "internal server error", 13 })
    end

    nk.logger_debug(string.format("rpcRefresh resp: %q", result))
    return result
end

return M
