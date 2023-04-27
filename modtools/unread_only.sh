#!/usr/bin/env sh

sqlite3 config.db "delete from config where name = 'read_only';"
echo "Anyone could post from web now."
