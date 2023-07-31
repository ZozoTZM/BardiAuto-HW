const express = require('express');
const router = express.Router();
const connection = require('../dbConfig');


router.get('/seats', (req, res) => {
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

router.get('/seat/:id', (req, res) => {
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

router.post('/changeStatusToBusy', (req, res) => {
    const { selectedSeats } = req.body;
    const querySelect = 'SELECT status FROM seats WHERE id = ? FOR UPDATE';
    const queryUpdate = 'UPDATE seats SET status = ? WHERE id = ?';

    connection.beginTransaction((beginErr) => {
        if (beginErr) {
            console.error('Error starting transaction:', beginErr);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const seatsToUpdate = [];

        for (const seatId of selectedSeats) {
            seatsToUpdate.push(new Promise((resolve, reject) => {
                connection.query(querySelect, [seatId], (selectErr, selectResults) => {
                    if (selectErr) {
                        console.error('Error checking seat status:', selectErr);
                        reject(selectErr);
                        return;
                    }

                    if (selectResults.length === 0) {
                        reject(new Error(`Seat ${seatId} not found`));
                        return;
                    }

                    const seatStatus = selectResults[0].status;
                    if (seatStatus !== 'elkelt') {
                        connection.query(queryUpdate, ['foglalt', seatId], (updateErr, updateResult) => {
                            if (updateErr) {
                                console.error(`Error changing seat ${seatId} status to foglalt:`, updateErr);
                                reject(updateErr);
                                return;
                            }

                            resolve(`Seat ${seatId} status changed to foglalt successfully!`);
                        });
                    } else {
                        reject(new Error(`Seat ${seatId} is already reserved`));
                    }
                });
            }));
        }

        Promise.all(seatsToUpdate)
            .then((results) => {
                connection.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Error committing transaction:', commitErr);
                        connection.rollback(() => {
                            res.status(500).json({ error: 'Internal Server Error' });
                        });
                        return;
                    }

                    // Timer
                    for (const seatId of selectedSeats) {
                        setTimeout(() => {
                            connection.query(querySelect, [seatId], (checkStatusErr, checkStatusResult) => {
                                if (!checkStatusErr && checkStatusResult.length > 0 && checkStatusResult[0].status === 'foglalt') {
                                    connection.query(queryUpdate, ['szabad', null, seatId], (releaseErr, releaseResult) => {
                                        if (releaseErr) {
                                            console.error('Error releasing seat:', releaseErr);
                                        }
                                    });
                                }
                            });
                        }, 2 * 60 * 1000);
                    }

                    res.json({ message: 'Seats status changed to foglalt successfully!', selectedSeats: Array.from(selectedSeats) });
                });
            })
            .catch((error) => {
                connection.rollback(() => {
                    res.status(500).json({ error: 'Internal Server Error' });
                });
            });
    });
});

router.post('/reserve', (req, res) => {
    const { selectedSeats, userEmail } = req.body;
    const querySelect = 'SELECT status FROM seats WHERE id = ? FOR UPDATE';
    const queryUpdate = 'UPDATE seats SET status = ?, email = ? WHERE id = ?';

    connection.beginTransaction((beginErr) => {
        if (beginErr) {
            console.error('Error starting transaction:', beginErr);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        const seatsToUpdate = [];

        for (const seatId of selectedSeats) {
            seatsToUpdate.push(new Promise((resolve, reject) => {
                connection.query(querySelect, [seatId], (selectErr, selectResults) => {
                    if (selectErr) {
                        console.error('Error checking seat status:', selectErr);
                        reject(selectErr);
                        return;
                    }

                    const seatStatus = selectResults[0].status;
                    if (seatStatus === 'elkelt') {
                        reject(new Error(`Seat ${seatId} is already elkelt`));
                        return;
                    }

                    connection.query(queryUpdate, ['elkelt', userEmail, seatId], (updateErr, updateResult) => {
                        if (updateErr) {
                            console.error('Error reserving seat:', updateErr);
                            reject(updateErr);
                            return;
                        }

                        resolve(`Seat ${seatId} reserved successfully!`);
                    });
                });
            }));
        }

        Promise.all(seatsToUpdate)
            .then((results) => {
                connection.commit((commitErr) => {
                    if (commitErr) {
                        console.error('Error committing transaction:', commitErr);
                        connection.rollback(() => {
                            res.status(500).json({ error: 'Internal Server Error' });
                        });
                        return;
                    }
                    res.json({ message: 'Seats reserved successfully!', reservedSeats: Array.from(selectedSeats) });
                });
            })
            .catch((error) => {
                connection.rollback(() => {
                    res.status(500).json({ error: 'Error reserving seats. Please try again.' });
                });
            });
    });
});

module.exports = router;
