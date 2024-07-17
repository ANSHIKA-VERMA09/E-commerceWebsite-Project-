const express = require('express');
const Cloudant = require('@cloudant/cloudant');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const PORT = process.env.PORT || 9090;
const url = "https://apikey-v2-20tsdkw0013c1r990dhqo084h8rfnqdk1tkovph37qrg:d55d39dd473a3fa864e6fb2ad2e93aee@ea4dd056-7f3a-49a0-a44e-3fde87948015-bluemix.cloudantnosqldb.appdomain.cloud"
const username = "apikey-v2-20tsdkw0013c1r990dhqo084h8rfnqdk1tkovph37qrg"
; // Cloudant username from environment variables
const password = "d55d39dd473a3fa864e6fb2ad2e93aee"; // Cloudant password from environment variables
const dbName = 'product-database'; // Database for user accounts

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index2.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index2.html'));
});
app.get('/Product.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'Product.html'));
});

// Initialize Cloudant
const cloudant = Cloudant({ url, username, password });

// Insert product into the database
app.post('/insert', (req, res) => {
  const { name, image, cost, database } = req.body;

  const data = { name, image, cost };

  cloudant.use(database).insert(data, (err, data) => {
    if (err) {
      console.error('Error inserting data: ', err);
      return res.status(500).send(err);
    } else {
      res.send(data);
    }
  });
});

// Retrieve products from the database
app.get('/getProducts', (req, res) => {
  const database = req.query.database; // Expect database name to be sent as a query parameter

  cloudant.use(database).list({ include_docs: true }, (err, body) => {
    if (err) {
      console.error('Error retrieving products: ', err);
      return res.status(500).send(err);
    } else {
      const products = body.rows.map(row => row.doc);
      res.send(products);
    }
  });
});

// Sign Up
app.post('/signup', async (req, res) => {
  const { username, fname, lname, email, password } = req.body;

  if (!username || !fname || !lname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user data object
    const userData = {
      username,
      fname,
      lname,
      email,
      password: hashedPassword
    };

 // Insert user data into Cloudant
 cloudant.use(dbName).insert(userData, (err, data) => {
  if (err) {
    console.error('Error inserting user data: ', err);
    return res.status(500).json({ error: 'User registration failed' });
  }
  // Redirect to index.html
  res.redirect('/');
});
} catch (error) {
console.error('Error in user registration: ', error);
res.status(500).json({ error: 'User registration failed' });
}
});
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await cloudant.use(dbName).find({ selector: { email } });
    if (user.docs.length > 0) {
      const isMatch = await bcrypt.compare(password, user.docs[0].password);
      if (isMatch) {
        // Redirect to index.html
        res.redirect('/');
        return;
      }
    }
    res.status(401).json({ error: 'Invalid email or password' });
  } catch (error) {
    console.error('Error during login: ', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
