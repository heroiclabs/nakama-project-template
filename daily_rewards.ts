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

function rpcReward(context: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    if (!context.userId) {
        throw Error('No user ID in context');
    }

    if (payload){
        throw Error('no input allowed');
    }

    let ip = context.clientIp;

    let uuid = nk.uuidv4();
    logger.info('ctx ip: %s', ip);
    nk.getSatori().authenticate(uuid);

    return '';
}

function msecToSec(n: number): number {
    return Math.floor(n / 1000);
}
