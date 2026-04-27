import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";

// ── helpers ──────────────────────────────────────────────────────────────────

const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
  try {
    const bookings = await Booking.find({
      room,
      checkInDate: { $lte: checkOutDate },
      checkOutDate: { $gte: checkInDate },
    });
    return bookings.length === 0;
  } catch (error) {
    console.error(error.message);
  }
};

// ── API: check availability ──────────────────────────────────────────────────
// POST /api/bookings/check-availability
export const checkAvailabilityAPI = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate } = req.body;
    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    res.json({ success: true, isAvailable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── API: create booking (nightly or hourly) ──────────────────────────────────
// POST /api/bookings/book
export const createBooking = async (req, res) => {
  try {
    const { room, checkInDate, checkOutDate, guests, bookingType, checkInTime, checkOutTime } = req.body;
    const user = req.user._id;

    const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: "Room is not available" });
    }

    const roomData = await Room.findById(room).populate("hotel");

    let totalPrice;

    if (bookingType === "hourly") {
      // Parse HH:MM times, calculate hours
      const [inH, inM] = checkInTime.split(":").map(Number);
      const [outH, outM] = checkOutTime.split(":").map(Number);
      const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (totalMinutes <= 0) {
        return res.status(400).json({ success: false, message: "Check-out time must be after check-in time" });
      }
      const hours = Math.ceil(totalMinutes / 60);
      if (!roomData.pricePerHour) {
        return res.status(400).json({ success: false, message: "This room does not support hourly booking" });
      }
      totalPrice = roomData.pricePerHour * hours;
    } else {
      // Nightly calculation
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));
      totalPrice = roomData.pricePerNight * nights;
    }

    const booking = await Booking.create({
      user,
      room,
      hotel: roomData.hotel._id,
      guests: +guests,
      bookingType: bookingType || "nightly",
      checkInDate,
      checkOutDate,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      totalPrice,
    });

    const durationLabel = bookingType === "hourly"
      ? `${checkInTime} – ${checkOutTime}`
      : `${new Date(checkInDate).toDateString()}`;

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: req.user.email,
      subject: "SmartStay – Booking Confirmation",
      html: `
        <h2>Your Booking Details</h2>
        <p>Dear ${req.user.username},</p>
        <p>Thank you for booking with SmartStay! Here are your details:</p>
        <ul>
          <li><strong>Booking ID:</strong> ${booking.id}</li>
          <li><strong>Hotel:</strong> ${roomData.hotel.name}</li>
          <li><strong>Location:</strong> ${roomData.hotel.address}</li>
          <li><strong>Type:</strong> ${bookingType === "hourly" ? "Hourly" : "Nightly"}</li>
          <li><strong>Date / Time:</strong> ${durationLabel}</li>
          <li><strong>Total Amount:</strong> ${process.env.CURRENCY || "$"}${booking.totalPrice}</li>
        </ul>
        <p>We look forward to welcoming you!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Booking created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
};

// ── API: get user bookings ───────────────────────────────────────────────────
// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const user = req.user._id;
    const bookings = await Booking.find({ user })
      .populate("room hotel")
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

// ── API: get hotel owner bookings / dashboard ────────────────────────────────
// GET /api/bookings/hotel
export const getHotelBookings = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotel) {
      return res.status(404).json({ success: false, message: "No hotel found" });
    }
    const bookings = await Booking.find({ hotel: hotel._id })
      .populate("room hotel user")
      .sort({ createdAt: -1 });
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, b) => acc + b.totalPrice, 0);
    res.json({ success: true, dashboardData: { totalBookings, totalRevenue, bookings } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
};

// ── API: initiate Stripe payment ─────────────────────────────────────────────
// POST /api/bookings/stripe-payment
export const stripePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const roomData = await Room.findById(booking.room).populate("hotel");
    const { origin } = req.headers;

    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: roomData.hotel.name },
          unit_amount: booking.totalPrice * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      metadata: { bookingId },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};
