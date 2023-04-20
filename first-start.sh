
[ -f db.json ] && node migrate-old-db.js && rm db.json && exit
! [ -f database.db ] && sqlite3 -init first-start.sql database.db .quit
