import Area from "../models/Area.js";
import City from "../models/cityModel.js";

/* ======================
   CREATE AREA
====================== */
export const createArea = async (req, res) => {
  try {
    const { name, cityId, active } = req.body;

    if (!name || !cityId) {
      return res.status(400).json({
        success: false,
        message: "Name & City required",
      });
    }

    // only active city allowed
    const city = await City.findOne({ _id: cityId, active: true });
    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City not found or inactive",
      });
    }

    const area = await Area.create({
      name,
      city: cityId,
      active,
    });

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      area,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================
   GET ALL AREAS
====================== */
export const getAreas = async (req, res) => {
  try {
    const areas = await Area.find()
      .populate("city", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      areas,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================
   UPDATE AREA
====================== */
export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, cityId, active } = req.body;

    const area = await Area.findById(id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    if (cityId) {
      const city = await City.findOne({ _id: cityId, active: true });
      if (!city) {
        return res.status(400).json({
          success: false,
          message: "City not found or inactive",
        });
      }
      area.city = cityId;
    }

    if (name !== undefined) area.name = name;
    if (active !== undefined) area.active = active;

    await area.save();

    res.json({
      success: true,
      message: "Area updated",
      area,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================
   DELETE AREA
====================== */
export const deleteArea = async (req, res) => {
  try {
    const area = await Area.findByIdAndDelete(req.params.id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      message: "Area deleted",
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ======================
   TOGGLE ACTIVE
====================== */
export const toggleAreaStatus = async (req, res) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    area.active = !area.active;
    await area.save();

    res.json({
      success: true,
      message: "Status updated",
      active: area.active,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};
