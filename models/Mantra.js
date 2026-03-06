import mongoose from 'mongoose';

const mantraSchema = new mongoose.Schema({
  title: { type: String },
  content: {
    sanskrit: { type: String },
    hindi: { type: String },
    english: { type: String }
  },
  astroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Astrologer' },
  astroName: { type: String },
  category: { type: String }
}, { 
  timestamps: true 
});

const Mantra = mongoose.model('Mantra', mantraSchema);
export default Mantra;