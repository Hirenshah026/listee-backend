import MarketingPerson from "../models/MarketingPerson.js";
import City from "../models/cityModel.js";
import Area from "../models/Area.js";

/* ================= CREATE ================= */
export const createMarketingPerson = async (req, res) => {
  try {
    const { name, phone, email, cityId, areaId, active } = req.body;

    if (!name || !phone || !cityId || !areaId) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, city and area are required",
      });
    }

    // only ACTIVE city
    const city = await City.findOne({ _id: cityId, active: true });
    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City not found or inactive",
      });
    }

    // only ACTIVE area of same city
    const area = await Area.findOne({
      _id: areaId,
      city: cityId,
      active: true,
    });

    if (!area) {
      return res.status(400).json({
        success: false,
        message: "Area not found or inactive for selected city",
      });
    }

    const person = await MarketingPerson.create({
      name,
      phone,
      email,
      city: cityId,
      area: areaId,
      active,
    });

    res.status(201).json({
      success: true,
      message: "Marketing person created successfully",
      person,
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ================= GET ALL ================= */
export const getMarketingPersons = async (req, res) => {
  try {
    const persons = await MarketingPerson.find()
      .populate("city", "name")
      .populate("area", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, persons });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ================= UPDATE ================= */
export const updateMarketingPerson = async (req, res) => {
  try {
    const { name, phone, email, cityId, areaId, active } = req.body;

    const person = await MarketingPerson.findById(req.params.id);
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Marketing person not found",
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
      person.city = cityId;
    }

    if (areaId) {
      const area = await Area.findOne({
        _id: areaId,
        city: person.city,
        active: true,
      });
      if (!area) {
        return res.status(400).json({
          success: false,
          message: "Area not found or inactive",
        });
      }
      person.area = areaId;
    }

    if (name !== undefined) person.name = name;
    if (phone !== undefined) person.phone = phone;
    if (email !== undefined) person.email = email;
    if (active !== undefined) person.active = active;

    await person.save();

    res.json({
      success: true,
      message: "Marketing person updated",
      person,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ================= DELETE ================= */
export const deleteMarketingPerson = async (req, res) => {
  try {
    const person = await MarketingPerson.findByIdAndDelete(req.params.id);

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Marketing person not found",
      });
    }

    res.json({ success: true, message: "Marketing person deleted" });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* ================= TOGGLE ================= */
export const toggleMarketingPerson = async (req, res) => {
  try {
    const person = await MarketingPerson.findById(req.params.id);
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Marketing person not found",
      });
    }

    person.active = !person.active;
    await person.save();

    res.json({
      success: true,
      message: "Status updated",
      active: person.active,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};
