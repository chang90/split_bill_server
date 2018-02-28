DROP DATABASE IF EXISTS splitbill;
CREATE DATABASE splitbill;

\c splitbill;

CREATE TABLE orders (
  ID SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  restaurant VARCHAR NOT NULL,
  people_num INTEGER NOT NULL,
  total_price NUMERIC NOT NULL,
  is_paid Boolean DEFAULT FALSE
);

CREATE TABLE sharer (
  ID SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  email VARCHAR NOT NULL,
  is_paid Boolean DEFAULT FALSE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
   ON DELETE CASCADE
);

INSERT INTO orders (email, restaurant, people_num, total_price)
  VALUES ('test@gmail.com', 'ABC', 3, 30.3);

INSERT INTO sharer (order_id, email, is_paid)
VALUES (1, 'test@gmail.com', false);