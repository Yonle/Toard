#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned IPs:" && sqlite3 config.db "select ip from ip_block;" && exit 0

sqlite3 config.db "delete from ip_block where ip = '$1';"
echo "Unbanned IP: $1";
