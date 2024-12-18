IS_WIN_SHELL =
ifeq (${SHELL}, sh.exe)
  IS_WIN_SHELL = true
endif
ifeq (${SHELL}, cmd)
  IS_WIN_SHELL = true
endif

ifdef IS_WIN_SHELL
  RM := del /s /q
  RMDIR := rmdir /s /q
  NOOP := @@
else
  RM := rm -f
  RMDIR := rm -rf
  NOOP := @:
endif

# set LDFLAGS environment variable to any extra ldflags required
LDFLAGS := $(LDFLAGS)

# set OUTPUT environment variable to generate a specific binary name
# this will apply to both `stash` and `phasher`, so build them separately
# alternatively use STASH_OUTPUT or PHASHER_OUTPUT to set the value individually
ifdef OUTPUT
  STASH_OUTPUT := $(OUTPUT)
endif

# set STASH_NOLEGACY environment variable or uncomment to disable legacy browser support
# STASH_NOLEGACY := true

# set STASH_SOURCEMAPS environment variable or uncomment to enable UI sourcemaps
# STASH_SOURCEMAPS := true

.PHONY: release
release: pre-ui ui

# targets to set various build flags
# use combinations on the make command-line to configure a build, e.g.:
# for a static-pie release build: `make flags-static-pie flags-release stash`
# for a static windows debug build: `make flags-static-windows stash`

# $(NOOP) prevents "nothing to be done" warnings

.PHONY: flags-release
flags-release:
	$(NOOP)
	$(eval LDFLAGS += -s -w)
	$(eval GO_BUILD_FLAGS += -trimpath)

.PHONY: flags-pie
flags-pie:
	$(NOOP)
	$(eval GO_BUILD_FLAGS += -buildmode=pie)

.PHONY: flags-static
flags-static:
	$(NOOP)
	$(eval LDFLAGS += -extldflags=-static)
	$(eval GO_BUILD_TAGS += sqlite_omit_load_extension osusergo netgo)

.PHONY: flags-static-pie
flags-static-pie:
	$(NOOP)
	$(eval LDFLAGS += -extldflags=-static-pie)
	$(eval GO_BUILD_FLAGS += -buildmode=pie)
	$(eval GO_BUILD_TAGS += sqlite_omit_load_extension osusergo netgo)

# identical to flags-static-pie, but excluding netgo, which is not needed on windows
.PHONY: flags-static-windows
flags-static-windows:
	$(NOOP)
	$(eval LDFLAGS += -extldflags=-static-pie)
	$(eval GO_BUILD_FLAGS += -buildmode=pie)
	$(eval GO_BUILD_TAGS += sqlite_omit_load_extension osusergo)

.PHONY: build-info
build-info:
ifndef BUILD_DATE
	$(eval BUILD_DATE := $(shell go run scripts/getDate.go))
endif
ifndef GITHASH
	$(eval GITHASH := $(shell git rev-parse --short HEAD))
endif
ifndef STASH_VERSION
	$(eval STASH_VERSION := $(shell git describe --tags --exclude latest_develop))
endif
ifndef OFFICIAL_BUILD
	$(eval OFFICIAL_BUILD := false)
endif

.PHONY: build-flags
build-flags: build-info
	$(eval BUILD_LDFLAGS := $(LDFLAGS))
	$(eval BUILD_LDFLAGS += -X 'github.com/stashapp/stash/internal/build.buildstamp=$(BUILD_DATE)')
	$(eval BUILD_LDFLAGS += -X 'github.com/stashapp/stash/internal/build.githash=$(GITHASH)')
	$(eval BUILD_LDFLAGS += -X 'github.com/stashapp/stash/internal/build.version=$(STASH_VERSION)')
	$(eval BUILD_LDFLAGS += -X 'github.com/stashapp/stash/internal/build.officialBuild=$(OFFICIAL_BUILD)')
	$(eval BUILD_FLAGS := -v -tags "$(GO_BUILD_TAGS)" $(GO_BUILD_FLAGS) -ldflags "$(BUILD_LDFLAGS)")

.PHONY: touch-ui
touch-ui:
ifdef IS_WIN_SHELL
	@if not exist "build" mkdir build
	@type nul >> ./build/index.html
else
	@mkdir -p build
	@touch ./build/index.html
endif

# Regenerates GraphQL files
.PHONY: generate
generate: generate-ui

.PHONY: generate-ui
generate-ui:
	yarn run gqlgen

# installs UI dependencies. Run when first cloning repository, or if UI
# dependencies have changed
.PHONY: pre-ui
pre-ui:
	yarn install --frozen-lockfile

.PHONY: ui-env
ui-env: build-info
	$(eval export VITE_APP_DATE := $(BUILD_DATE))
	$(eval export VITE_APP_GITHASH := $(GITHASH))
	$(eval export VITE_APP_STASH_VERSION := $(STASH_VERSION))
ifdef STASH_NOLEGACY
	$(eval export VITE_APP_NOLEGACY := true)
endif
ifdef STASH_SOURCEMAPS
	$(eval export VITE_APP_SOURCEMAPS := true)
endif

.PHONY: ui
ui: ui-env
	cd ui/v2.5 && yarn build

.PHONY: zip-ui
zip-ui:
	rm -f dist/stash-ui.zip
	cd ui/v2.5/build && zip -r ../../../dist/stash-ui.zip .

.PHONY: ui-start
ui-start: ui-env
	cd ui/v2.5 && yarn start --host

.PHONY: fmt-ui
fmt-ui:
	cd ui/v2.5 && yarn format

# runs all of the frontend PR-acceptance steps
.PHONY: validate-ui
validate-ui:
	cd ui/v2.5 && yarn run validate

# these targets run the same steps as fmt-ui and validate-ui, but only on files that have changed
fmt-ui-quick:
	cd ui/v2.5 && yarn run prettier --write $$(git diff --name-only --relative --diff-filter d . ../../graphql)

# does not run tsc checks, as they are slow
validate-ui-quick:
	cd ui/v2.5 && \
	tsfiles=$$(git diff --name-only --relative --diff-filter d src | grep -e "\.tsx\?\$$"); \
	scssfiles=$$(git diff --name-only --relative --diff-filter d src | grep "\.scss"); \
	prettyfiles=$$(git diff --name-only --relative --diff-filter d . ../../graphql); \
	if [ -n "$$tsfiles" ]; then yarn run eslint $$tsfiles; fi && \
	if [ -n "$$scssfiles" ]; then yarn run stylelint $$scssfiles; fi && \
	if [ -n "$$prettyfiles" ]; then yarn run prettier --check $$prettyfiles; fi

# runs all of the tests and checks required for a PR to be accepted
.PHONY: validate
validate: validate-ui
