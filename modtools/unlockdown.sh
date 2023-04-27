#!/usr/bin/env sh

sqlite3 config.db "delete from config where name = 'lockdown';"
echo "Unlocked Down."
