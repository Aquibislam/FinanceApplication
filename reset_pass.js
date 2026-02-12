const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

require('dotenv').config();

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findOne();
        if (user) {
            console.log('Found user:', user.email);
            user.password = 'password123'; // The model pre-save hook will hash this
            await user.save();
            console.log('Password reset to: password123');
        } else {
            console.log('No user found');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword();
