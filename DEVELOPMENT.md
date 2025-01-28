# Building from Source

## Pre-requisites

** [Yarn](https://yarnpkg.com/en/docs/install) - Yarn package manager

## Environment

### Windows

1. Download and extract [MinGW64](https://sourceforge.net/projects/mingw-w64/files/) (scroll down and select x86_64-posix-seh, don't use the autoinstaller, it doesn't work)
2. Search for "Advanced System Settings" and open the System Properties dialog.
    1. Click the `Environment Variables` button
    2. Under System Variables find `Path`. Edit and add `C:\MinGW\bin` (replace with the correct path to where you extracted MingW64).

NOTE: The `make` command in Windows will be `mingw32-make` with MinGW. For example, `make pre-ui` will be `mingw32-make pre-ui`.

### macOS

1. If you don't have it already, install the [Homebrew package manager](https://brew.sh).
2. Install dependencies: `brew install git yarn make node`

### Linux

#### Arch Linux

1. Install dependencies: `sudo pacman -S git yarn nodejs --needed`

#### Ubuntu

1. Install dependencies: `sudo apt-get install git yarnpkg nodejs -y`

### OpenBSD

1. Install dependencies `doas pkg_add gmake git yarn node`

NOTE: The `make` command in OpenBSD will be `gmake`. For example, `make pre-ui` will be `gmake pre-ui`.

## Commands

* `make pre-ui` - Installs the UI dependencies. This only needs to be run once after cloning the repository, or if the dependencies are updated.
* `make generate` - Generates UI GraphQL files. Requires `make pre-ui` to have been run. Defaults to generating using running stash server at `http://localhost:9999`. The URL can be changed using the environment variable `SCHEMA_URL`. Alternatively, the schema can be generated from the stash source repository by setting the environment variable `SCHEMA_PATH` to the `graphql` directory of the stash source repository.
* `make ui` - Builds the UI. Requires `make pre-ui` to have been run.
* `make validate` - Runs all of the tests and checks required to submit a PR
* `make fmt-ui` - Formats the UI source code
* `make fmt-ui-quick` - (experimental) Formats only changed UI source code
* `make validate-ui-quick` - (experimental) Runs tests and checks of changed UI code
* `make ui-start` - Runs the UI in development mode. Requires a running Stash server to connect to - the server URL can be changed from the default of `http://localhost:9999` using the environment variable `VITE_APP_PLATFORM_URL`, but keep in mind that authentication cannot be used since the session authorization cookie cannot be sent cross-origin. The UI runs on port `3000` or the next available port.

## Local development quickstart

1. Run `make pre-ui` to install UI dependencies
2. Run a stash server to generate the GraphQL schema from.
3. Run `make generate` to create generated files
4. Run `make ui-start` to run the UI in development mode
5. Open the UI in a browser: `http://localhost:3000/`

Changes to the UI code can be seen by reloading the browser page.

