const express = require('express');
const bodyParser = require('body-parser'); 
const app = express();
const mysql = require('mysql');

const port = 3000;


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Codecool',
    database: 'cinema_reservation'
  });
  
  
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err);
      return;
    }
    console.log('Connected to the database!');
  });
  
  app.use(express.static('public'));
  app.use(bodyParser.json());


  app.get('/seats', (req, res) => {
    const query = 'SELECT id, status FROM seats';
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching seat status:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.json(results);
    });
  });

  
  app.get('/seat/:id', (req, res) => {
    const seatId = req.params.id;
  
    
    const query = 'SELECT status FROM seats WHERE id = ?';
    connection.query(query, [seatId], (error, results) => {
      if (error) {
        console.error('Error fetching seat status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (results.length === 0) {         
          res.status(404).json({ error: 'Seat not found' });
        } else {
          const seatStatus = results[0].status;
          res.json({ status: seatStatus });
        }
      }
    });
  });
  
  app.post('/changeStatusToBusy', (req, res) => {
    const { seatId } = req.body;
    const querySelect = 'SELECT status FROM seats WHERE id = ? FOR UPDATE';
    const queryUpdate = 'UPDATE seats SET status = ? WHERE id = ?';
  
    connection.beginTransaction((beginErr) => {
      if (beginErr) {
        console.error('Error starting transaction:', beginErr);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      connection.query(querySelect, [seatId], (selectErr, selectResults) => {
        if (selectErr) {
          console.error('Error checking seat status:', selectErr);
          connection.rollback(() => {
            res.status(500).json({ error: 'Internal Server Error' });
          });
          return;
        }
  
        if (selectResults.length === 0) {
          connection.rollback(() => {
            res.status(404).json({ error: 'Seat not found' });
          });
          return;
        }
  
        const seatStatus = selectResults[0].status;
        if (seatStatus === 'free') {
          connection.query(queryUpdate, ['busy', seatId], (updateErr, updateResult) => {
            if (updateErr) {
              console.error('Error changing seat status to busy:', updateErr);
              connection.rollback(() => {
                res.status(500).json({ error: 'Internal Server Error' });
              });
              return;
            }
  
            connection.commit((commitErr) => {
              if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                connection.rollback(() => {
                  res.status(500).json({ error: 'Internal Server Error' });
                });
                return;
              }
  
              setTimeout(() => {
                connection.query(querySelect, [seatId], (checkStatusErr, checkStatusResult) => {
                  if (!checkStatusErr && checkStatusResult.length > 0 && checkStatusResult[0].status === 'busy') {
                    connection.query(queryUpdate, ['free', seatId], (releaseErr, releaseResult) => {
                      if (releaseErr) {
                        console.error('Error releasing seat:', releaseErr);
                      }
                    });
                  }
                });
              }, 2 * 60 * 1000);
  
              res.json({ message: 'Seat status changed to busy successfully!' });
            });
          });
        } else {
          connection.rollback(() => {
            res.status(403).json({ error: 'Seat is already reserved or sold' });
          });
        }
      });
    });
  });
  

  app.post('/reserve', (req, res) => {
    const { seatId, userEmail } = req.body;
    const querySelect = 'SELECT status FROM seats WHERE id = ? FOR UPDATE';
    const queryUpdate = 'UPDATE seats SET status = ?, email = ? WHERE id = ?';
  
    connection.beginTransaction((beginErr) => {
      if (beginErr) {
        console.error('Error starting transaction:', beginErr);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      connection.query(querySelect, [seatId], (selectErr, selectResults) => {
        if (selectErr) {
          console.error('Error checking seat status:', selectErr);
          connection.rollback(() => {
            res.status(500).json({ error: 'Internal Server Error' });
          });
          return;
        }
  
        if (selectResults.length === 0) {
          connection.rollback(() => {
            res.status(404).json({ error: 'Seat not found' });
          });
          return;
        }
  
        const seatStatus = selectResults[0].status;
        if (seatStatus !== 'reserved') {
          connection.query(queryUpdate, ['reserved', userEmail, seatId], (updateErr, updateResult) => {
            if (updateErr) {
              console.error('Error reserving seat:', updateErr);
              connection.rollback(() => {
                res.status(500).json({ error: 'Internal Server Error' });
              });
              return;
            }
  
            connection.commit((commitErr) => {
              if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                connection.rollback(() => {
                  res.status(500).json({ error: 'Internal Server Error' });
                });
                return;
              }
  
              res.json({ message: 'Seat reservation successful!' });
            });
          });
        } else {
          connection.rollback(() => {
            res.status(403).json({ error: 'Seat is already reserved or sold' });
          });
        }
      });
    });
  });
  

function initializeDatabase() {
    const query = 'UPDATE seats SET status = ?, email = ? WHERE id = ?';
  
    connection.query(query, ['free', null, 1], (err, result) => {
      if (err) {
        console.error('Error resetting seat 1:', err);
      }
    });
  
    connection.query(query, ['free', null, 2], (err, result) => {
      if (err) {
        console.error('Error resetting seat 2:', err);
      }
    });
  }
  

  initializeDatabase();
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  