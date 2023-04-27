#!/usr/bin/env bash

[ -z "$1" ] && echo "Usage: ./modtools/nuke.sh [threadid]" && exit 0;

echo "Remove: $1"

sqlite3 database.db "drop table '$1';"
rm -rf __pages/$1
