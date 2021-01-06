Nakama Project Template
===

> An example project template on how to set up and write custom logic in Nakama server.

The codebase shows a few simple gameplay features written in all three of the runtime framework languages supported by the server: Go, Lua, and TypeScript. The code shows how to read/write storage objects, send in-app notifications, parse JSON, update player wallets, and handle errors.

For more documentation have a look at:

* https://heroiclabs.com/docs/runtime-code-basics/
* https://heroiclabs.com/docs/storage-collections/
* https://heroiclabs.com/docs/user-accounts/#virtual-wallet
* https://heroiclabs.com/docs/social-in-app-notifications/
* https://heroiclabs.com/docs/gameplay-multiplayer-server-multiplayer/
* https://heroiclabs.com/docs/runtime-code-function-reference/

For a detailed guide on setting up TypeScript check out the [Setup page](https://heroiclabs.com/docs/runtime-code-typescript-setup/#initialize-the-project).

__NOTE__ You can remove the Go, Lua or TypeScript code within this project to develop with just the single language you prefer.

### Prerequisites

The codebase requires these development tools:

* Go compiler and runtime: 1.15.2 or greater.
* Docker Engine: 19.0.0 or greater.
* Node v14 (active LTS) or greater.
* Basic UNIX tools or knowledge on the Windows equivalents.

### Go Dependencies

The project uses Go modules which should be vendored as normal:

```shell
env GO111MODULE=on GOPRIVATE="github.com" go mod vendor
```

### TypeScript Dependencies

The project uses NPM to manage dependencies which can be installed as normal:

```shell
npm install
```

Before you start the server you can transpile the TypeScript code to JavaScript code with the TypeScript compiler:

```shell
npx tsc
```

The bundled JavaScript code output can be found in "build/index.js".

### Start

The recommended workflow is to use Docker and the compose file to build and run the game server and database resources.

```shell
docker-compose up --build nakama
```

### Recompile / Run

When the containers have been started as shown above you can replace just the game server custom code and recompile it with the `-d` option.

```shell
docker-compose up -d --build nakama
```

### Stop

To stop all running containers you can use the Docker compose sub-command.

```shell
docker-compose down
```

You can wipe the database and workspace with `docker-compose down -v` to remove the disk volumes.

### Run RPC function

A bunch of RPC IDs are registered with the server logic. A couple of these are:

* "rewards" in Go or as "reward" in Lua.
* "refreshes" in Go or as "refresh" in Lua.

To execute the RPC function with cURL generated a session token:

```shell
curl "127.0.0.1:7350/v2/account/authenticate/device" --data "{\"id\": \""$(uuidgen)"\"}" --user 'defaultkey:'
```

Take the session token in the response and use it to execute the RPC function as the user:

```shell
curl "127.0.0.1:7350/v2/rpc/rewards" -H 'Authorization: Bearer $TOKEN' --data '""'
```

This will generate an RPC response on the initial response in that day and grant no more until the rollover.

```
{"payload":"{\"coins_received\":500}"}
or
{"payload":"{\"coins_received\":0}"}
```

You can also skip the cURL steps and use the [Nakama Console's API Explorer](http://127.0.0.1:7351/apiexplorer) to execute the RPCs.

### Authoritative Multiplayer

The authoritative multiplayer example includes a match handler that defines game logic, and an RPC function players should call to find a match they can join or have the server create one for them if none are available.

Running the match finder RPC function registered as RPC ID "find_match" returns one or more match IDs that fit the user's criteria:

```shell
curl "127.0.0.1:7350/v2/rpc/find_match" -H 'Authorization: Bearer $TOKEN' --data '"{}"'
```

This will return one or more match IDs:

```
{"payload":"{\"match_ids\":[\"match ID 1\","match ID 2\",\"...\"]}"}
```

To join one of these matches check the [documentation on individual client libraries here](https://heroiclabs.com/docs/gameplay-multiplayer-realtime/#join-a-match).


### Contribute

The development roadmap is managed as GitHub issues and pull requests are welcome. If you're interested to add a gameplay feature as a new example; which is not mentioned on the issue tracker please open one to create a discussion or drop in and discuss it in the [community forum](https://forum.heroiclabs.com).

Finally, we love feedback and would love to hear from you. Please join our [Forums](https://forum.heroiclabs.com/) and connect with us today!
