import mongoose from 'mongoose';
const { Schema } = mongoose;

const animeListSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
        },
        animeList: [
            {
                title: {
                    type: String,
                    required: true,
                },
            }
        ],
    },
    { timestamps: true },
);

animeListSchema.methods.toJSON = function () {
    return {
        id: this._id,
        username: this.username,
        animeList: this.animeList,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

const AnimeList = mongoose.model('AnimeList', animeListSchema);

export default AnimeList;
