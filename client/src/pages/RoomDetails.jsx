import React, { useEffect, useState } from 'react'
import { assets, roomCommonData } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import { useParams } from 'react-router-dom';
import StarRating from '../components/StarRating';
import toast from 'react-hot-toast';

const RoomDetails = () => {
    const { id } = useParams();
    const { facilityIcons, rooms, getToken, axios, navigate, currency } = useAppContext();

    const [room, setRoom] = useState(null);
    const [mainImage, setMainImage] = useState(null);

    // Booking mode toggle
    const [bookingType, setBookingType] = useState('nightly');

    // Nightly fields
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');

    // Hourly fields
    const [hourlyDate, setHourlyDate] = useState('');
    const [checkInTime, setCheckInTime] = useState('');
    const [checkOutTime, setCheckOutTime] = useState('');

    const [guests, setGuests] = useState(1);
    const [isAvailable, setIsAvailable] = useState(false);

    const checkAvailability = async () => {
        try {
            const dateIn = bookingType === 'hourly' ? hourlyDate : checkInDate;
            const dateOut = bookingType === 'hourly' ? hourlyDate : checkOutDate;

            if (bookingType === 'nightly' && checkInDate >= checkOutDate) {
                toast.error('Check-out date must be after check-in date');
                return;
            }
            if (bookingType === 'hourly' && checkInTime >= checkOutTime) {
                toast.error('Check-out time must be after check-in time');
                return;
            }

            const { data } = await axios.post('/api/bookings/check-availability', {
                room: id,
                checkInDate: dateIn,
                checkOutDate: dateOut,
            });

            if (data.success) {
                setIsAvailable(data.isAvailable);
                data.isAvailable ? toast.success('Room is available') : toast.error('Room is not available');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (!isAvailable) return checkAvailability();

        try {
            const dateIn = bookingType === 'hourly' ? hourlyDate : checkInDate;
            const dateOut = bookingType === 'hourly' ? hourlyDate : checkOutDate;

            const payload = {
                room: id,
                checkInDate: dateIn,
                checkOutDate: dateOut,
                guests,
                bookingType,
                ...(bookingType === 'hourly' && { checkInTime, checkOutTime }),
            };

            const { data } = await axios.post('/api/bookings/book', payload, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            });

            if (data.success) {
                toast.success(data.message);
                navigate('/my-bookings');
                scrollTo(0, 0);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Compute estimated price
    const estimatedPrice = () => {
        if (!room) return null;
        if (bookingType === 'nightly' && checkInDate && checkOutDate && checkOutDate > checkInDate) {
            const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 3600 * 24));
            return { amount: room.pricePerNight * nights, label: `${nights} night${nights > 1 ? 's' : ''}` };
        }
        if (bookingType === 'hourly' && checkInTime && checkOutTime && checkOutTime > checkInTime) {
            const [inH, inM] = checkInTime.split(':').map(Number);
            const [outH, outM] = checkOutTime.split(':').map(Number);
            const hours = Math.ceil(((outH * 60 + outM) - (inH * 60 + inM)) / 60);
            return { amount: (room.pricePerHour || 0) * hours, label: `${hours} hour${hours > 1 ? 's' : ''}` };
        }
        return null;
    };

    const price = estimatedPrice();

    useEffect(() => {
        const found = rooms.find(r => r._id === id);
        if (found) { setRoom(found); setMainImage(found.images[0]); }
    }, [rooms]);

    // Reset availability when inputs change
    useEffect(() => { setIsAvailable(false); }, [checkInDate, checkOutDate, hourlyDate, checkInTime, checkOutTime, bookingType]);

    return room && (
        <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

            <div className='flex flex-col md:flex-row items-start md:items-center gap-2'>
                <h1 className='text-3xl md:text-4xl font-playfair'>
                    {room.hotel.name} <span className='font-inter text-sm'>({room.roomType})</span>
                </h1>
                <p className='text-xs font-inter py-1.5 px-3 text-white bg-orange-500 rounded-full'>20% OFF</p>
            </div>
            <div className='flex items-center gap-1 mt-2'>
                <StarRating />
                <p className='ml-2'>200+ reviews</p>
            </div>
            <div className='flex items-center gap-1 text-gray-500 mt-2'>
                <img src={assets.locationIcon} alt='location-icon' />
                <span>{room.hotel.address}</span>
            </div>

            {/* Images */}
            <div className='flex flex-col lg:flex-row mt-6 gap-6'>
                <div className='lg:w-1/2 w-full'>
                    <img className='w-full rounded-xl shadow-lg object-cover' src={mainImage} alt='Room' />
                </div>
                <div className='grid grid-cols-2 gap-4 lg:w-1/2 w-full'>
                    {room.images.length > 1 && room.images.map((image, index) => (
                        <img key={index} onClick={() => setMainImage(image)}
                            className={`w-full rounded-xl shadow-md object-cover cursor-pointer ${mainImage === image ? 'outline outline-2 outline-orange-500' : ''}`}
                            src={image} alt='Room' />
                    ))}
                </div>
            </div>

            {/* Highlights */}
            <div className='flex flex-col md:flex-row md:justify-between mt-10'>
                <div className='flex flex-col'>
                    <h1 className='text-3xl md:text-4xl font-playfair'>Experience Luxury Like Never Before</h1>
                    <div className='flex flex-wrap items-center mt-3 mb-6 gap-4'>
                        {room.amenities.map((item, index) => (
                            <div key={index} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100'>
                                <img src={facilityIcons[item]} alt={item} className='w-5 h-5' />
                                <p className='text-xs'>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className='text-right'>
                    <p className='text-2xl font-medium'>{currency}{room.pricePerNight}<span className='text-sm font-normal'>/night</span></p>
                    {room.pricePerHour && (
                        <p className='text-lg font-medium text-orange-500 mt-1'>
                            {currency}{room.pricePerHour}<span className='text-sm font-normal'>/hour</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={onSubmitHandler} className='bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.15)] p-6 rounded-xl mx-auto mt-16 max-w-6xl'>

                {/* Booking type toggle */}
                <div className='flex gap-2 mb-6'>
                    <button type='button'
                        onClick={() => setBookingType('nightly')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${bookingType === 'nightly' ? 'bg-black text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                        🌙 Nightly
                    </button>
                    {room.pricePerHour && (
                        <button type='button'
                            onClick={() => setBookingType('hourly')}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${bookingType === 'hourly' ? 'bg-orange-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                            ⏰ Hourly
                        </button>
                    )}
                </div>

                <div className='flex flex-col md:flex-row items-start md:items-end justify-between gap-6'>
                    <div className='flex flex-col flex-wrap md:flex-row items-start md:items-center gap-4 md:gap-8 text-gray-500'>

                        {bookingType === 'nightly' ? (
                            <>
                                <div className='flex flex-col'>
                                    <label className='font-medium text-gray-700 mb-1'>Check-In</label>
                                    <input onChange={e => setCheckInDate(e.target.value)} type='date'
                                        min={new Date().toISOString().split('T')[0]}
                                        className='rounded border border-gray-300 px-3 py-2 outline-none' required />
                                </div>
                                <div className='w-px h-12 bg-gray-300/70 max-md:hidden' />
                                <div className='flex flex-col'>
                                    <label className='font-medium text-gray-700 mb-1'>Check-Out</label>
                                    <input onChange={e => setCheckOutDate(e.target.value)} type='date'
                                        min={checkInDate || new Date().toISOString().split('T')[0]}
                                        disabled={!checkInDate}
                                        className='rounded border border-gray-300 px-3 py-2 outline-none disabled:opacity-50' required />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='flex flex-col'>
                                    <label className='font-medium text-gray-700 mb-1'>Date</label>
                                    <input onChange={e => setHourlyDate(e.target.value)} type='date'
                                        min={new Date().toISOString().split('T')[0]}
                                        className='rounded border border-gray-300 px-3 py-2 outline-none' required />
                                </div>
                                <div className='w-px h-12 bg-gray-300/70 max-md:hidden' />
                                <div className='flex flex-col'>
                                    <label className='font-medium text-gray-700 mb-1'>From</label>
                                    <input onChange={e => setCheckInTime(e.target.value)} type='time'
                                        className='rounded border border-gray-300 px-3 py-2 outline-none' required />
                                </div>
                                <div className='w-px h-12 bg-gray-300/70 max-md:hidden' />
                                <div className='flex flex-col'>
                                    <label className='font-medium text-gray-700 mb-1'>Until</label>
                                    <input onChange={e => setCheckOutTime(e.target.value)} type='time'
                                        className='rounded border border-gray-300 px-3 py-2 outline-none' required />
                                </div>
                            </>
                        )}

                        <div className='w-px h-12 bg-gray-300/70 max-md:hidden' />
                        <div className='flex flex-col'>
                            <label className='font-medium text-gray-700 mb-1'>Guests</label>
                            <input onChange={e => setGuests(e.target.value)} value={guests} type='number' min={1}
                                className='max-w-20 rounded border border-gray-300 px-3 py-2 outline-none' required />
                        </div>
                    </div>

                    <div className='flex flex-col items-end gap-2 max-md:w-full'>
                        {price && (
                            <p className='text-sm text-gray-500'>
                                Est. total: <span className='font-medium text-gray-800'>{currency}{price.amount}</span>
                                <span className='text-xs ml-1'>({price.label})</span>
                            </p>
                        )}
                        <button type='submit'
                            className={`${bookingType === 'hourly' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary-dull'} active:scale-95 transition-all text-white rounded-md max-md:w-full px-10 py-3 text-base cursor-pointer`}>
                            {isAvailable ? 'Book Now' : 'Check Availability'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Common specs */}
            <div className='mt-25 space-y-4'>
                {roomCommonData.map((spec, index) => (
                    <div key={index} className='flex items-start gap-2'>
                        <img className='w-6.5' src={spec.icon} alt={`${spec.title}-icon`} />
                        <div>
                            <p className='text-base'>{spec.title}</p>
                            <p className='text-gray-500'>{spec.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className='max-w-3xl border-y border-gray-300 my-15 py-10 text-gray-500'>
                <p>Guests will be allocated on the ground floor according to availability. You get a comfortable two bedroom apartment with a true city feeling. The price quoted is for two guests — mark the number of guests to get the exact price for groups.</p>
            </div>

            <div className='flex flex-col items-start gap-4'>
                <div className='flex gap-4'>
                    <img className='h-14 w-14 md:h-18 md:w-18 rounded-full' src={room.hotel.owner.image} alt='Host' />
                    <div>
                        <p className='text-lg md:text-xl'>Hosted by {room.hotel.name}</p>
                        <div className='flex items-center mt-1'>
                            <StarRating />
                            <p className='ml-2'>200+ reviews</p>
                        </div>
                    </div>
                </div>
                <button className='px-6 py-2.5 mt-4 rounded text-white bg-primary hover:bg-primary-dull transition-all cursor-pointer'>
                    Contact Now
                </button>
            </div>
        </div>
    );
};

export default RoomDetails;
