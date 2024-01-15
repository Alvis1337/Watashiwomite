import mongoose from 'mongoose';
import Joi from 'joi';
const { Schema } = mongoose;

const messageSchema = new Schema(
    {
        text: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

messageSchema.methods.toJSON = function () {
    return {
        id: this._id,
        text: this.text,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

const MalToken = mongoose.model('MalToken', messageSchema);

export default MalToken;
