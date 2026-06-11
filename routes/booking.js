const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedin } = require("../middleware.js");
const bookingController = require('../controller/booking.js');

// Create a booking
router.post('/listings/:id/book', isLoggedin, wrapAsync(bookingController.createBooking));

// Show current user's all bookings
router.get('/bookings/my', isLoggedin, wrapAsync(bookingController.showMyBookings));

// Cancel a booking
router.delete('/bookings/:bookingId', isLoggedin, wrapAsync(bookingController.cancelBooking));

module.exports = router;
