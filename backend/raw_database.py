import pymysql


DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "nexa_bank",
    "cursorclass": pymysql.cursors.DictCursor
}


def get_connection():
    return pymysql.connect(**DB_CONFIG)