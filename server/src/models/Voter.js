import mongoose from 'mongoose'

const voterSchema = new mongoose.Schema(
    {
        v: { type: Number, required: true, index: true },
        i: { type: Number, required: true, index: true },
        e: { type: String, required: true, index: true },
        p: { type: String, required: true, index: true },
    },
    {
        versionKey: false,
    },
)

voterSchema.index({ v: 1, i: 1 })

export const Voter = mongoose.models.Voter ?? mongoose.model('Voter', voterSchema)
