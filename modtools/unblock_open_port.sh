#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned Open Ports:" && sqlite3 config.db "select port from blocked_open_ports;" && exit 0

sqlite3 config.db "delete from blocked_open_ports where port = $1;"
echo "Unbanned Open Port: $1";
