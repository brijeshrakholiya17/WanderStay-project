const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js");

module.exports.createBooking = async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut } = req.body;

    if (!checkIn || !checkOut) {
        throw new ExpressError(400, "Check-in and Check-out dates are required");
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (start >= end) {
        throw new ExpressError(400, "Check-out date must be after Check-in date");
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    // Do NOT allow the listing owner to book their own listing
    if (listing.owner.equals(req.user._id)) {
        req.flash("error", "You cannot book your own listing");
        return res.redirect(`/listings/${id}`);
    }

    // Check for date overlap conflicts
    // Find any existing confirmed booking for the same listing where:
    // (existingCheckIn < newCheckOut) AND (existingCheckOut > newCheckIn)
    const conflict = await Booking.findOne({
        listing: id,
        status: "confirmed",
        checkIn: { $lt: end },
        checkOut: { $gt: start }
    });

    if (conflict) {
        req.flash("error", "These dates are already booked");
        return res.redirect(`/listings/${id}`);
    }

    // Create booking
    const newBooking = new Booking({
        listing: id,
        guest: req.user._id,
        checkIn: start,
        checkOut: end,
        status: "confirmed"
    });

    await newBooking.save();

    req.flash("success", "Booking confirmed successfully!");
    res.redirect("/bookings/my");
};

module.exports.showMyBookings = async (req, res) => {
    // Find all bookings by current user and populate listing details
    const bookings = await Booking.find({ guest: req.user._id })
        .populate("listing")
        .sort({ checkIn: 1 });

    res.render("bookings/my-bookings.ejs", { bookings });
};

module.exports.cancelBooking = async (req, res) => {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        return res.status(404).json({ status: "error", message: "Booking not found" });
    }

    // Check if the current user is the guest who made the booking
    if (!booking.guest.equals(req.user._id)) {
        return res.status(403).json({ status: "error", message: "Unauthorized to cancel this booking" });
    }

    // Delete the booking record to free up calendar dates
    await Booking.findByIdAndDelete(bookingId);

    return res.json({ status: "success", message: "Booking cancelled successfully" });
};
