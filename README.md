Nakama Project Template
===

> An example project template on how to set up and write custom logic in Nakama server.

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
