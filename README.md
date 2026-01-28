1. Instalar Laragon (https://laragon.org/)
2. Descargar pgsql (https://www.enterprisedb.com/download-postgresql-binaries) 
3. Acceder a User/laragon/bin y crear la carperta postgresql. Dentro descomprimir el zip y dejar el directorio pgsql
4. Habilitar el postgres en Laragon y la extension pgsql y pdosql. Menu > PHP > Extensions
5. Creamos la base de datos en Laragon. Usuario: postgres - Contraseña: postgres - Puerto: 5432
6. En el directorio del proyecto, copiamos el directorio .env.example y lo renombramos a .env. Modificamos los valores de DB para que coincidan con nuestra base de datos.

  - DB_CONNECTION=pgsql
  - DB_HOST=127.0.0.1
  - DB_PORT=5432
  - DB_DATABASE=postgres
  - DB_USERNAME=postgres
  - DB_PASSWORD=postgres

Instalamos las dependencias y paquetes

- composer install
- npm install

Generamos la key

- php artisan key:generate

Arrancamos la app

- php artisan serve
- npm run dev

Inyectamos los datos del seeder en la base de datos

- php artisan migrate:fresh --seed

La ruta de la vista es localhost:8000/palletizer
