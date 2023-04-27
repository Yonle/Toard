#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned IPs:" && sqlite3 config.db "select ip from ip_block;" && exit 0

sqlite3 config.db "insert into ip_block values ('$1');"
echo "Banned IP: $1";
