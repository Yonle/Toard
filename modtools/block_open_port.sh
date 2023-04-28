#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned Open Ports:" && sqlite3 config.db "select port from blocked_open_ports;" && exit 0

sqlite3 config.db "insert into blocked_open_ports values ($1);"
echo "Banned Open Port: $1";
