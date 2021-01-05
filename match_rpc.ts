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

let rpcFindMatch: nkruntime.RpcFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    if (!ctx.userId) {
        throw Error('No user ID in context');
    }

    if (!payload) {
        throw Error('Expects payload.');
    }

    let request = {} as RpcFindMatchRequest;
    try {
        request = JSON.parse(payload);
    } catch (error) {
        logger.error('Error parsing json message: %q', error);
        throw error;
    }

    let matches: nkruntime.Match[];
    try {
        const query = `+label.open:1 +label.fast:${request.fast ? 1 : 0}`;
        matches = nk.matchList(10, true, null, null, 1, query);
    } catch (error) {
        logger.error('Error listing matches: %v', error);
        throw error;
    }

    let matchIds: string[] = [];
    if (matches.length > 0) {
        // There are one or more ongoing matches the user could join.
        matchIds = matches.map(m => m.matchId);
    } else {
        // No available matches found, create a new one.
        try {
            matchIds.push(nk.matchCreate(moduleName, {fast: request.fast}));
        } catch (error) {
            logger.error('Error creating match: %v', error);
            throw error;
        }
    }

    let res: RpcFindMatchResponse = { matchIds };
    return JSON.stringify(res);
}
