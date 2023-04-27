#!/usr/bin/env bash

[ -z "$1" ] && echo "Whitelisted IPs:" && sqlite3 config.db "select ip from ip_white;" && exit 0

sqlite3 config.db "insert into ip_white values ('$1');"
echo "Whitelisted IP: $1";
