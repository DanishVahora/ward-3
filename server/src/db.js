import mongoose from 'mongoose'

let connectionPromise

export async function connectDb() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection
    }

    if (!connectionPromise) {
        const uri = process.env.MONGODB_URI
        if (!uri) {
            throw new Error('MONGODB_URI is missing. Add it to your environment variables.')
        }

        connectionPromise = mongoose.connect(uri, {
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
        })
    }

    await connectionPromise
    return mongoose.connection
}

export async function disconnectDb() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect()
    }
    connectionPromise = undefined
}
