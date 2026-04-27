import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import { v2 as cloudinary } from "cloudinary";

// POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const { roomType, pricePerNight, pricePerHour, amenities } = req.body;
    const hotel = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotel) return res.status(404).json({ success: false, message: "No hotel found" });

    const uploadImages = req.files.map(async (file) => {
      const response = await cloudinary.uploader.upload(file.path);
      return response.secure_url;
    });
    const images = await Promise.all(uploadImages);

    await Room.create({
      hotel: hotel._id,
      roomType,
      pricePerNight: +pricePerNight,
      pricePerHour: pricePerHour ? +pricePerHour : null,
      amenities: JSON.parse(amenities),
      images,
    });

    res.json({ success: true, message: "Room created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rooms
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isAvailable: true })
      .populate({ path: "hotel", populate: { path: "owner", select: "image" } })
      .sort({ createdAt: -1 });
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/rooms/owner
export const getOwnerRooms = async (req, res) => {
  try {
    const hotelData = await Hotel.findOne({ owner: req.auth.userId });
    if (!hotelData) return res.status(404).json({ success: false, message: "No hotel found" });
    const rooms = await Room.find({ hotel: hotelData._id }).populate("hotel");
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/rooms/toggle-availability
export const toggleRoomAvailability = async (req, res) => {
  try {
    const { roomId } = req.body;
    const roomData = await Room.findById(roomId).populate("hotel");
    if (!roomData) return res.status(404).json({ success: false, message: "Room not found" });

    // Security: only the owning hotel's owner may toggle
    if (roomData.hotel.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    roomData.isAvailable = !roomData.isAvailable;
    await roomData.save();
    res.json({ success: true, message: "Room availability updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
