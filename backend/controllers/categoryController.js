const { getAllCategories, getCategoryById, createCategory } = require('../models/categoryModel');
const logger = require('../services/logger');
const { ERROR_CODES, createSuccessResponse, createErrorResponse } = require('../utils/errorHandler');

// Lấy tất cả danh mục
async function getAllCategory(req, res) {
  try {
    const categories = await getAllCategories();
    res.json(
      createSuccessResponse(categories, 'Lấy danh sách danh mục thành công')
    );
  } catch (err) {
    logger.error('Get all categories failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy danh sách danh mục', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Lấy danh mục theo ID
async function getCategoryDetail(req, res) {
  try {
    const { category_id } = req.params;
    
    const category = await getCategoryById(category_id);
    if (!category) {
      return res.status(404).json(
        createErrorResponse('Danh mục không tồn tại', ERROR_CODES.CATEGORY_NOT_FOUND, 404)
      );
    }
    
    res.json(
      createSuccessResponse(category, 'Lấy chi tiết danh mục thành công')
    );
  } catch (err) {
    logger.error('Get category detail failed', { error: err.message });
    res.status(500).json(
      createErrorResponse('Lỗi lấy chi tiết danh mục', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

// Tạo danh mục mới (admin only)
async function createNewCategory(req, res) {
  try {
    const { name, description } = req.body;
    const admin_id = req.user.user_id;

    // Validate
    if (!name) {
      return res.status(400).json(
        createErrorResponse('Vui lòng nhập tên danh mục', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    if (name.length > 100) {
      return res.status(400).json(
        createErrorResponse('Tên danh mục tối đa 100 ký tự', ERROR_CODES.INVALID_INPUT, 400)
      );
    }

    // Tạo danh mục
    const result = await createCategory({ name, description });
    
    logger.success('Category created by admin', { 
      category_name: name, 
      created_by: admin_id 
    });

    res.status(201).json(
      createSuccessResponse({
        category_id: result,
        name,
        description,
      }, 'Tạo danh mục thành công')
    );
  } catch (err) {
    logger.error('Create category failed', { error: err.message });
    
    // Handle duplicate name error
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json(
        createErrorResponse('Tên danh mục đã tồn tại', ERROR_CODES.DUPLICATE_ENTRY, 400)
      );
    }
    
    res.status(500).json(
      createErrorResponse('Lỗi tạo danh mục', ERROR_CODES.INTERNAL_ERROR, 500)
    );
  }
}

module.exports = {
  getAllCategory,
  getCategoryDetail,
  createNewCategory,
};
