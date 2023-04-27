#!/usr/bin/env bash

[ -z "$1" ] && echo "Locked Threads:" && sqlite3 config.db "select id from locked_thread;" && exit 0

sqlite3 config.db "insert into locked_thread values ('$1');"
echo "Locked $1";
