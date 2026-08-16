import express from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import optionalAuthorisation from '../middleware/optionalAuthorisation.js';
import authorisation from '../middleware/authorisation.js';

const JWT_SECRET = process.env.JWT_SECRET;
const router = express.Router();

router.post('/login', async (req, res, next) => {
  // 1. Retrieve email and password from req.body
  const { email, password } = req.body ?? {};

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  // 2. Determine if user already exists in table
  req.db.from("users").select("*").where("email", "=", email)
  .then(users => {
    if (users.length === 0) {
      res.status(401).json({ error: true, message: "Incorrect email or password" });
      return;
    }
    // 2.1 If user does exist, verify if passwords match
    const { hash } = users[0];
    return argon2.verify(hash, password).then(match => ({ match, userId: users[0].id, email: users[0].email}));
  })
  .then(result => {
    if (!result) {
      return;
    }
    if (result.match) {
      // 2.1.1 If passwords match, return JWT
      const expiresIn = 60 * 60 * 24;
      const userId = result.userId;
      const email = result.email;
      const payload = {userId: userId, email: email};
      const secret = JWT_SECRET;

      const token = jwt.sign(payload, secret, {expiresIn: expiresIn});
      res.json({
        token,
        userId,
        email,
        tokenType: "Bearer",
        expiresIn
      });
    } else {
      // 2.1.2 If passwords do not match, return error response
      res.status(401).json({ error: true, message: "Incorrect email or password" });
    }
  })
});

router.post('/register', (req, res, next) => {
  // 1. Retrieve email and password from req.body
  const { email, password } = req.body ?? {};

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  // 2. Determine if user already exists in table
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers.then(users => {
    if (users.length > 0) {
      // 2.1 If user does exist, return error response
      throw new Error("User already exists");
    } else {
      // 2.2 If user does not exist, insert into table
      return argon2.hash(password);
    }
  })
  .then(hash => {
    return req.db.from("users").insert({ email, hash });
  })
  .then(() => {
    res.status(201).json({ message: "User created" });
  })
  .catch(e => {
    res.status(500).json({ error: true, message:"Error in MySQL query" });
  });
});

router.post('/debugLogin', async (req, res, next) => {
  // 1. Retrieve email and password from req.body
  const { email, password } = req.body ?? {};

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  // 2. Determine if user already exists in table
  req.db.from("users").select("*").where("email", "=", email)
  .then(users => {
    if (users.length === 0) {
      throw new Error("Incorrect email or password");
    }
    // 2.1 If user does exist, verify if passwords match
    const { hash } = users[0];
    return argon2.verify(hash, password).then(match => ({ match, userId: users[0].id, email: users[0].email}));
  })
  .then(result => {
    if (result.match) {
      // 2.1.1 If passwords match, return JWT
      const expiresIn = 1
      const exp = Math.floor(Date.now() / 1000) + expiresIn;
      const userId = result.userId;
      const email = result.email;
      const payload = {userId: userId, email: email};
      const secret = JWT_SECRET;

      const token = jwt.sign(payload, secret, {expiresIn: expiresIn});
      res.json({
        token,
        userId,
        email,
        tokenType: "Bearer",
        expiresIn
      });
    } else {
      // 2.1.2 If passwords do not match, return error response
      throw new Error("Incorrect email or password");
    }
  })
  .catch(e => {
    res.status(500).json({ error: true, message: e.message });
  });
});


router.get("/:email/profile", optionalAuthorisation, async (req, res, next) => {
  // User not logged in
  if (!req.user){
    req.db
    .from("users")
    .select("email", "firstName", "lastName")
    .where("email", "=", req.params.email)
    .first()
    .then((rows) => {
      if (!rows){
        res.status(404).json({
          error: true,
          message: "User not found"
        })
        return;
      }
      res.json(rows);
    })
    .catch((err) => {
      res.status(500).json({ error: true, message: "Error in MySQL query" });
    });
  }
  else{
    // User requesting their own profile
    if (req.user.email === req.params.email){
      req.db
        .from("users")
        .select("email", "firstName", "lastName", "dob", "address")
        .where("email", "=", req.params.email)
        .first()
        .then((rows) => {
          if (!rows){
            res.status(404).json({
              error: true,
              message: "User not found"
            });
            return
          }
          res.json(rows);
        })
        .catch((err) => {
          res.status(500).json({ error: true, message: "Error in MySQL query" });
        });
    }
    // User requesting another persons profile
    else{
      req.db
      .from("users")
      .select("email", "firstName", "lastName")
      .where("email", "=", req.params.email)
      .first()
      .then((rows) => {
        if (!rows){
          res.status(404).json({
            error: true,
            message: "User not found"
          });
          return
        }
        res.json(rows);
      })
      .catch((err) => {
        res.status(500).json({ error: true, message: "Error in MySQL query" });
      });
    }
  }

});

router.put("/:email/profile", authorisation, async (req, res, next) => {
  //Retrieve email and password from req.body
  const { firstName, lastName, dob, address } = req.body ?? {};

  // Verify body
  if (!firstName || !lastName || !dob || !address) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete: firstName, lastName, dob and address are required."
    });
    return;
  }
  else if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof dob !== 'string' || typeof address !== 'string') {
    res.status(400).json({
      error: true,
      message: "Request body invalid: firstName, lastName and address must be strings only."
    });
    return;
  }
  else if (!isValidDate(dob)) {
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a real date in format YYYY-MM-DD."
    });
    return;
  }
  else if (!dateInPast(dob)){
    res.status(400).json({
      error: true,
      message: "Invalid input: dob must be a date in the past."
    });
    return;
  }

  // Check correct email
  if (req.user.email != req.params.email){
    res.status(403).json({
      error: true,
      message: "Forbidden"
    });
    return;
  }

 // Determine if user already exists in table
  req.db.from("users").select("*").where("email", "=", req.params.email).first()
  .then(user => {
    if (!user){
      res.status(404).json({
        error: true,
        message: "User not found"
      });
    }
    else{
      const update = { firstName: firstName, lastName: lastName, dob: dob, address: address }
      req.db('users').where("email", "=", req.params.email).update(update)
      .then(() => res.status(200).json({email: req.params.email, firstName: firstName, lastName: lastName, dob: dob, address: address }))
      .catch(error => {
        res.status(500).json({ message: `Error in MySQL query` });
      })
    }
  })
  .catch((err) => {
    res.status(500).json({ error: true, message: "Error in MySQL query" });
  });
});

function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if(!dateString.match(regEx)) return false;  // Invalid format
  var d = new Date(dateString);
  var dNum = d.getTime();
  if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0,10) === dateString;
}

function dateInPast(dateString) {
  const todayString = new Date().toISOString().split('T')[0];
    return dateString < todayString;
}

export default router;