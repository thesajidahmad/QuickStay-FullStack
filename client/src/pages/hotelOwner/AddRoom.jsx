import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/Title'
import toast from 'react-hot-toast'
import { useAppContext } from '../../context/AppContext'

const AddRoom = () => {
    const { axios, getToken } = useAppContext()
    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [loading, setLoading] = useState(false)

    const [inputs, setInputs] = useState({
        roomType: '',
        pricePerNight: 0,
        pricePerHour: '',
        enableHourly: false,
        amenities: {
            'Free WiFi': false,
            'Free Breakfast': false,
            'Room Service': false,
            'Mountain View': false,
            'Pool Access': false,
        },
    })

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!inputs.roomType || !inputs.pricePerNight || !Object.values(images).some(i => i)) {
            toast.error('Please fill in all required details and upload at least one image')
            return
        }
        if (inputs.enableHourly && !inputs.pricePerHour) {
            toast.error('Please enter a price per hour or disable hourly booking')
            return
        }
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('roomType', inputs.roomType)
            formData.append('pricePerNight', inputs.pricePerNight)
            if (inputs.enableHourly && inputs.pricePerHour) {
                formData.append('pricePerHour', inputs.pricePerHour)
            }
            const amenities = Object.keys(inputs.amenities).filter(k => inputs.amenities[k])
            formData.append('amenities', JSON.stringify(amenities))
            Object.keys(images).forEach(key => {
                if (images[key]) formData.append('images', images[key])
            })

            const { data } = await axios.post('/api/rooms/', formData, {
                headers: { Authorization: `Bearer ${await getToken()}` },
            })

            if (data.success) {
                toast.success(data.message)
                setInputs({
                    roomType: '',
                    pricePerNight: 0,
                    pricePerHour: '',
                    enableHourly: false,
                    amenities: {
                        'Free WiFi': false,
                        'Free Breakfast': false,
                        'Room Service': false,
                        'Mountain View': false,
                        'Pool Access': false,
                    },
                })
                setImages({ 1: null, 2: null, 3: null, 4: null })
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmitHandler}>
            <Title align='left' font='outfit' title='Add Room'
                subTitle='Fill in the details carefully — accurate room details, pricing, and amenities enhance the booking experience.' />

            <p className='text-gray-800 mt-10'>Images</p>
            <div className='grid grid-cols-2 sm:flex gap-4 my-2 flex-wrap'>
                {Object.keys(images).map(key => (
                    <label key={key} htmlFor={`roomImage${key}`}>
                        <img className='max-h-13 cursor-pointer opacity-80'
                            src={images[key] ? URL.createObjectURL(images[key]) : assets.uploadArea} alt='' />
                        <input type='file' accept='image/*' id={`roomImage${key}`} hidden
                            onChange={e => setImages({ ...images, [key]: e.target.files[0] })} />
                    </label>
                ))}
            </div>

            <div className='w-full flex max-sm:flex-col sm:gap-4 mt-4'>
                <div className='flex-1 max-w-48'>
                    <p className='text-gray-800 mt-4'>Room Type</p>
                    <select className='border opacity-70 border-gray-300 mt-1 rounded p-2 w-full'
                        value={inputs.roomType}
                        onChange={e => setInputs({ ...inputs, roomType: e.target.value })}>
                        <option value=''>Select Room Type</option>
                        <option value='Single Bed'>Single Bed</option>
                        <option value='Double Bed'>Double Bed</option>
                        <option value='Luxury Room'>Luxury Room</option>
                        <option value='Family Suite'>Family Suite</option>
                    </select>
                </div>

                <div>
                    <p className='mt-4 text-gray-800'>Price <span className='text-xs'>/night</span></p>
                    <input type='number' placeholder='0' min='0'
                        className='border border-gray-300 mt-1 rounded p-2 w-24'
                        value={inputs.pricePerNight}
                        onChange={e => setInputs({ ...inputs, pricePerNight: e.target.value })} />
                </div>
            </div>

            {/* Hourly pricing section */}
            <div className='mt-6 p-4 border border-dashed border-orange-300 rounded-lg max-w-sm bg-orange-50/40'>
                <label className='flex items-center gap-3 cursor-pointer'>
                    <input type='checkbox' checked={inputs.enableHourly}
                        onChange={e => setInputs({ ...inputs, enableHourly: e.target.checked })} />
                    <span className='font-medium text-gray-800'>Enable hourly booking</span>
                    <span className='text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full'>New</span>
                </label>
                <p className='text-xs text-gray-500 mt-1 ml-6'>Allow guests to book this room by the hour.</p>

                {inputs.enableHourly && (
                    <div className='mt-3 ml-6'>
                        <p className='text-gray-700 text-sm'>Price <span className='text-xs'>/hour</span></p>
                        <input type='number' placeholder='0' min='0'
                            className='border border-gray-300 mt-1 rounded p-2 w-24 text-sm'
                            value={inputs.pricePerHour}
                            onChange={e => setInputs({ ...inputs, pricePerHour: e.target.value })} />
                    </div>
                )}
            </div>

            <p className='text-gray-800 mt-6'>Amenities</p>
            <div className='flex flex-col flex-wrap mt-1 text-gray-400 max-w-sm'>
                {Object.keys(inputs.amenities).map((amenity, index) => (
                    <div key={index}>
                        <input type='checkbox' id={`amenity${index}`} checked={inputs.amenities[amenity]}
                            onChange={() => setInputs({
                                ...inputs,
                                amenities: { ...inputs.amenities, [amenity]: !inputs.amenities[amenity] },
                            })} />
                        <label htmlFor={`amenity${index}`}> {amenity}</label>
                    </div>
                ))}
            </div>

            <button className='bg-primary text-white px-8 py-2 rounded mt-8 cursor-pointer disabled:opacity-60'
                disabled={loading}>
                {loading ? 'Adding...' : 'Add Room'}
            </button>
        </form>
    )
}

export default AddRoom
