#!/usr/bin/env bash

[ -z "$1" ] && echo "Banned ISPs:" && sqlite3 config.db "select name from isp_block;" && exit 0

sqlite3 config.db "delete from isp_block where name = '$1';"
echo "Unbanned ISP: $1";
