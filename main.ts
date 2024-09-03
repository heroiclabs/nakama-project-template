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

import { moduleName, matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match_handler.ts';
import { rpcFindMatch } from './match_rpc.ts';
import { rpcReward } from './daily_rewards.ts';

const contentful = require('contentful');
const siwe = require('siwe');

const rpcIdRewards = 'rewards_js';
const rpcIdFindMatch = 'find_match_js';

const scheme = "https";
const domain = "localhost";
const origin = "https://localhost/login";

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    initializer.registerRpc(rpcIdRewards, rpcReward);

    initializer.registerRpc(rpcIdFindMatch, rpcFindMatch);

    initializer.registerMatch(moduleName, {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal,
    });

    const client = contentful.createClient({
        // This is the space ID. A space is like a project folder in Contentful terms
        space: 'developer_bookshelf',
        // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
        accessToken: '0b7f6x59a0',
    })

    logger.debug('client: ' + JSON.stringify(client));

    logger.info('JavaScript logic loaded.');

    console.log(createSiweMessage(
        "0x6Ee9894c677EFa1c56392e5E7533DE76004C8D94",
        "This is a test statement."
    ));
}


function createSiweMessage(address: string, statement: string) {
    const siweMessage = new siwe.SiweMessage({
        scheme,
        domain,
        address,
        statement,
        uri: origin,
        version: '1',
        chainId: '1'
    });
    return siweMessage.prepareMessage();
}


// Reference InitModule to avoid it getting removed on build
!InitModule && InitModule.bind(null);


