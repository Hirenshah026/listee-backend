import Mantra from '../models/Mantra.js';

// Naya Mantra Post karna
export const createMantra = async (req, res) => {
  try {
    const { title, content, category, astroId, astroName } = req.body;

    const newMantra = new Mantra({
      title,
      content,
      category,
      astroId: astroId || req.user._id, // Frontend ya Token dono se check kar lega
      astroName: astroName || req.user.name
    });

    await newMantra.save();
    res.status(201).json({ success: true, message: "Mantra saved!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 3. Mantra Edit (Update) karna
export const updateMantra = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const updatedMantra = await Mantra.findByIdAndUpdate(
      id,
      { title, content },
      { new: true } // Updated data return karega
    );

    res.status(200).json({ success: true, data: updatedMantra });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update fail ho gaya" });
  }
};

// 4. Mantra Delete karna
export const deleteMantra = async (req, res) => {
  try {
    const { id } = req.params;
    await Mantra.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Mantra deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete fail ho gaya" });
  }
};
// Kisi Astro ke Mantras get karna
export const getMantrasByAstro = async (req, res) => {
  try {
    const { astroId } = req.params;
    const mantras = await Mantra.find({ astroId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: mantras });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};
// Get Single Mantra by its Unique ID
export const getMantraById = async (req, res) => {
  try {
    const { id } = req.params;
    const mantra = await Mantra.findById(id);

    if (!mantra) {
      return res.status(404).json({ success: false, message: "Mantra nahi mila" });
    }

    res.status(200).json({ success: true, data: mantra });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Saare mantras fetch karna
export const getAllMantras = async (req, res) => {
  try {
    const mantras = await Mantra.find().sort({ createdAt: -1 }); // Naye mantras upar
    res.status(200).json({ success: true, data: mantras });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};