#!/usr/bin/env sh

sqlite3 config.db "insert into config values ('read_only', 'yes');"
echo "Anyone could not post from web now."
