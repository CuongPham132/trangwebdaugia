const { getAllCategories, getCategoryById, createCategory } = require('../models/categoryModel');

// Lấy tất cả danh mục
async function getAllCategory(req, res) {
  try {
    const categories = await getAllCategories();
    res.json({
      message: 'Lấy danh sách danh mục thành công',
      data: categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Lấy danh mục theo ID
async function getCategoryDetail(req, res) {
  try {
    const { category_id } = req.params;
    
    const category = await getCategoryById(category_id);
    if (!category) {
      return res.status(404).json({ message: 'Danh mục không tồn tại' });
    }
    
    res.json({
      message: 'Lấy chi tiết danh mục thành công',
      data: category,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Tạo danh mục mới
async function createNewCategory(req, res) {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }
    
    await createCategory({ name, description });
    
    res.status(201).json({ message: 'Tạo danh mục thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllCategory,
  getCategoryDetail,
  createNewCategory,
};
