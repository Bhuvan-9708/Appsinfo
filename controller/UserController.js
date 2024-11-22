const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../model/User');
const Joi = require('joi');

const userSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    address: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => degree * (Math.PI / 180);
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

exports.createUser = async (req, res) => {
    try {
        const { error } = userSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ status_code: 400, message: error.details[0].message });
        }
        const { name, email, password, address, latitude, longitude } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ status_code: 400, message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            address,
            latitude,
            longitude,
            status: 'active',
        });
        await newUser.save();
        const token = jwt.sign({ id: newUser._id, latitude: newUser.latitude, longitude: newUser.longitude }, process.env.JWT_SECRET, { expiresIn: '1h' });
        newUser.token = token;
        await newUser.save();
        res.json({
            status_code: 200,
            message: 'User created successfully',
            data: {
                name: newUser.name,
                email: newUser.email,
                address: newUser.address,
                latitude: newUser.latitude,
                longitude: newUser.longitude,
                status: newUser.status,
                register_at: newUser.register_at,
                token,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status_code: 500, message: 'Internal server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        await User.updateMany(
            {},
            [{ $set: { status: { $cond: [{ $eq: ['$status', 'active'] }, 'inactive', 'active'] } } }]
        );
        res.json({
            status_code: 200,
            message: 'User status updated successfully',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status_code: 500, message: 'Internal server error' });
    }
};

exports.userDistance = (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { latitude: userLat, longitude: userLon } = decoded;
        console.log("User Latitude:", userLat, "User Longitude:", userLon);
        const destinationLat = parseFloat(req.query.destination_latitude);
        const destinationLon = parseFloat(req.query.destination_longitude);
        console.log("Destination Latitude:", destinationLat, "Destination Longitude:", destinationLon);

        if (isNaN(destinationLat) || isNaN(destinationLon)) {
            return res.status(400).json({
                status_code: "400",
                message: "Valid destination latitude and longitude are required.",
            });
        }
        const distance = haversineDistance(userLat, userLon, destinationLat, destinationLon);
        console.log("Calculated Distance:", distance);

        res.json({
            status_code: "200",
            message: "Distance calculated successfully",
            distance: `${distance.toFixed(2)} km`,
        });
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(500).json({ status_code: "500", message: error.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const { week_numbers } = req.query;
        if (!week_numbers) {
            return res.status(400).json({ status_code: "400", message: "week numbers query parameter is required." });
        }
        const days = week_numbers.split(',').map(Number);
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const results = {};
        for (const day of days) {
            const startDate = new Date(startOfWeek);
            startDate.setDate(startDate.getDate() + day);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            const dayName = new Date(startDate).toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
            results[dayName] = await User.find({
                register_at: { $gte: startDate, $lt: endDate }
            }).select('name email -_id');
        }
        res.json({
            status_code: "200",
            message: "User listing retrieved successfully",
            data: results,
        });
    } catch (error) {
        res.status(500).json({ status_code: "500", message: error.message });
    }
};