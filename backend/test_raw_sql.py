from raw_database import get_connection


connection = get_connection()
cursor = connection.cursor()

cursor.execute("SELECT DATABASE()")

result = cursor.fetchone()

print(result)

cursor.close()
connection.close()