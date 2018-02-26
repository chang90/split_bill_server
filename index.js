const express = require("express");
const cors = require('cors')
const ejs = require('ejs')
const paypal = require('paypal-rest-sdk')


const app = express();
const client_id = process.env.PAYPAL_CLIENT_ID
const client_secret = process.env.PAYPAL_CLIENT_SECRET
// console.log(client_id)
// console.log(client_secret)

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': client_id,
  'client_secret': client_secret
});

app.use(cors())

app.set('view engine','ejs')

app.get('/', (req, res) => res.render('index'))

app.post('/pay', (req, res) => {
	var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:3000/success",
        "cancel_url": "http://localhost:3000/cancel"
    },
    "transactions": [{
      "item_list": {
          "items": [{
              "name": "AAA",
              "sku": "001",
              "price": "10.00",
              "currency": "AUD",
              "quantity": 1
          }]
      },
      "amount": {
          "currency": "AUD",
          "total": "10.00"
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

	const execute_payment_json = {
    "payer_id" : payerId,
    "transactions": [{
    	"amount":{
    		"currency": "AUD",
    		"total": "10.00"
    	}
    }]
  };

	paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      res.redirect('error').end();
    } else {
      // console.log("Get Payment Response");
      console.log(JSON.stringify(payment));
      // if payment state is approved
      //   update the payment DB
      //   res.render('payment-thankyou');
      // otherwise
      //   res.redirect('error').end();
       
      res.send('Success').end();
    }
  });

})

app.get('/cancel', (req, res) => res.send('Cancelled'))

app.listen(3000, () => console.log('Server started'))