#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned ISPs:" && sqlite3 config.db "select name from isp_block;" && exit 0

sqlite3 config.db "insert into isp_block values ('$1');"
echo "Banned ISP: $1";
