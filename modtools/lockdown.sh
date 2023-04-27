#!/usr/bin/env sh

sqlite3 config.db "insert into config values ('lockdown', 'yes');"
echo "Locked Down."
