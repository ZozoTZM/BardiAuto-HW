const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Codecool',
  database: 'cinema_reservation'
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

module.exports = { initializeDatabase };
