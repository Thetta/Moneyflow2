#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the testrpc-sc instance that we started (if we started one).
  if [ -n "$testrpcsc_pid" ]; then
    kill -9 $testrpcsc_pid
  fi
}

testrpcsc_running() {
  nc -z localhost 8570
}

if ganachecli_running; then
  echo "Using existing ganache-cli instance"
else
  echo "Starting ganache-cli"
  ./node_modules/ganache-cli/build/cli.node.js --gasLimit 0xfffffffffff --port 8555 --defaultBalanceEther 200\
  > /dev/null &
  ganachecli_pid=$!
fi

SOLIDITY_COVERAGE=true ./node_modules/.bin/solidity-coverage
