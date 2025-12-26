import City from "../models/cityModel.js";

// GET all cities
export const getCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ createdAt: -1 });
    res.json({ success: true, cities });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching cities" });
  }
};

// ADD new City
export const addCity = async (req, res) => {
  try {
    const { name, state, country, show } = req.body;

    const city = await City.create({ name, state, country, show ,active :show || false  });

    res.json({ success: true, message: "City added successfully", city });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error adding city" });
  }
};

// UPDATE City
export const updateCity = async (req, res) => {
  try {
    const updatedCity = await City.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({ success: true, message: "City updated successfully", updatedCity });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating city" });
  }
};

// DELETE City
export const deleteCity = async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "City deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting city" });
  }
};

// TOGGLE Active Status
export const toggleCityStatus = async (req, res) => {
  try {
    const { active } = req.body;

    const updatedCity = await City.findByIdAndUpdate(
      req.params.id,
      { active,show :active || false },
      { new: true }
    );

    res.json({ success: true, message: "City status updated", updatedCity });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error toggling status" });
  }
};
