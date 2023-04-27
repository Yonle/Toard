#!/usr/bin/env bash

[ -z "$1" ] && echo "Whitelisted IPs:" && sqlite3 config.db "select ip from ip_white;" && exit 0

sqlite3 config.db "delete from ip_white where ip = '$1';"
echo "Unwhitelisted IP: $1";
