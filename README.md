# LookBook API

RESTful JSON API for LookBook, a second-hand clothing marketplace. Built with Node.js, Express.js and MySQL.

## Features

- Create, read, update and delete users (first name, last name, email)
- Create, read, update and delete products (name and photos)
- Create, read, update and delete swap orders (products and users involved)
- Filter swap orders by creation date and by product

## Requirements

- Node.js
- MySQL (for example through XAMPP)

## Setup

1. Install the dependencies:

```
npm install
```

2. Start MySQL and import the database structure from `migrations.sql` (for example with phpMyAdmin).

3. Create a file named `.env` in the project root. Copy the content of `.env.example` and set your database settings:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=lookbook
```

4. Create an empty folder named `uploads` in the project root. Product photos are saved there.

5. Start the server:

```
node index.js
```

The API is available at `http://localhost:3000`.

## Project structure

```
index.js          Express app and server start
db.js             MySQL connection pool (settings read from .env)
routes/           Route declarations only
controllers/      Request handling and business logic
migrations.sql    Database structure
```

## Endpoints

### Users

| Method | Endpoint     | Description       |
| ------ | ------------ | ----------------- |
| GET    | /users       | List all users    |
| GET    | /users/:id   | Get one user      |
| POST   | /users       | Create a user     |
| PUT    | /users/:id   | Update a user     |
| DELETE | /users/:id   | Delete a user     |

Body (JSON): `first_name`, `last_name`, `email`

### Products

| Method | Endpoint        | Description          |
| ------ | --------------- | -------------------- |
| GET    | /products       | List all products    |
| GET    | /products/:id   | Get one product      |
| POST   | /products       | Create a product     |
| PUT    | /products/:id   | Update a product     |
| DELETE | /products/:id   | Delete a product     |

Body (form-data): `name`, `user_id` (only on create), `photos` (one or more image files)

### Swap orders

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| GET    | /swap-orders       | List all swap orders    |
| GET    | /swap-orders/:id   | Get one swap order      |
| POST   | /swap-orders       | Create a swap order     |
| PUT    | /swap-orders/:id   | Update a swap order     |
| DELETE | /swap-orders/:id   | Delete a swap order     |

Body (JSON): `product_ids` (array), `user_ids` (array)

Filters on the list endpoint:

- `/swap-orders?date=YYYY-MM-DD` shows the orders created on that date
- `/swap-orders?product_id=1` shows the orders that contain that product

## Security and reliability

- All database queries use prepared statements to prevent SQL injection.
- Database credentials are read from environment variables, not written in the code.
- Creating or updating products and swap orders uses transactions, so data is never saved halfway.
- Lists are loaded with a fixed number of queries, avoiding the N+1 problem.