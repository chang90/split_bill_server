const express = require("express");
const cors = require('cors')
const ejs = require('ejs')
const url = require('url')
const paypal = require('paypal-rest-sdk')
const session = require('express-session');
const cookieParser = require('cookie-parser');
const SessionStore = require('connect-pg-simple')(session);

const PORT = process.env.PORT || 3000

const app = express();
const client_id = process.env.PAYPAL_CLIENT_ID
const client_secret = process.env.PAYPAL_CLIENT_SECRET
const pgp = require('pg-promise')();

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({     // to support URL-encoded bodies
 extended: true
})); // to support URL-encoded bodies



// const showUser = function(){
const cn ={
  url:'http://localhost:5432',
  database: 'splitbill',
  username: 'darkend',
  password: 'hiby90hou'
}

const db = pgp(process.env.DATABASE_URL || cn);


// configure sessions
app.use(cookieParser());
app.use(session({
  name: 'session name',
  secret: 'any secret will do',
  store: new SessionStore({
    conObject: cn,
  }),
  proxy: true,
  resave: false,
  saveUninitialized: true,
}));



paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': client_id,
  'client_secret': client_secret
});

app.use(cors())

app.set('views', './views')
app.set('view engine','ejs')

app.use(express.static(__dirname + '/public'));



app.get('/', (req, res) =>
  {
    const par = url.parse(req.url, true).query;
    console.log(par)
    const name = par.name || "default"
    const price = par.price || 0
    const quantity = par.quantity || 0
    const order_id = par.order_id || 0

    res.render('index', {
    name: name,
    price: price,
    quantity: quantity,
    order_id: order_id
    })
  }
)

app.get('/session', (req, res) => {
  res.send({
    session: req.session || null,
  });
});

app.get('/setmyname', (req, res) => {
  req.session.myName = 'mark';
  res.send({success: true});
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.send({ destroyed: true });
  });
})



app.post('/pay', (req, res) => {
  console.log(req.body)
  const name = req.body.name
  const order_id = req.body.order_id
  const price =  parseFloat(req.body.price)
  const quantity =  parseFloat(req.body.quantity)
  const total = (1.0 * price * quantity).toFixed(2)

  console.log("name:")
  // console.log(req.body)
  console.log(total)

	var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:3000/success/?total="+total+"&order_id="+order_id,
        "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
      "item_list": {
          "items": [{
              "name": name,
              "sku": "001",
              "price": price,
              "currency": "AUD",
              "quantity": quantity
          }]
      },
      "amount": {
          "currency": "AUD",
          "total": total
      },
      "description": "This is the payment description."
    }]
	};

	paypal.payment.create(create_payment_json, function (error, payment) {
	  if (error) {
	    throw error;
	  } else {
	    console.log("Create Payment Response");
	    // console.log(payment);
	    // res.send('test');
	    for(let i = 0; i < payment.links.length; i++){
	    	if(payment.links[i].rel === 'approval_url'){
	    		res.redirect(payment.links[i].href);
	    	}
	    }
	  }
	});
})

app.get('/success', (req,res) => {
	const payerId = req.query.PayerID
	const paymentId = req.query.paymentId
  const total = req.query.total
  const order_id = req.query.order_id

	const execute_payment_json = {
    "payer_id" : payerId,
    "transactions": [{
    	"amount":{
    		"currency": "AUD",
    		"total": total
    	}
    }]
  };

	paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      // res.redirect('error').end();
      res.send('Payment Error');
    } else {
      console.log("Get Payment Response");
      // console.log(payment.payer);
      const payerEmail = payment.payer.payer_info.email
      // if payment state is approved
      //   update the DB

      db.one("INSERT INTO sharer(order_id,email) VALUES($1, $2) RETURNING id;", [order_id,payerEmail])
        .then((data) => {
          // success;
          // const id = ""+(data.id);
          // res.json(data)
          res.render('success');
        })
        .catch(error => {
          // error;
          res.send('error:'+ error)
        });

      // res.send('Payment Success - Thank you');
      // res.render('success');
    }
  });

})

app.get('/cancel', (req, res) => res.send('Cancelled'))

// check who paid in this order
app.get('/api/check',(req, res) =>{
  const order_id = req.query.order_id
  // db.any(`SELECT * FROM orders WHERE id=1`)
  db.any(`SELECT (sharer.email) FROM orders INNER JOIN sharer
  ON sharer.order_id = orders.id
  WHERE orders.id=$1`,[order_id])
  .then(info =>{
  // console.log(info.map(elem => elem.email))
  res.send(info.map(elem => elem.email))
    });
  })

// app.get('/api/add',(req, res) =>{
//   db.one("INSERT INTO sharer(order_id,email) VALUES(1, 'test2@test.co') RETURNING order_id;")
//     .then((data) => {
//       // success;
//       console.log(data);
//       res.send(data)
//     })
//     .catch(error => {
//       // error;
//       res.send('error'+ error)
//     });
//   })

app.post('/api/new_bill',(req, res) =>{
  console.log(req.body)
  const email = req.body.email
  const restaurant = req.body.restaurant
  const people_num = req.body.people_num
  const total_price = req.body.total_price

  db.one("INSERT INTO orders(email,restaurant,people_num,total_price) VALUES($1, $2, $3, $4) RETURNING id;", [email,restaurant,people_num,total_price])
    .then((data) => {
      // success;
      // const id = ""+(data.id);
      // res.send(id)
      res.json(data)
    })
    .catch(error => {
      // error;
      res.send('error:'+ error)
    });
})

app.post('/api/new_payment',(req, res) =>{
  console.log(req.body)
  const order_id = req.body.order_id
  const email = req.body.email

  db.one("INSERT INTO sharer(order_id,email) VALUES($1, $2) RETURNING id;", [order_id,email])
    .then((data) => {
      // success;
      // const id = ""+(data.id);
      // res.send(id)
      res.json(data)
    })
    .catch(error => {
      // error;
      res.send('error:'+ error)
    });
})

app.listen(PORT, () => console.log('Server started'))
