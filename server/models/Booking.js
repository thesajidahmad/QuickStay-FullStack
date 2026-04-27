import mongoose from "mongoose";
const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    user: { type: String, ref: "User", required: true },
    room: { type: String, ref: "Room", required: true },
    hotel: { type: String, ref: "Hotel", required: true },
    bookingType: {
      type: String,
      enum: ["nightly", "hourly"],
      default: "nightly",
    },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    // For hourly bookings: checkInTime / checkOutTime as HH:MM strings
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    totalPrice: { type: Number, required: true },
    guests: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      default: "Pay At Hotel",
    },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
