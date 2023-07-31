const connection = require('../dbConfig');


function initializeDatabase() {
  const query = 'UPDATE seats SET status = ?, email = ? WHERE id = ?';

  connection.query(query, ['szabad', null, 1], (err, result) => {
    if (err) {
      console.error('Error resetting seat 1:', err);
    }
  });

  connection.query(query, ['szabad', null, 2], (err, result) => {
    if (err) {
      console.error('Error resetting seat 2:', err);
    }
  });
}

module.exports = { initializeDatabase };
