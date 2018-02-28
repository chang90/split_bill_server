const express = require("express");
const cors = require('cors')
const ejs = require('ejs')
const url = require('url')
const paypal = require('paypal-rest-sdk')
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


// }

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

    res.render('index', {
    name: name,
    price: price,
    quantity: quantity
    })
  }
)

app.post('/pay', (req, res) => {
  console.log(req.body)
  const name = req.body.name
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
        "return_url": "https://serene-shore-75692.herokuapp.com/success/?total="+total,
        "cancel_url": "https://serene-shore-75692.herokuapp.com/cancel"
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
      const userEmail = payment.payer.payer_info.email

      console.log("userEmail:" + userEmail)
      // if payment state is approved
      //   update the payment DB
      //   res.render('payment-thankyou');
      // otherwise
      //   res.redirect('error').end();
       
      // res.send('Payment Success - Thank you');
      res.render('success');
    }
  });

})

app.get('/cancel', (req, res) => res.send('Cancelled'))

app.get('/api/check',(req, res) =>{
  // db.any(`SELECT * FROM orders WHERE id=1`)
  db.any(`SELECT (sharer.email) FROM orders INNER JOIN sharer 
  ON sharer.order_id = orders.id
  WHERE orders.id=1`)
  .then(info =>{
  console.log(info.map(elem => elem.email))
  res.send(info.map(elem => elem.email))
    });
  })

app.get('/api/add',(req, res) =>{
  db.one("INSERT INTO sharer(order_id,email) VALUES(1, 'test2@test.co') RETURNING order_id;")
    .then((data) => {
      // success;
      console.log(data);
      res.send(data)
    })
    .catch(error => {
      // error;
      res.send('error'+ error)
    });
  })

app.post('/api/new_bill',(req, res) =>{
  console.log(req.body)
  const email = req.body.email
  const restaurant = req.body.restaurant
  const people_num = req.body.people_num
  const total_price = req.body.total_price

  db.one("INSERT INTO orders(email,restaurant,people_num,total_price) VALUES($1, $2, $3, $4) RETURNING id;", [email,restaurant,people_num,total_price])
    .then((data) => {
      // success;
      const id = ""+(data.id);
      res.send(id)
    })
    .catch(error => {
      // error;
      res.send('error:'+ error)
    });
  })

app.listen(PORT, () => console.log('Server started'))