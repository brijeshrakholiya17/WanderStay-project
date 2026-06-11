const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
    },
    guest: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    totalPrice: {
        type: Number
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to auto-calculate totalPrice based on checkIn, checkOut, and Listing price
bookingSchema.pre('save', async function (next) {
    try {
        if (this.isModified('checkIn') || this.isModified('checkOut') || this.isModified('listing')) {
            // Populate the listing field if not already populated
            if (!this.populated('listing')) {
                await this.populate('listing');
            }

            if (this.listing && this.checkIn && this.checkOut) {
                const checkInDate = new Date(this.checkIn);
                const checkOutDate = new Date(this.checkOut);
                
                // Calculate difference in days (nights of stay)
                const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
                const nights = Math.round(timeDiff / (1000 * 3600 * 24));
                
                const nightlyPrice = this.listing.price || 0;
                
                if (nights > 0) {
                    this.totalPrice = nights * nightlyPrice;
                } else {
                    this.totalPrice = 0;
                }
            } else {
                this.totalPrice = 0;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
