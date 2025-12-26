import Role from "../models/roleModel.js";

// Create Role
export const createRole = async (req, res) => {
  try {
    const { name, active, show } = req.body;

    const exist = await Role.findOne({ name });
    if (exist) return res.status(400).json({ success: false, message: "Role already exists" });

    const role = await Role.create({ name, active, show });

    return res.json({ success: true, message: "Role created successfully", role });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get All Roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.json({ success: true, roles });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active, show } = req.body;

    const role = await Role.findByIdAndUpdate(
      id,
      { name, active, show },
      { new: true }
    );

    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, message: "Role updated", role });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete Role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByIdAndDelete(id);

    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    res.json({ success: true, message: "Role deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle Active
export const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ success: false, message: "Role not found" });

    role.active = !role.active;
    role.show = role.active;
    await role.save();

    res.json({ success: true, message: "Status updated", role });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
