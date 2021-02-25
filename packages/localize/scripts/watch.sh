#!/usr/bin/env bash

# Copyright 2020 Google LLC
# SPDX-License-Identifier: BSD-3-Clause

set -e

# Kill all subprocesses when this script exits
trap "kill 0" EXIT

npm run clean
npx tsc --watch --noEmitOnError &
npx tsc --watch --noEmitOnError --project tsconfig.client.json &
npx chokidar "src/**/*.ts" .eslintrc.json -c "npm run lint" &
npx chokidar "src/config.ts" -c "npm run generate-json-schema" &

# Use chokidar instead of `ava --watch`, because even though
# https://github.com/avajs/ava/issues/2040 is marked fixed, it seems to still be
# occuring. `ava --watch` also wants to watch every file in the repo except for
# those we opt-out, whereas opt-in is a little easier to manage.
npx chokidar \
  "lib/**/*.js" \
  "config.schema.json" \
  "testdata/*/input/**/*" \
  "testdata/*/goldens/" \
  "ava.config.js" \
  -c "ava; npm run test:check-tsc; npm run test:check-eslint" &

wait
