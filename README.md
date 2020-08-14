Nakama Project Template
===

> An example project template on how to set up and write custom logic in Nakama server.

The codebase shows a simple gameplay feature for daily rewards written in both Lua and Go. The code shows how to read/write storage objects, send in-app notifications, parse JSON, update player wallets, and handle errors.

For more documentation have a look at:

* https://heroiclabs.com/docs/runtime-code-basics/#rpc-hook
* https://heroiclabs.com/docs/storage-collections/
* https://heroiclabs.com/docs/user-accounts/#virtual-wallet
* https://heroiclabs.com/docs/social-in-app-notifications/
* https://heroiclabs.com/docs/runtime-code-function-reference/

__NOTE__ You can remove the Lua or Go code within this project to develop with just the language you prefer.

### Prerequisites

The codebase requires these development tools:

* Go compiler and runtime: 1.14.0 or greater.
* Docker Engine: 19.0.0 or greater.

### Go Dependencies

The project uses Go modules which should be vendored as normal:

```shell
env GO111MODULE=on GOPRIVATE="github.com" go mod vendor
```

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

These RPC IDs are registered with the server logic:

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
