import mongoose from 'mongoose';
const { Schema } = mongoose;

const tokenSchema = new Schema(
    {
        token: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
        }
    },
    { timestamps: true },
);

tokenSchema.methods.toJSON = function () {
    return {
        id: this._id,
        token: this.token,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

const MalToken = mongoose.model('MalToken', tokenSchema);

export default MalToken;
